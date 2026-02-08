package handlers

import (
	"mailhub/internal/models"
	"mailhub/internal/queue"
	"mailhub/internal/services"
	"mailhub/internal/utils"
	"mailhub/pkg/database"
	"time"

	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct {
	service *services.AdminService
}

func NewAdminHandler() *AdminHandler {
	return &AdminHandler{
		service: services.NewAdminService(),
	}
}

func (h *AdminHandler) GetStats(c *fiber.Ctx) error {
	stats, err := h.service.GetStats()
	if err != nil {
		return utils.Error(c, "Failed to fetch stats", 500)
	}
	return utils.Success(c, stats)
}

func (h *AdminHandler) GetUsers(c *fiber.Ctx) error {
	limit := 50
	offset := 0
	users, total, err := h.service.GetUsers(limit, offset)
	if err != nil {
		return utils.Error(c, "Failed to fetch users", 500)
	}
	return utils.Success(c, fiber.Map{"users": users, "total": total})
}

func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	// Check if user is trying to delete an owner
	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.Error(c, "User not found", 404)
	}
	if user.Role == "OWNER" {
		return utils.Error(c, "Cannot delete owner", 403)
	}

	if err := database.DB.Delete(&models.User{}, "id = ?", id).Error; err != nil {
		return utils.Error(c, "Failed to delete user", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) ChangeUserRole(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Role string `json:"role"` // "USER", "ADMIN"
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request", 400)
	}

	// Validate role (SSO: uppercase roles)
	if req.Role != "USER" && req.Role != "ADMIN" {
		return utils.Error(c, "Role must be 'USER' or 'ADMIN'", 400)
	}

	// Check if target is owner (can't change owner's role)
	var user models.User
	if err := database.DB.First(&user, "id = ?", id).Error; err != nil {
		return utils.Error(c, "User not found", 404)
	}
	if user.Role == "OWNER" {
		return utils.Error(c, "Cannot change owner's role", 403)
	}

	// Update role
	if err := database.DB.Model(&models.User{}).Where("id = ?", id).Update("role", req.Role).Error; err != nil {
		return utils.Error(c, "Failed to update role", 500)
	}

	return utils.Success(c, fiber.Map{"role": req.Role})
}

func (h *AdminHandler) GetDomains(c *fiber.Ctx) error {
	domains, err := h.service.GetDomains()
	if err != nil {
		return utils.Error(c, "Failed to fetch domains", 500)
	}
	return utils.Success(c, domains)
}

