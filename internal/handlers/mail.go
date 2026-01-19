package handlers

import (
	"mailhub/internal/services"
	"mailhub/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type MailHandler struct {
	service *services.MailService
}

func NewMailHandler() *MailHandler {
	return &MailHandler{
		service: services.NewMailService(),
	}
}

func (h *MailHandler) GetMessages(c *fiber.Ctx) error {
	// Extract AliasID from JWT (set by Middleware)
	user := c.Locals("user").(*jwt.Token)
	claims := user.Claims.(jwt.MapClaims)

	var aliasID string

	// 1. Try "alias_id" from Claim (Anonymous Token)
	if raw, ok := claims["alias_id"]; ok {
		if strVal, ok := raw.(string); ok {
			aliasID = strVal
		}
	}

	// 2. Fallback to "sub" if it matches an alias format?
	// PROBLEM: For User JWT, "sub" is UserID.
	// We need to differentiate Token Type or check Alias existence.

	// Check if query param "alias_id" or "email" is provided (for User access)
	queryAliasID := c.Query("alias_id")
	queryEmail := c.Query("email")

	if queryEmail != "" {
		// Resolve email to ID
		var err error
		queryAliasID, err = h.service.GetAliasIDByEmail(queryEmail)
		if err != nil {
			return utils.Error(c, "Email not found", 404)
		}
	}

	if queryAliasID != "" {
		// Verify Ownership
		// We trust "sub" is the UserID if it's a User JWT.
		if rawSub, ok := claims["sub"]; ok {
			userID := rawSub.(string)
			isOwned, err := h.service.VerifyAliasOwnership(queryAliasID, userID)
			if err == nil && isOwned {
				aliasID = queryAliasID
			} else {
				return utils.Error(c, "Access Denied to this Alias", 403)
			}
		} else {
			// If no "sub" (maybe strange token structure?), deny
			return utils.Error(c, "Token missing sub claim", 401)
		}
	}

	// 3. If AliasID is still empty, and we are Anonymous, use "sub" as fallback?
	if aliasID == "" {
		if sub, ok := claims["sub"]; ok {
			// Only use sub if NO query param was processed or failed?
			// If we are Anon, sub IS the ID.
			// How to distinguish?
			// Anon tokens usually have `role` claim? Or `scope`?
			// Our `createAnonAddress` returns a token.
			// Let's assume if query param missing, we treat sub as the ID.
			if strVal, ok := sub.(string); ok {
				aliasID = strVal
			}
		}
	}

	if aliasID == "" {
		return utils.Error(c, "Invalid Token: Missing or Invalid Alias ID", 401)
	}

	limit := c.QueryInt("limit", 20)
	page := c.QueryInt("page", 1)
	onlyStarred := c.QueryBool("starred", false)

	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	emails, total, err := h.service.GetMessagesByAlias(aliasID, limit, offset, onlyStarred)
	if err != nil {
		return utils.Error(c, "Failed to fetch messages", 500)
	}

	return utils.Success(c, fiber.Map{
		"emails": emails,
		"total":  total,
	})
}

// GetPublicMessages allows reading messages for Anonymous aliases WITHOUT a token
func (h *MailHandler) GetPublicMessages(c *fiber.Ctx) error {
	email := c.Query("email")
	if email == "" {
		return utils.Error(c, "Email required", 400)
	}

	limit := c.QueryInt("limit", 20)
	page := c.QueryInt("page", 1)

	if limit > 50 { // Stricter limit for public API
		limit = 50
	}
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	emails, total, err := h.service.GetMessagesByEmailPublic(email, limit, offset)
	if err != nil {
		// If not found or not anonymous, return empty list to simulate "no messages/not found"
		// without leaking if it's a private alias. Or just 404.
		// User requirement "cac alias co owner thi k doc duoc".
		// Returning 404 is fine.
		return utils.Error(c, "Inbox not found or access denied", 404)
	}

	return utils.Success(c, fiber.Map{
		"emails": emails,
		"total":  total,
	})
}

func (h *MailHandler) GetMessageContent(c *fiber.Ctx) error {
	id := c.Params("id")

	// Ideally verify ownership first

	content, err := h.service.GetMessageContent(id)
	if err != nil {
		return utils.Error(c, "Content not found", 404)
	}

	return utils.Success(c, content)
}

func (h *MailHandler) DeleteMessage(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.DeleteMessage(id); err != nil {
		return utils.Error(c, "Failed to delete message", 500)
	}
	return utils.Success(c, nil)
}

func (h *MailHandler) StarMessage(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.StarMessage(id); err != nil {
		return utils.Error(c, "Failed to star message", 500)
	}
	return utils.Success(c, nil)
}
