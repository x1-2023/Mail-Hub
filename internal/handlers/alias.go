package handlers

import (
	"mailhub/internal/models"
	"mailhub/internal/services"
	"mailhub/internal/utils"
	"mailhub/pkg/database"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type AliasHandler struct{}

func NewAliasHandler() *AliasHandler {
	return &AliasHandler{}
}

// CreateUserAlias creates an alias owned by the logged-in user
func (h *AliasHandler) CreateUserAlias(c *fiber.Ctx) error {
	// Get user ID from JWT
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	var req struct {
		LocalPart string `json:"local_part"`
		DomainID  string `json:"domain_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request body", 400)
	}

	// If domain not specified, find a public domain
	var domain models.Domain
	if req.DomainID == "" {
		if err := database.DB.Where("is_public = ?", true).First(&domain).Error; err != nil {
			return utils.Error(c, "No public domain available", 400)
		}
	} else {
		if err := database.DB.First(&domain, "id = ?", req.DomainID).Error; err != nil {
			return utils.Error(c, "Domain not found", 404)
		}
	}

	// Generate local part if not provided
	localPart := req.LocalPart
	if localPart == "" {
		randStr, err := utils.GenerateRandomString(4)
		if err != nil {
			return utils.Error(c, "Failed to generate alias", 500)
		}
		localPart = randStr
	}

	// Check alias limit for user
	maxAliases := services.Settings.GetInt("max_aliases_per_user", 10)
	var aliasCount int64
	database.DB.Model(&models.Alias{}).Where("user_id = ?", userID).Count(&aliasCount)
	if aliasCount >= int64(maxAliases) {
		return utils.Error(c, "Alias limit reached", 403)
	}

	// Check for collision
	var existing int64
	database.DB.Model(&models.Alias{}).Where("local_part = ? AND domain_id = ?", localPart, domain.ID).Count(&existing)
	if existing > 0 {
		return utils.Error(c, "Alias already exists", 409)
	}

	// Create alias with proper ownership
	alias := &models.Alias{
		LocalPart:       localPart,
		DomainID:        domain.ID,
		UserID:          &userID,
		OwnerType:       "user",
		ClaimedByUserID: &userID,
		IsActive:        true,
		ExpiresAt:       nil, // User aliases don't expire
	}
	alias.ID = uuid.New().String()

	if err := database.DB.Create(alias).Error; err != nil {
		return utils.Error(c, "Failed to create alias", 500)
	}

	// Preload domain for response
	alias.Domain = domain

	return utils.Success(c, alias)
}

// GetUserAliases returns all aliases owned by the logged-in user
func (h *AliasHandler) GetUserAliases(c *fiber.Ctx) error {
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	var aliases []models.Alias
	if err := database.DB.Preload("Domain").Where("user_id = ? OR claimed_by_user_id = ?", userID, userID).Order("created_at desc").Find(&aliases).Error; err != nil {
		return utils.Error(c, "Failed to fetch aliases", 500)
	}

	// Build response with email count for each alias
	type AliasWithCount struct {
		models.Alias
		EmailCount int64 `json:"email_count"`
	}

	result := make([]AliasWithCount, len(aliases))
	for i, alias := range aliases {
		var count int64
		database.DB.Model(&models.Email{}).Where("alias_id = ?", alias.ID).Count(&count)
		result[i] = AliasWithCount{Alias: alias, EmailCount: count}
	}

	return utils.Success(c, result)
}

// DeleteUserAlias deletes an alias owned by the logged-in user
func (h *AliasHandler) DeleteUserAlias(c *fiber.Ctx) error {
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	aliasID := c.Params("id")

	// Verify ownership
	var alias models.Alias
	if err := database.DB.First(&alias, "id = ? AND user_id = ?", aliasID, userID).Error; err != nil {
		return utils.Error(c, "Alias not found or not owned by you", 404)
	}

	if err := database.DB.Delete(&alias).Error; err != nil {
		return utils.Error(c, "Failed to delete alias", 500)
	}

	return utils.Success(c, nil)
}
