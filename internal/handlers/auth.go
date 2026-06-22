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

func (h *AuthHandler) GetPublicKey(c *fiber.Ctx) error {
	return utils.Success(c, fiber.Map{
		"publicKey": utils.GetPublicKeyPEM(),
	})
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

	// Decrypt password
	decryptedPassword, err := utils.DecryptRSA(req.Password)
	if err != nil {
		// Fallback to plaintext if decryption fails (for transition or direct API clients), 
		// but since we want to force encryption, we will reject it.
		// However, to avoid breaking during deployment, we can accept it if length < 100 
		// (RSA base64 is much longer). Let's be strict and require encryption.
		return utils.Error(c, "Invalid encrypted password payload", 400)
	}

	if len(decryptedPassword) < 8 {
		return utils.Error(c, "Password must be at least 8 characters long", 400)
	}

	// Public registration: No username, Role "USER" (SSO standard)
	user, err := h.Service.Register(c.Context(), req.Email, "", decryptedPassword, "USER")
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

	// Decrypt password
	decryptedPassword, err := utils.DecryptRSA(req.Password)
	if err != nil {
		// For backward compatibility with existing tokens/clients, if it fails RSA decryption
		// and looks like a plaintext password, we could allow it. 
		// But to enforce security, we reject.
		return utils.Error(c, "Invalid encrypted password payload", 400)
	}

	token, user, err := h.Service.Login(c.Context(), req.Email, decryptedPassword)
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
