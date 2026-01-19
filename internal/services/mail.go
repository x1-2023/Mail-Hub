package services

import (
	"errors"
	"strings"
	"time"

	"mailhub/internal/models"
	"mailhub/pkg/database"

	"gorm.io/gorm"
)

type MailService struct{}

func NewMailService() *MailService {
	return &MailService{}
}

func (s *MailService) VerifyAliasOwnership(aliasID, userID string) (bool, error) {
	var count int64
	// Check if Alias is owned by User (user_id) OR claimed by User (claimed_by_user_id)
	err := database.DB.Model(&models.Alias{}).
		Where("id = ? AND (user_id = ? OR claimed_by_user_id = ?)", aliasID, userID, userID).
		Count(&count).Error
	return count > 0, err
}

func (s *MailService) GetAliasIDByEmail(email string) (string, error) {
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return "", errors.New("invalid email format")
	}
	localPart, domain := parts[0], parts[1]

	var alias models.Alias
	err := database.DB.Joins("JOIN domains ON domains.id = aliases.domain_id").
		Where("aliases.local_part = ? AND domains.domain = ?", localPart, domain).
		Select("aliases.id").
		First(&alias).Error

	if err != nil {
		return "", err
	}
	return alias.ID, nil
}

func (s *MailService) GetMessagesByAlias(aliasID string, limit, offset int, onlyStarred bool) ([]models.Email, int64, error) {
	var emails []models.Email
	var total int64

	db := database.DB.Model(&models.Email{}).Where("alias_id = ?", aliasID)

	if onlyStarred {
		db = db.Where("is_starred = ?", true)
	}

	db.Count(&total)

	err := db.Order("received_at desc").
		Limit(limit).
		Offset(offset).
		Find(&emails).Error

	return emails, total, err
}

func (s *MailService) GetMessagesByEmailPublic(email string, limit, offset int) ([]models.Email, int64, error) {
	// 1. Split Email
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return nil, 0, errors.New("invalid email format")
	}
	localPart, domain := parts[0], parts[1]

	// 2. Find Alias
	var alias models.Alias
	err := database.DB.Joins("JOIN domains ON domains.id = aliases.domain_id").
		Where("aliases.local_part = ? AND domains.domain = ?", localPart, domain).
		First(&alias).Error

	if err != nil {
		return nil, 0, err
	}

	// 3. Security: BLOCK REGISTERED USERS
	if alias.OwnerType != "anonymous" {
		return nil, 0, errors.New("access denied: registered user inbox")
	}

	// 4. Fetch Messages
	return s.GetMessagesByAlias(alias.ID, limit, offset, false)
}

func (s *MailService) GetMessageContent(emailID string) (*models.EmailContent, error) {
	var content models.EmailContent
	err := database.DB.Where("email_id = ?", emailID).First(&content).Error
	return &content, err
}

func (s *MailService) DeleteMessage(id string) error {
	return database.DB.Where("id = ?", id).Delete(&models.Email{}).Error
}

func (s *MailService) StarMessage(id string) error {
	var email models.Email
	if err := database.DB.First(&email, "id = ?", id).Error; err != nil {
		return err
	}

	// 1. Unstarring (True -> False)
	if email.IsStarred {
		email.IsStarred = false

		// Reset Expiration based on Owner
		now := time.Now()
		var expiresAt time.Time

		var alias models.Alias
		if err := database.DB.First(&alias, "id = ?", email.AliasID).Error; err != nil {
			// If alias not found (orphan), default to 30d (User logic) for safety
			expiresAt = now.Add(30 * 24 * time.Hour)
		} else {
			if alias.OwnerType == "anonymous" {
				ttl := Settings.GetInt("anon_retention_hours", 24)
				expiresAt = now.Add(time.Duration(ttl) * time.Hour)
			} else {
				ttl := Settings.GetInt("user_retention_days", 30)
				expiresAt = now.Add(time.Duration(ttl) * 24 * time.Hour)
			}
		}

		email.ExpiresAt = &expiresAt

		return database.DB.Save(&email).Error
	}

	// 2. Starring (False -> True)
	// Check Quota (Q4)
	var starCount int64
	database.DB.Model(&models.Email{}).
		Where("alias_id = ? AND is_starred = ?", email.AliasID, true).
		Count(&starCount)

	starCap := Settings.GetInt("star_cap_per_user", 50)
	if starCount >= int64(starCap) {
		return gorm.ErrInvalidData // Or custom "Quota Exceeded" error
	}

	email.IsStarred = true
	email.ExpiresAt = nil // Immortal

	return database.DB.Save(&email).Error
}
