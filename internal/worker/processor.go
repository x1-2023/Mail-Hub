package worker

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"

	"mailhub/internal/models"
	"mailhub/internal/services"
	"mailhub/internal/smtp"
	"mailhub/pkg/database"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
	"github.com/jhillyerd/enmime"
)

func HandleEmailTask(ctx context.Context, t *asynq.Task) error {
	log.Printf("Processing Email Task Payload size: %d", len(t.Payload()))

	// Deserialize payload manually since we skipped proper serialization in producer
	// In producer `payload := map[string]string`... wait, asynq payload is bytes.
	// Check producer code again.
	// producer.go: `task := asynq.NewTask("email:process", nil` -> Payload is nil?
	// Ah, I set payload to nil in v1 producer draft. I need to fix producer first!
	// BUT, anticipating the fix, let's assume JSON payload
	var payload struct {
		Mime   string `json:"mime"`
		Sender string `json:"sender"`
		Rcpt   string `json:"rcpt"`
	}

	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}

	// 1. Parse MIME
	env, err := enmime.ReadEnvelope(strings.NewReader(payload.Mime))
	if err != nil {
		return err
	}

	// 1.5. SPAM CHECK - Check before saving to DB
	subject := env.GetHeader("Subject")
	body := env.Text
	spamResult := smtp.CheckSpam(payload.Sender, subject, body)

	if spamResult.IsSpam {
		if spamResult.Action == "reject" {
			// Block: Don't save to database at all
			log.Printf("[SPAM BLOCKED] Email from %s rejected by rule '%s'", payload.Sender, spamResult.Rule)
			return nil // Silently discard, don't return error to avoid retries
		}
		// If action is "flag", continue but will mark as spam (TODO: add IsSpam field to Email model)
		log.Printf("[SPAM FLAGGED] Email from %s flagged by rule '%s'", payload.Sender, spamResult.Rule)
	}

	// 2. Find Alias
	rcptParts := strings.Split(payload.Rcpt, "@")
	if len(rcptParts) != 2 {
		return nil // Skip invalid
	}

	var alias models.Alias
	err = database.DB.Joins("JOIN domains ON domains.id = aliases.domain_id").
		Where("aliases.local_part = ? AND domains.domain = ?", rcptParts[0], rcptParts[1]).
		First(&alias).Error

	if err != nil {
		// Alias not found (maybe deleted between SMTP check and Worker)
		return nil
	}

	// 3. Save Email Metadata
	email := &models.Email{
		Base: models.Base{
			ID: uuid.New().String(),
		},
		AliasID:    alias.ID,
		Sender:     payload.Sender,
		Subject:    env.GetHeader("Subject"),
		Snippet:    env.Text, // Truncate ideally
		IsRead:     false,
		ReceivedAt: time.Now(),
	}

	// Calculate Expiration
	now := time.Now()
	var expiresAt *time.Time

	if alias.OwnerType == "anonymous" {
		ttlHours := services.Settings.GetInt("anon_retention_hours", 24)
		exp := now.Add(time.Duration(ttlHours) * time.Hour)
		expiresAt = &exp
	} else {
		ttlDays := services.Settings.GetInt("user_retention_days", 30)
		exp := now.Add(time.Duration(ttlDays) * 24 * time.Hour)
		expiresAt = &exp
	}

	if len(email.Snippet) > 100 {
		email.Snippet = email.Snippet[:100] + "..."
	}

	email.ExpiresAt = expiresAt

	if err := database.DB.Create(email).Error; err != nil {
		return err
	}

	// 4. Save Content (Lazy)
	content := &models.EmailContent{
		EmailID:  email.ID,
		BodyText: env.Text,
		BodyHTML: env.HTML,
		Headers:  []byte("{}"), // Serialize headers if needed
	}

	if err := database.DB.Create(content).Error; err != nil {
		return err
	}

	// 5. Enforce Rolling Buffer (Q3)
	// Spec: "Enforced by worker immediately"
	go func() {
		if err := enforceRollingLimit(email.AliasID); err != nil {
			log.Printf("Failed to enforce rolling limit for %s: %v", email.AliasID, err)
		}
	}()

	log.Printf("Saved email for %s (ID: %s)", payload.Rcpt, email.ID)
	return nil
}

// enforceRollingLimit ensures an alias doesn't exceed MaxEmailsPerAlias
// It deletes the oldest NON-STARRED emails if the limit is exceeded.
func enforceRollingLimit(aliasID string) error {
	maxEmails := services.Settings.GetInt("max_emails_per_alias", 100)

	var count int64
	db := database.DB

	// Count non-starred emails
	if err := db.Model(&models.Email{}).
		Where("alias_id = ? AND is_starred = ?", aliasID, false).
		Count(&count).Error; err != nil {
		return err
	}

	if count <= int64(maxEmails) {
		return nil
	}

	// Calculate how many to delete
	excess := int(count) - maxEmails
	if excess <= 0 {
		return nil
	}

	// Delete oldest X non-starred emails
	// Postgres: DELETE ... WHERE id IN (SELECT id ... LIMIT X)
	// GORM doesn't support LIMIT on DELETE directly in a portable way without subquery.
	subQuery := db.Model(&models.Email{}).
		Select("id").
		Where("alias_id = ? AND is_starred = ?", aliasID, false).
		Order("received_at ASC").
		Limit(excess)

	result := db.Where("id IN (?)", subQuery).Delete(&models.Email{})
	if result.Error != nil {
		return result.Error
	}

	log.Printf("[Quota] Pruned %d old emails for alias %s (Rolling Buffer)", result.RowsAffected, aliasID)
	return nil
}