func (h *AdminHandler) CreateDomain(c *fiber.Ctx) error {
	var req struct {
		Domain   string `json:"domain"`
		IsPublic bool   `json:"is_public"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request", 400)
	}

	domain, err := h.service.CreateDomain(req.Domain, req.IsPublic)
	if err != nil {
		return utils.Error(c, "Failed to create domain", 500)
	}
	return utils.Success(c, domain)
}

func (h *AdminHandler) GetAliases(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)
	// Cap limit at 500 to prevent abuse
	if limit > 500 {
		limit = 500
	}
	stats, err := h.service.GetAliases(limit, offset)
	if err != nil {
		return utils.Error(c, "Failed to fetch aliases", 500)
	}
	return utils.Success(c, fiber.Map{
		"aliases":        stats.Aliases,
		"total":          stats.Total,
		"user_count":     stats.UserCount,
		"anon_count":     stats.AnonCount,
		"disabled_count": stats.DisabledCount,
	})
}

func (h *AdminHandler) DeleteDomain(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.DeleteDomain(id); err != nil {
		return utils.Error(c, "Failed to delete domain", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) DeleteAlias(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.DeleteAlias(id); err != nil {
		return utils.Error(c, "Failed to delete alias", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) TransferAlias(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		NewUserID string `json:"new_user_id"`
	}
	if err := c.BodyParser(&req); err != nil || req.NewUserID == "" {
		return utils.Error(c, "new_user_id required", 400)
	}
	if err := h.service.TransferAlias(id, req.NewUserID); err != nil {
		return utils.Error(c, "Failed to transfer alias", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) ToggleAliasActive(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request", 400)
	}
	if err := h.service.ToggleAliasActive(id, req.IsActive); err != nil {
		return utils.Error(c, "Failed to update alias", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) GetEmails(c *fiber.Ctx) error {
	query := c.Query("q")
	limit := c.QueryInt("limit", 50)
	offset := c.QueryInt("offset", 0)

	emails, total, err := h.service.SearchEmails(query, limit, offset)
	if err != nil {
		return utils.Error(c, "Failed to fetch emails", 500)
	}
	return utils.Success(c, fiber.Map{"emails": emails, "total": total})
}

// GetEmailAliasStats returns all aliases with email count, size, and last activity
func (h *AdminHandler) GetEmailAliasStats(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 20)
	offset := c.QueryInt("offset", 0)
	search := c.Query("search")

	type AliasStats struct {
		ID           string     `json:"id"`
		Email        string     `json:"email"`
		EmailCount   int64      `json:"email_count"`
		TotalSize    int64      `json:"total_size"`
		LastActivity *time.Time `json:"last_activity"`
	}

	var results []AliasStats
	var total int64

	// Base logic for From/Join
	baseFrom := `
		FROM aliases a
		JOIN domains d ON a.domain_id::text = d.id::text
		LEFT JOIN emails e ON e.alias_id::text = a.id::text
		LEFT JOIN email_contents ec ON ec.email_id::text = e.id::text
	`

	whereClause := ""
	var args []interface{}

	if search != "" {
		whereClause = "WHERE CONCAT(a.local_part, '@', d.domain) LIKE ?"
		args = append(args, "%"+search+"%")
	}

	// Count total distinct aliases having emails (with filter)
	countQuery := `
		SELECT COUNT(DISTINCT a.id)
		FROM aliases a
		JOIN domains d ON a.domain_id::text = d.id::text
		JOIN emails e ON e.alias_id::text = a.id::text
	` + whereClause

	if err := database.DB.Raw(countQuery, args...).Scan(&total).Error; err != nil {
		utils.LogError("GetEmailAliasStats count error: %v", err)
		return utils.Error(c, "Failed to count stats", 500)
	}

	// Main Query
	query := `
		SELECT 
			a.id,
			CONCAT(a.local_part, '@', d.domain) as email,
			COALESCE(COUNT(e.id), 0) as email_count,
			COALESCE(SUM(LENGTH(COALESCE(ec.body_text, '') || COALESCE(ec.body_html, ''))), 0) as total_size,
			MAX(e.received_at) as last_activity
	` + baseFrom + whereClause + `
		GROUP BY a.id, a.local_part, d.domain
		HAVING COUNT(e.id) > 0
		ORDER BY last_activity DESC NULLS LAST
		LIMIT ? OFFSET ?
	`

	args = append(args, limit, offset)

	if err := database.DB.Raw(query, args...).Scan(&results).Error; err != nil {
		utils.LogError("GetEmailAliasStats error: %v", err)
		return utils.Error(c, "Failed to fetch alias stats", 500)
	}

	return utils.Success(c, fiber.Map{"aliases": results, "total": total})
}

// GetEmailsByAlias returns all emails for a specific alias email address
func (h *AdminHandler) GetEmailsByAlias(c *fiber.Ctx) error {
	email := c.Query("email")
	if email == "" {
		return utils.Error(c, "Email parameter required", 400)
	}

	type EmailWithBody struct {
		models.Email
		Body string `json:"body"`
	}

	var emails []EmailWithBody

	// Find alias by email and include body
	// Fix: Cast string IDs to UUID or Text for joins
	err := database.DB.Raw(`
		SELECT e.*, COALESCE(ec.body_text, ec.body_html, '') as body
		FROM emails e
		JOIN aliases a ON e.alias_id::text = a.id::text
		JOIN domains d ON a.domain_id::text = d.id::text
		LEFT JOIN email_contents ec ON ec.email_id::text = e.id::text
		WHERE CONCAT(a.local_part, '@', d.domain) = ?
		ORDER BY e.received_at DESC
	`, email).Scan(&emails).Error

	if err != nil {
		utils.LogError("GetEmailsByAlias error: %v", err)
		return utils.Error(c, "Failed to fetch emails", 500)
	}

	return utils.Success(c, fiber.Map{"emails": emails, "total": len(emails)})
}

func (h *AdminHandler) DeleteEmail(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.DeleteEmail(id); err != nil {
		return utils.Error(c, "Failed to delete email", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) TriggerCleanup(c *fiber.Ctx) error {
	var body queue.CleanupOptions
	// Try parsing body, ignore error if empty (use defaults)
	c.BodyParser(&body)

	err := queue.EnqueueCleanup(&body)
	if err != nil {
		utils.LogError("Failed to trigger cleanup: %v", err)
		return utils.Error(c, "Failed to trigger cleanup", 500)
	}

	utils.LogInfo("Manual cleanup triggered by admin (Retention: %d days)", body.RetentionDays)
	return utils.Success(c, fiber.Map{"status": "queued"})
}

func (h *AdminHandler) GetSystemLogs(c *fiber.Ctx) error {
	return utils.Success(c, utils.SystemLogs.Get())
}

// --- Settings ---

func (h *AdminHandler) GetSettings(c *fiber.Ctx) error {
	return utils.Success(c, services.Settings.GetAll())
}

func (h *AdminHandler) UpdateSetting(c *fiber.Ctx) error {
	var body struct {
		Key   string `json:"key"`
		Value string `json:"value"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.Error(c, "Invalid body", 400)
	}

	if err := services.Settings.SetConfig(body.Key, body.Value, "Updated via Admin API"); err != nil {
		return utils.Error(c, "Failed to save setting", 500)
	}

	return utils.Success(c, nil)
}

