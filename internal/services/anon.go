package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"mailhub/internal/models"
	"mailhub/internal/utils"
	"mailhub/pkg/database"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnonService struct{}

// CreateAddress generates a new anonymous alias and token
func (s *AnonService) CreateAddress(ctx context.Context, preferredDomain string, preferredLocalPart string, claimUserID *string) (*models.Alias, string, error) {
	fmt.Printf("DEBUG: CreateAddress Service - Domain: %s, LocalPart: %s, ClaimUserID: %v\n", preferredDomain, preferredLocalPart, claimUserID)
	// 0. Quota Check (Phase 3.5 Q1)
	if claimUserID != nil {
		maxAliases := Settings.GetInt("max_aliases_per_user", 10)
		var currentCount int64
		if err := database.DB.Model(&models.Alias{}).Where("claimed_by_user_id = ?", claimUserID).Count(&currentCount).Error; err != nil {
			log.Printf("[AnonService] Quota Check Error: %v", err)
			// Fail open or closed? Closed for safety.
			return nil, "", errors.New("system error checking quota")
		}

		if currentCount >= int64(maxAliases) {
			return nil, "", fmt.Errorf("quota exceeded: max %d aliases allowed", maxAliases)
		}
	}

	// 1. Find or Create Public System Domain
	var domain models.Domain

	query := database.DB.Where("is_public = ?", true)
	if preferredDomain != "" {
		query = query.Where("domain = ?", preferredDomain)
	}

	if err := query.First(&domain).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// If preferred domain not found, try default fallback logic
			if preferredDomain != "" {
				// Retry with any public domain
				if err := database.DB.Where("is_public = ?", true).First(&domain).Error; err == nil {
					goto FoundDomain
				}
			}

			// Auto-seed for V1 prototype convenience
			defaultDomain := os.Getenv("DOMAIN")
			if defaultDomain == "" {
				defaultDomain = "hotmailv.com"
			}
			domain = models.Domain{
				Domain:   defaultDomain,
				IsPublic: true,
			}
			if err := database.DB.Create(&domain).Error; err != nil {
				return nil, "", err
			}
		} else {
			return nil, "", err
		}
	}

FoundDomain:

	// 2. Generate Random Local Part
	// Retry loop for collision
	var localPart string

	if preferredLocalPart != "" {
		// Validate charsets etc if needed, simplified here
		// Simple validation: alphanumeric, dot, underscore, hyphen
		// Or just let DB constraint fail if bad chars? Let's assume input is semi-clean for now or sanitized by frontend.
		// Actually, let's just use it.
		localPart = preferredLocalPart
		// Check collision once
		var count int64
		database.DB.Model(&models.Alias{}).Where("local_part = ? AND domain_id = ?", localPart, domain.ID).Count(&count)
		if count > 0 {
			return nil, "", errors.New("alias already exists")
		}
	} else {
		for i := 0; i < 5; i++ {
			randStr, err := utils.GenerateRandomString(4) // 8 chars hex or similar
			if err != nil {
				return nil, "", err
			}
			localPart = randStr

			// Check uniqueness
			var count int64
			database.DB.Model(&models.Alias{}).Where("local_part = ? AND domain_id = ?", localPart, domain.ID).Count(&count)
			if count == 0 {
				break
			}
		}
	}

	// 3. Create Alias
	retentionHours := Settings.GetInt("anon_retention_hours", 24)
	expiresAt := time.Now().Add(time.Duration(retentionHours) * time.Hour)

	// Determine owner type and expiry based on authentication
	ownerType := "anonymous"
	var aliasExpiresAt *time.Time = &expiresAt
	if claimUserID != nil {
		ownerType = "user"
		aliasExpiresAt = nil // User-owned aliases don't expire
	}

	alias := &models.Alias{
		LocalPart:       localPart,
		DomainID:        domain.ID,
		IsActive:        true,
		OwnerType:       ownerType,
		ExpiresAt:       aliasExpiresAt,
		UserID:          claimUserID, // Set UserID for proper ownership
		ClaimedByUserID: claimUserID, // Also set ClaimedByUserID for API Key tracking
	}
	alias.ID = uuid.New().String()

	log.Printf("[AnonDebug] Creating Alias: LocalPart=%s, DomainID=%s", alias.LocalPart, alias.DomainID)
	if err := database.DB.Create(alias).Error; err != nil {
		log.Printf("[AnonDebug] Create Error: %v", err)
		return nil, "", err
	}

	// Populate Domain for return
	alias.Domain = domain

	// 4. Generate Anon Token (JWT)
	tokenWait := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      alias.ID,
		"alias_id": alias.ID,
		"scope":    "anon",
		"exp":      expiresAt.Unix(), // Sync token expiry with alias expiry
	})

	token, err := tokenWait.SignedString(JwtSecret) // Reusing secret from auth.go
	if err != nil {
		return nil, "", err
	}

	return alias, token, nil
}

// GetPublicDomains returns all public domains available for registration
func (s *AnonService) GetPublicDomains(ctx context.Context) ([]models.Domain, error) {
	var domains []models.Domain
	log.Println("[AnonService] Fetching public domains...")
	if err := database.DB.Where("is_public = ?", true).Find(&domains).Error; err != nil {
		log.Printf("[AnonService] Query Error: %v", err)
		return nil, err
	}
	log.Printf("[AnonService] Found %d domains", len(domains))
	return domains, nil
}
