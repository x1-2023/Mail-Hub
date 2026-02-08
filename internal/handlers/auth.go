package handlers

import (
	"mailhub/internal/services"
	"mailhub/internal/utils"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	Service *services.AuthService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		Service: &services.AuthService{},
	}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	type Request struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request body", 400)
	}

	if req.Email == "" || req.Password == "" {
		return utils.Error(c, "Email and password required", 400)
	}

	// Public registration: No username, Role "USER" (SSO standard)
	user, err := h.Service.Register(c.Context(), req.Email, "", req.Password, "USER")
	if err != nil {
		return utils.Error(c, err.Error(), 400)
	}

	// Send Welcome Notification
	services.Notifications.Create(&user.ID, "success", "Welcome to MailHub! Your account is ready.")

	return utils.Success(c, fiber.Map{"user_id": user.ID, "email": user.Email})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	type Request struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request body", 400)
	}

	token, user, err := h.Service.Login(c.Context(), req.Email, req.Password)
	if err != nil {
		return utils.Error(c, err.Error(), 401)
	}

	return utils.Success(c, fiber.Map{
		"token": token,
		"user": map[string]string{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}
