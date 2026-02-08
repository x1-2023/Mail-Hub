package handlers

import (
	"mailhub/internal/models"
	"mailhub/internal/services"
	"mailhub/internal/utils"
	"mailhub/pkg/database"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type SSOHandler struct{}

func NewSSOHandler() *SSOHandler {
	return &SSOHandler{}
}

// Verify - POST /api/sso/verify
// Verifies a JWT token and returns user info
// Used by Shop to verify Mail-issued tokens
func (h *SSOHandler) Verify(c *fiber.Ctx) error {
	var req struct {
		Token string `json:"token"`
	}
	if err := c.BodyParser(&req); err != nil || req.Token == "" {
		return utils.Error(c, "Token required", 400)
	}

	// Parse and verify JWT
	token, err := jwt.Parse(req.Token, func(token *jwt.Token) (interface{}, error) {
		return services.JwtSecret, nil
	})

	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{
			"valid": false,
			"error": "Invalid or expired token",
		})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"valid": false,
			"error": "Invalid token claims",
		})
	}

	// Extract user ID
	userID, ok := claims["sub"].(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"valid": false,
			"error": "Missing user ID in token",
		})
	}

	// Verify user exists and check token_version
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{
			"valid": false,
			"error": "User not found",
		})
	}

	// Check if user is banned
	if user.Status == "BANNED" {
		return c.Status(403).JSON(fiber.Map{
			"valid": false,
			"error": "User is banned",
		})
	}

	// Check token_version for revocation
	if tv, exists := claims["token_version"]; exists {
		if tvFloat, ok := tv.(float64); ok {
			if int(tvFloat) < user.TokenVersion {
				return c.Status(401).JSON(fiber.Map{
					"valid": false,
					"error": "Token has been revoked",
				})
			}
		}
	}

	return c.JSON(fiber.Map{
		"valid": true,
		"user": fiber.Map{
			"id":            user.ID,
			"email":         user.Email,
			"role":          user.Role,
			"token_version": user.TokenVersion,
		},
	})
}

// Me - GET /api/sso/me
// Returns current user info from Bearer token
func (h *SSOHandler) Me(c *fiber.Ctx) error {
	// Get token from Authorization header
	tokenStr := c.Get("Authorization")
	if tokenStr == "" {
		return c.Status(401).JSON(fiber.Map{
			"authenticated": false,
		})
	}

	if len(tokenStr) > 7 && tokenStr[:7] == "Bearer " {
		tokenStr = tokenStr[7:]
	}

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return services.JwtSecret, nil
	})

	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{
			"authenticated": false,
		})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"authenticated": false,
		})
	}

	userID, ok := claims["sub"].(string)
	if !ok {
		return c.Status(401).JSON(fiber.Map{
			"authenticated": false,
		})
	}

	// Get fresh user data
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{
			"authenticated": false,
		})
	}

	if user.Status == "BANNED" {
		return c.Status(401).JSON(fiber.Map{
			"authenticated": false,
		})
	}

	return c.JSON(fiber.Map{
		"authenticated": true,
		"user": fiber.Map{
			"id":         user.ID,
			"email":      user.Email,
			"username":   user.Username,
			"role":       user.Role,
			"created_at": user.CreatedAt,
		},
	})
}
