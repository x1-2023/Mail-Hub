package main

import (
	"log"
	"os"

	"mailhub/internal/handlers"
	"mailhub/internal/middleware"
	"mailhub/internal/models"
	"mailhub/internal/queue"
	"mailhub/internal/services"
	"mailhub/internal/utils"
	"mailhub/pkg/database"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load Env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env")
	}
	services.LoadJwtSecret()

	// 2. Connect DB
	database.Connect()
	database.DB.AutoMigrate(
		&models.User{},
		&models.Domain{},
		&models.Alias{},
		&models.Email{},
		&models.EmailContent{},
		&models.SystemSetting{},
		&models.Notification{},
		&models.SystemLog{},
		&models.OutboundMessage{},
	)

	// Services
	services.InitSettingsService()
	services.Settings.InitializeDefaults()
	services.InitNotificationService()
	services.InitOutboundService(os.Getenv("REDIS_ADDR"))

	queue.Init()
	defer queue.Close()

	// 3. Setup Fiber
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return utils.Error(c, err.Error(), 500)
		},
	})

	app.Use(logger.New())
	app.Use(cors.New())
	app.Use(recover.New())

	// 4. Routes
	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return utils.Success(c, fiber.Map{"status": "ok", "service": "api"})
	})

	// Auth Routes
	authHandler := handlers.NewAuthHandler()
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)

	// Anon Routes
	anonHandler := handlers.NewAnonHandler()
	mailHandler := handlers.NewMailHandler()

	anon := api.Group("/anon")
	anon.Post("/address", middleware.OptionalAuth(), anonHandler.CreateAddress)
	anon.Get("/domains", anonHandler.GetDomains)
	anon.Get("/config", anonHandler.GetPublicConfig)
	anon.Get("/messages", middleware.AnonProtected(), mailHandler.GetMessages)
	anon.Get("/messages/:id", middleware.AnonProtected(), mailHandler.GetMessageContent)
	anon.Delete("/messages/:id", middleware.AnonProtected(), mailHandler.DeleteMessage)
	anon.Put("/messages/:id/star", middleware.AnonProtected(), mailHandler.StarMessage)

	// Public Routes (No Auth, restricted logic)
	public := api.Group("/public")
	public.Get("/messages", mailHandler.GetPublicMessages)

	// Admin Routes
	adminHandler := handlers.NewAdminHandler()
	admin := api.Group("/admin", middleware.AdminProtected())
	admin.Get("/stats", adminHandler.GetStats)
	admin.Get("/users", adminHandler.GetUsers)
	admin.Post("/users", adminHandler.CreateUser)               // Create
	admin.Post("/users/migrate", adminHandler.MigrateUsers)     // Migration
	admin.Post("/aliases/migrate", adminHandler.MigrateAliases) // Aliases Migration
	admin.Delete("/users/:id", adminHandler.DeleteUser)
	admin.Put("/users/:id/role", adminHandler.ChangeUserRole)
	admin.Get("/domains", adminHandler.GetDomains)
	admin.Post("/domains", adminHandler.CreateDomain)
	admin.Get("/aliases", adminHandler.GetAliases)
	admin.Delete("/aliases/:id", adminHandler.DeleteAlias)
	admin.Post("/aliases/:id/transfer", adminHandler.TransferAlias)
	admin.Put("/aliases/:id/toggle", adminHandler.ToggleAliasActive)
	admin.Get("/emails", adminHandler.GetEmails)
	admin.Get("/emails/aliases", adminHandler.GetEmailAliasStats) // New: Alias stats
	admin.Get("/emails/by-alias", adminHandler.GetEmailsByAlias)  // New: Emails by alias
	admin.Delete("/emails/:id", adminHandler.DeleteEmail)
	admin.Post("/emails/reply", adminHandler.ReplyEmail)

	admin.Post("/cleanup", adminHandler.TriggerCleanup)
	admin.Get("/logs", adminHandler.GetSystemLogs)
	admin.Post("/announcements", adminHandler.Broadcast)
	admin.Delete("/announcements/:id", adminHandler.DeleteNotification)

	// Owner-only routes (Settings)
	owner := api.Group("/admin", middleware.OwnerProtected())
	owner.Get("/settings", adminHandler.GetSettings)
	owner.Put("/settings", adminHandler.UpdateSetting)

	// Spam Filters
	admin.Get("/spam", adminHandler.GetSpamFilters)
	admin.Post("/spam", adminHandler.CreateSpamFilter)
	admin.Put("/spam/:id", adminHandler.ToggleSpamFilter)
	admin.Delete("/spam/:id", adminHandler.DeleteSpamFilter)

	// Notification Routes
	notifHandler := handlers.NewNotificationHandler()
	notif := api.Group("/notifications", middleware.Protected())
	notif.Get("/stream", notifHandler.StreamSSE)
	notif.Get("/", notifHandler.List)
	notif.Post("/read-all", notifHandler.MarkRead)

	// User Settings Routes
	userHandler := handlers.NewUserHandler()
	me := api.Group("/me", middleware.Protected())
	me.Post("/password", userHandler.ChangePassword)
	me.Get("/api-key", userHandler.GetAPIKey)
	me.Post("/api-key/rotate", userHandler.RotateAPIKey)

	// User Alias Routes (for logged-in users to manage their own aliases)
	aliasHandler := handlers.NewAliasHandler()
	aliases := api.Group("/aliases", middleware.Protected())
	aliases.Get("/", aliasHandler.GetUserAliases)
	aliases.Post("/", aliasHandler.CreateUserAlias)
	aliases.Delete("/:id", aliasHandler.DeleteUserAlias)

	// User Message Routes (Global access for owned aliases)
	messages := api.Group("/messages", middleware.Protected())
	messages.Delete("/:id", mailHandler.DeleteMessage)
	messages.Put("/:id/star", mailHandler.StarMessage)

	// ---------------------------------------------------------
	// Static File Serving (SPA Support for All-in-One Docker)
	// ---------------------------------------------------------
	if _, err := os.Stat("./public"); err == nil {
		log.Println("Serving static files from ./public")
		app.Static("/", "./public")

		// SPA Fallback: Any 404 on non-API routes -> index.html
		app.Use(func(c *fiber.Ctx) error {
			// Skip API routes (let them 404 normally if not found)
			if c.Path()[:4] == "/api" {
				return c.Next()
			}
			return c.SendFile("./public/index.html")
		})
	}

	// 5. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting API Server on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
