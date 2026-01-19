package main

import (
	"log"
	"time"

	"mailhub/internal/models"
	"mailhub/pkg/database"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()
	database.Connect()

	aliasID := "a43cad86-4280-4d9b-97be-8cb6e4f16c22" // usertest_1768778879@hotmailv.com
	emailID := uuid.NewString()

	email := models.Email{
		AliasID:    aliasID,
		Sender:     "sender@example.com",
		Subject:    "Test Email via API Key",
		Snippet:    "This is a test message sent via database injection...",
		ReceivedAt: time.Now(),
	}
	email.ID = emailID

	if err := database.DB.Create(&email).Error; err != nil {
		log.Fatalf("Failed to create email: %v", err)
	}

	content := models.EmailContent{
		EmailID:  emailID,
		BodyText: "This is the plain text body of the test email.",
		BodyHTML: "<h1>Test Email</h1><p>This is the HTML body of the test email.</p>",
	}
	database.DB.Create(&content)

	log.Printf("✓ Injected Email ID: %s for Alias: %s", emailID, aliasID)
}
