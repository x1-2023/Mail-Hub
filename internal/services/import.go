package services

import (
	"database/sql"
	"fmt"
	"mailhub/internal/models"
	"mailhub/pkg/database"
	"time"

	"github.com/google/uuid"
	_ "modernc.org/sqlite"
)

type ImportStats struct {
	Total    int
	Imported int
	Skipped  int
	Errors   []string
}

func ImportUsersFromSqlite(dbPath string) (*ImportStats, error) {
	stats := &ImportStats{}

	// Open SQLite DB
	sqldb, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite db: %w", err)
	}
	defer sqldb.Close()

	// Query Users
	rows, err := sqldb.Query("SELECT id, username, password, email, role, created_at FROM users")
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		stats.Total++

		var id, username, password string
		var email, role sql.NullString // Handle NULL values
		var createdAtStr string        // SQLite datetime string
		if err := rows.Scan(&id, &username, &password, &email, &role, &createdAtStr); err != nil {
			stats.Errors = append(stats.Errors, fmt.Sprintf("Scan error: %v", err))
			continue
		}

		// Check if user exists (by Username)
		var exists int64
		database.DB.Model(&models.User{}).Where("username = ?", username).Count(&exists)
		if exists > 0 {
			stats.Skipped++
			continue
		}

		// Prepare User Model
		// Handle ID: Try to use old ID if valid UUID, else generate new
		userID := id
		if _, err := uuid.Parse(id); err != nil {
			userID = uuid.NewString() // Generate new if old is not UUID
		}

		// Handle Email: If NULL or empty, generate placeholder
		emailStr := ""
		if email.Valid && email.String != "" {
			emailStr = email.String
			// Check if email conflict
			var emailExists int64
			database.DB.Model(&models.User{}).Where("email = ?", emailStr).Count(&emailExists)
			if emailExists > 0 {
				// Conflict! Use placeholder
				emailStr = fmt.Sprintf("%s+%s@imported.user", username, userID[:4])
			}
		} else {
			emailStr = fmt.Sprintf("%s@imported.user", username)
		}

		// Handle Role
		roleStr := "USER"
		if role.Valid && role.String != "" {
			roleStr = role.String
		}

		newUser := models.User{
			Base: models.Base{
				ID:        userID,
				CreatedAt: parseSqliteTime(createdAtStr),
				UpdatedAt: time.Now(),
			},
			Username:     &username,
			Email:        emailStr,
			PasswordHash: password,
			Role:         roleStr,
		}

		// Insert User
		if err := database.DB.Create(&newUser).Error; err != nil {
			stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to insert user %s: %v", username, err))
			continue
		}

		// Aliases skipped per user request
		stats.Imported++
	}

	return stats, nil
}

func parseSqliteTime(s string) time.Time {
	// SQLite default: YYYY-MM-DD HH:MM:SS
	// Sometimes has Timezone
	t, err := time.Parse("2006-01-02 15:04:05", s)
	if err == nil {
		return t
	}
	t, err = time.Parse(time.RFC3339, s)
	if err == nil {
		return t
	}
	return time.Now()
}

// ImportAliasesFromSqlite imports user_emails from old SQLite DB as Aliases
func ImportAliasesFromSqlite(dbPath string) (*ImportStats, error) {
	stats := &ImportStats{}

	// Open SQLite DB
	sqldb, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite db: %w", err)
	}
	defer sqldb.Close()

	// First, build a map: old_user_id -> username
	userMap := make(map[string]string) // old_id -> username
	rows, err := sqldb.Query("SELECT id, username FROM users")
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	for rows.Next() {
		var id, username string
		rows.Scan(&id, &username)
		userMap[id] = username
	}
	rows.Close()

	// Now query user_emails
	rows, err = sqldb.Query("SELECT user_id, email_address FROM user_emails")
	if err != nil {
		return nil, fmt.Errorf("failed to query user_emails: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		stats.Total++

		var oldUserID, emailAddr string
		if err := rows.Scan(&oldUserID, &emailAddr); err != nil {
			stats.Errors = append(stats.Errors, fmt.Sprintf("Scan error: %v", err))
			continue
		}

		// Find username from old user_id
		username, ok := userMap[oldUserID]
		if !ok {
			stats.Errors = append(stats.Errors, fmt.Sprintf("User not found for old_id: %s", oldUserID))
			continue
		}

		// Find new user by username
		var newUser models.User
		if err := database.DB.Where("username = ?", username).First(&newUser).Error; err != nil {
			stats.Errors = append(stats.Errors, fmt.Sprintf("New user not found: %s", username))
			continue
		}

		// Parse email address
		parts := splitEmail(emailAddr)
		if parts == nil {
			stats.Errors = append(stats.Errors, fmt.Sprintf("Invalid email format: %s", emailAddr))
			continue
		}
		localPart := parts[0]
		domainName := parts[1]

		// Find or Create Domain
		var domain models.Domain
		result := database.DB.Where("domain = ?", domainName).First(&domain)
		if result.Error != nil {
			// Create domain with explicit ID
			domain = models.Domain{
				Base: models.Base{
					ID: uuid.NewString(),
				},
				Domain:   domainName,
				IsPublic: true, // Assume public for imported
			}
			if err := database.DB.Create(&domain).Error; err != nil {
				stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to create domain %s: %v", domainName, err))
				continue
			}
		}

		// Check if alias already exists
		var existingAlias models.Alias
		aliasCheck := database.DB.Where("local_part = ? AND domain_id = ?", localPart, domain.ID).First(&existingAlias)
		if aliasCheck.Error == nil {
			// Alias exists, skip
			stats.Skipped++
			continue
		}

		// Create Alias
		alias := models.Alias{
			Base: models.Base{
				ID: uuid.NewString(),
			},
			LocalPart: localPart,
			DomainID:  domain.ID,
			UserID:    &newUser.ID,
			OwnerType: "user",
			IsActive:  true,
		}
		if err := database.DB.Create(&alias).Error; err != nil {
			stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to create alias %s@%s: %v", localPart, domainName, err))
			continue
		}

		stats.Imported++
	}

	return stats, nil
}

// splitEmail splits email into [localPart, domain], returns nil if invalid
func splitEmail(email string) []string {
	idx := -1
	for i := len(email) - 1; i >= 0; i-- {
		if email[i] == '@' {
			idx = i
			break
		}
	}
	if idx <= 0 || idx >= len(email)-1 {
		return nil
	}
	return []string{email[:idx], email[idx+1:]}
}
