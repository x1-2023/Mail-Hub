package handlers

import (
	"mailhub/internal/services"
	"mailhub/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type UserHandler struct {
	service *services.UserService
}

func NewUserHandler() *UserHandler {
	return &UserHandler{
		service: services.NewUserService(),
	}
}

func (h *UserHandler) ChangePassword(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	var req struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request body", 400)
	}

	if len(req.NewPassword) < 6 {
		return utils.Error(c, "Password must be at least 6 characters", 400)
	}

	if err := h.service.ChangePassword(userID, req.OldPassword, req.NewPassword); err != nil {
		return utils.Error(c, err.Error(), 400)
	}

	return utils.Success(c, fiber.Map{"message": "Password updated successfully"})
}

func (h *UserHandler) GetAPIKey(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	key, err := h.service.GetAPIKey(userID)
	if err != nil {
		return utils.Error(c, "Failed to get API key", 500)
	}

	return utils.Success(c, fiber.Map{"api_key": key})
}

func (h *UserHandler) RotateAPIKey(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	key, err := h.service.RotateAPIKey(userID)
	if err != nil {
		return utils.Error(c, "Failed to rotate API key", 500)
	}

	return utils.Success(c, fiber.Map{"api_key": key})
}
