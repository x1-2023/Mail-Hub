package middleware

import (
	"fmt"
	"log"
	"mailhub/internal/models"
	"mailhub/internal/services"
	"mailhub/internal/utils"
	"mailhub/pkg/database"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// Helper to validate API Key
func validateAPIKey(c *fiber.Ctx) (*models.User, error) {
	apiKey := c.Get("X-Api-Key")
	if apiKey == "" {
		return nil, nil
	}

	var user models.User
	if err := database.DB.Where("api_key = ?", apiKey).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// OptionalAuth - Populate user context if authenticated, but don't require it
func OptionalAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Try API Key
		if apiKeyUser, _ := validateAPIKey(c); apiKeyUser != nil {
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub":  apiKeyUser.ID,
				"role": apiKeyUser.Role,
			})
			c.Locals("user", token)
			return c.Next()
		}

		// Try Bearer Token
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return services.JwtSecret, nil
			})
			if err == nil && token.Valid {
				c.Locals("user", token)
			}
		}

		// Continue regardless (anonymous is valid)
		return c.Next()
	}
}

func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Check API Key first (User Preference)
		if apiKeyUser, err := validateAPIKey(c); err != nil {
			return utils.Error(c, "Invalid API Key", 401)
		} else if apiKeyUser != nil {
			// Create a fake token for consistency in handlers
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub":  apiKeyUser.ID,
				"role": apiKeyUser.Role,
			})
			c.Locals("user", token)
			return c.Next()
		}

		// 2. Fallback to JWT
		authHeader := c.Get("Authorization")

		// Fallback for SSE (EventSource doesn't support headers)
		if authHeader == "" {
			token := c.Query("token")
			if token != "" {
				authHeader = "Bearer " + token
			}
		}

		if authHeader == "" {
			// Check for Anon Header fallback
			anonToken := c.Get("X-Anon-Token")
			if anonToken != "" {
				if strings.HasPrefix(anonToken, "Bearer ") {
					authHeader = anonToken
				} else {
					authHeader = "Bearer " + anonToken
				}
			}
		}

		if authHeader == "" {
			return utils.Error(c, "Missing Authorization Header or API Key", 401)
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return services.JwtSecret, nil
		})

		if err != nil || !token.Valid {
			return utils.Error(c, "Invalid or Expired Token", 401)
		}

		c.Locals("user", token)
		return c.Next()
	}
}

func AnonProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Check API Key first (Allow registered users to access anon routes)
		if apiKeyUser, err := validateAPIKey(c); err != nil {
			return utils.Error(c, "Invalid API Key", 401)
		} else if apiKeyUser != nil {
			// Create a fake token for consistency in handlers
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub":  apiKeyUser.ID,
				"role": apiKeyUser.Role,
			})
			c.Locals("user", token)
			return c.Next()
		}

		// 2. Check Bearer Token (JWT from login)
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return services.JwtSecret, nil
			})
			if err == nil && token.Valid {
				c.Locals("user", token)
				return c.Next()
			}
		}

		// 3. Fallback to X-Anon-Token (Original Behavior)
		tokenString := c.Get("X-Anon-Token")
		if tokenString == "" {
			return utils.Error(c, "Missing Anon Token", 401)
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return services.JwtSecret, nil
		})

		if err != nil || !token.Valid {
			return utils.Error(c, "Invalid Token", 401)
		}

		c.Locals("user", token)
		return c.Next()
	}
}

func AdminProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Check API Key
		if apiKeyUser, err := validateAPIKey(c); err != nil {
			return utils.Error(c, "Invalid API Key", 401)
		} else if apiKeyUser != nil {
			if apiKeyUser.Role != "admin" && apiKeyUser.Role != "owner" {
				return utils.Error(c, "Admin Access Required", 403)
			}
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub":  apiKeyUser.ID,
				"role": apiKeyUser.Role,
			})
			c.Locals("user", token)
			return c.Next()
		}

		// 2. Fallback to JWT
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			log.Println("DEBUG: AdminProtected - Missing Authorization Header")
			return utils.Error(c, "Missing Authorization Header", 401)
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return services.JwtSecret, nil
		})

		if err != nil || !token.Valid {
			log.Printf("DEBUG: AdminProtected - Invalid Token: %v", err)
			return utils.Error(c, "Invalid or Expired Token", 401)
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return utils.Error(c, "Invalid Token Claims", 401)
		}

		role, ok := claims["role"].(string)

		// Allow both "admin" and "owner" roles
		// DEBUG: Expose Role in error message for debugging
		if !ok || (role != "admin" && role != "owner") {
			return utils.Error(c, fmt.Sprintf("Admin Access Required. Role: '%s', ClaimType: %T", role, claims["role"]), 403)
		}

		c.Locals("user", token)
		return c.Next()
	}
}

// OwnerProtected allows only owner role (for Settings and other owner-only features)
func OwnerProtected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 1. Check API Key
		if apiKeyUser, err := validateAPIKey(c); err != nil {
			return utils.Error(c, "Invalid API Key", 401)
		} else if apiKeyUser != nil {
			if apiKeyUser.Role != "owner" {
				return utils.Error(c, "Owner Access Required", 403)
			}
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"sub":  apiKeyUser.ID,
				"role": apiKeyUser.Role,
			})
			c.Locals("user", token)
			return c.Next()
		}

		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return utils.Error(c, "Missing Authorization Header", 401)
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return services.JwtSecret, nil
		})

		if err != nil || !token.Valid {
			return utils.Error(c, "Invalid or Expired Token", 401)
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return utils.Error(c, "Invalid Token Claims", 401)
		}

		role, ok := claims["role"].(string)
		if !ok || role != "owner" {
			return utils.Error(c, fmt.Sprintf("Owner Access Required. Role: '%s'", role), 403)
		}

		c.Locals("user", token)
		return c.Next()
	}
}
