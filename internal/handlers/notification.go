package handlers

import (
	"bufio"
	"fmt"
	"mailhub/internal/services"
	"mailhub/internal/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
) // Add missing import

type NotificationHandler struct{}

func NewNotificationHandler() *NotificationHandler {
	return &NotificationHandler{}
}

// StreamSSE handles real-time events
func (h *NotificationHandler) StreamSSE(c *fiber.Ctx) error {
	// Get User from Context (Auth Middleware required)
	userVal := c.Locals("user")
	if userVal == nil {
		return c.SendStatus(401)
	}
	userToken := userVal.(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	// Set Headers for SSE
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("Transfer-Encoding", "chunked")

	// Subscribe
	notifyChan := services.Notifications.Subscribe(userID)
	defer services.Notifications.Unsubscribe(userID, notifyChan)

	// Stream
	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		for msg := range notifyChan {
			fmt.Fprintf(w, "data: %s\n\n", msg)
			w.Flush()
		}
	})

	return nil
}

func (h *NotificationHandler) List(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	list, err := services.Notifications.List(userID)
	if err != nil {
		return utils.Error(c, "Failed to fetch notifications", 500)
	}
	return utils.Success(c, list)
}

func (h *NotificationHandler) MarkRead(c *fiber.Ctx) error {
	userToken := c.Locals("user").(*jwt.Token)
	claims := userToken.Claims.(jwt.MapClaims)
	userID := claims["sub"].(string)

	if err := services.Notifications.MarkAllRead(userID); err != nil {
		return utils.Error(c, "Failed to update", 500)
	}
	return utils.Success(c, nil)
}
