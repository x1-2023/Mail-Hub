package main

import (
	"log"
	"net"
	"os"

	"mailhub/internal/models"
	"mailhub/internal/queue"
	"mailhub/internal/smtp"
	"mailhub/internal/utils"
	"mailhub/pkg/database"

	"github.com/joho/godotenv"
)

// Basic TCP SMTP Listener
func main() {
	if err := godotenv.Load(); err != nil {
		utils.LogInfo("No .env file found")
	}

	// Init DB for Validation
	database.Connect()
	// Auto migrate logs
	database.DB.AutoMigrate(&models.SystemLog{})
	queue.Init()

	port := os.Getenv("SMTP_PORT")
	if port == "" {
		port = "2525" // Default to 2525 for dev (non-root)
	}

	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("Failed to listen on port %s: %v", port, err)
	}

	utils.LogInfo("SMTP Server listening on :%s", port)

	for {
		conn, err := listener.Accept()
		if err != nil {
			utils.LogError("Error accepting connection: %v", err)
			continue
		}
		go smtp.HandleConnection(conn)
	}
}
