package handlers

import (
	"fmt"

	"mailhub/internal/services"
	"mailhub/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type AnonHandler struct {
	Service *services.AnonService
}

func NewAnonHandler() *AnonHandler {
	return &AnonHandler{
		Service: &services.AnonService{},
	}
}

func (h *AnonHandler) CreateAddress(c *fiber.Ctx) error {
	var req struct {
		Domain    string `json:"domain"`
		LocalPart string `json:"local_part"`
	}
	// Try parsing body, ignore if empty/malformed as fields are optional
	if err := c.BodyParser(&req); err != nil {
		fmt.Printf("BodyParser Error: %v\n", err)
	}
	fmt.Printf("DEBUG: CreateAddress Handler - Parsed Req: %+v\n", req)

	// Extract User ID if authenticated (API Key or Bearer Token)
	var claimUserID *string
	if user := c.Locals("user"); user != nil {
		if token, ok := user.(*jwt.Token); ok {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if sub, ok := claims["sub"].(string); ok {
					claimUserID = &sub
				}
			}
		}
	}

	alias, token, err := h.Service.CreateAddress(c.Context(), req.Domain, req.LocalPart, claimUserID)
	if err != nil {
		return utils.Error(c, err.Error(), 500)
	}

	address := fmt.Sprintf("%s@%s", alias.LocalPart, alias.Domain.Domain)

	return utils.Success(c, fiber.Map{
		"address":    address,
		"token":      token,
		"expires_at": alias.ExpiresAt,
	})
}

func (h *AnonHandler) GetDomains(c *fiber.Ctx) error {
	domains, err := h.Service.GetPublicDomains(c.Context())
	if err != nil {
		return utils.Error(c, err.Error(), 500)
	}
	return utils.Success(c, domains)
}

func (h *AnonHandler) GetPublicConfig(c *fiber.Ctx) error {
	// Whitelist of public settings
	keys := []string{
		"donate_bank_name",
		"donate_account_number",
		"donate_account_name",
		"donate_message",
		"anon_retention_hours",
	}

	config := make(map[string]string)
	for _, k := range keys {
		config[k] = services.Settings.GetString(k, "")
	}
	return utils.Success(c, config)
}