func (h *AdminHandler) Broadcast(c *fiber.Ctx) error {
	var body struct {
		Message string `json:"message"`
		Type    string `json:"type"` // info, warning, error
	}
	if err := c.BodyParser(&body); err != nil || body.Message == "" {
		return utils.Error(c, "Message required", 400)
	}
	if body.Type == "" {
		body.Type = "info"
	}
	if err := services.Notifications.GlobalBroadcast(body.Type, body.Message); err != nil {
		return utils.Error(c, err.Error(), 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) DeleteNotification(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.Error(c, "ID required", 400)
	}

	if err := services.Notifications.Delete(id); err != nil {
		return utils.Error(c, "Failed to delete notification", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) CreateUser(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.Error(c, "Invalid body", 400)
	}

	if body.Username == "" && body.Email == "" {
		return utils.Error(c, "Username or Email required", 400)
	}
	if body.Password == "" {
		return utils.Error(c, "Password required", 400)
	}

	authService := &services.AuthService{}
	user, err := authService.Register(c.Context(), body.Email, body.Username, body.Password, body.Role)
	if err != nil {
		return utils.Error(c, err.Error(), 500)
	}

	return utils.Success(c, user)
}

func (h *AdminHandler) MigrateUsers(c *fiber.Ctx) error {
	var body struct {
		Path string `json:"path"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.Error(c, "Invalid body", 400)
	}
	if body.Path == "" {
		body.Path = "OLD-Database/auth.db" // Default
	}

	stats, err := services.ImportUsersFromSqlite(body.Path)
	if err != nil {
		return utils.Error(c, err.Error(), 500)
	}

	return utils.Success(c, stats)
}

func (h *AdminHandler) MigrateAliases(c *fiber.Ctx) error {
	var body struct {
		Path string `json:"path"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.Error(c, "Invalid body", 400)
	}
	if body.Path == "" {
		body.Path = "OLD-Database/auth.db" // Default
	}

	stats, err := services.ImportAliasesFromSqlite(body.Path)
	if err != nil {
		return utils.Error(c, err.Error(), 500)
	}

	return utils.Success(c, stats)
}

func (h *AdminHandler) ReplyEmail(c *fiber.Ctx) error {
	var req struct {
		Body    string `json:"body"`
		Subject string `json:"subject"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid Body", 400)
	}

	// 1. Get Original Email to find Recipient
	// ... Actually, we can just accept Recipient in body if frontend provides it,
	// but purely replying to ID is safer/easier context.
	// We need `services.Admin.GetEmail(id)` or direct DB access.
	// Since AdminService handles logic, let's just delegate to it/DB?
	// Handlers should be thin. But I don't have GetEmail exposed in service yet.
	// I'll assume we can pass target email in body for MVP simplicity?
	// Spec says: "Admin reply / forward ANY mail".
	// Let's take "recipient" in body.

	// WAIT, user wants "Reply".
	// If I pass recipient from frontend, it's easier.

	type ReplyReq struct {
		Recipient string `json:"recipient"`
		Subject   string `json:"subject"`
		Body      string `json:"body"`
	}
	var r ReplyReq
	c.BodyParser(&r) // Ignore error, check fields

	if r.Recipient == "" || r.Body == "" {
		return utils.Error(c, "Recipient and Body required", 400)
	}

	if err := services.Outbound.Enqueue("admin@mailhub.local", r.Recipient, r.Subject, r.Body); err != nil {
		return utils.Error(c, "Failed to queue reply", 500)
	}

	return utils.Success(c, fiber.Map{"status": "queued"})
}

// --- Spam Filters ---

func (h *AdminHandler) GetSpamFilters(c *fiber.Ctx) error {
	filters, err := h.service.GetSpamFilters()
	if err != nil {
		return utils.Error(c, "Failed to fetch spam filters", 500)
	}
	return utils.Success(c, filters)
}

func (h *AdminHandler) CreateSpamFilter(c *fiber.Ctx) error {
	var req struct {
		Rule   string `json:"rule"`
		Type   string `json:"type"`   // "subject", "sender", "body"
		Action string `json:"action"` // "reject", "flag"
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request", 400)
	}
	if req.Rule == "" || req.Type == "" {
		return utils.Error(c, "Rule and Type required", 400)
	}
	if req.Action == "" {
		req.Action = "reject"
	}

	filter, err := h.service.CreateSpamFilter(req.Rule, req.Type, req.Action)
	if err != nil {
		return utils.Error(c, "Failed to create filter", 500)
	}
	return utils.Success(c, filter)
}

func (h *AdminHandler) ToggleSpamFilter(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		IsActive bool `json:"is_active"`
	}
	if err := c.BodyParser(&req); err != nil {
		return utils.Error(c, "Invalid request", 400)
	}
	if err := h.service.UpdateSpamFilter(id, req.IsActive); err != nil {
		return utils.Error(c, "Failed to update filter", 500)
	}
	return utils.Success(c, nil)
}

func (h *AdminHandler) DeleteSpamFilter(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.service.DeleteSpamFilter(id); err != nil {
		return utils.Error(c, "Failed to delete filter", 500)
	}
	return utils.Success(c, nil)
}
