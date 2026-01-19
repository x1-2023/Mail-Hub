package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"mailhub/internal/models"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// 1. Load Env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	domainName := "hotmailv.com"
	localPart := "Lokiditto"

	// 2. Find Alias
	var alias models.Alias
	// We join with domains to be sure
	err = db.Joins("JOIN domains ON domains.id = aliases.domain_id").
		Where("aliases.local_part = ? AND domains.domain = ?", localPart, domainName).
		First(&alias).Error

	if err != nil {
		log.Fatalf("Alias %s@%s NOT FOUND. Please create it first in the UI.", localPart, domainName)
	}

	fmt.Printf("Found Alias: %s (Type: %s)\n", alias.LocalPart, alias.OwnerType)

	// 3. Create Email
	emailID := uuid.NewString() // Use new generated UUID
	email := models.Email{
		Base: models.Base{
			ID:        emailID,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		AliasID:    alias.ID,
		Sender:     "test_injector@agent.ai",
		Subject:    "Test Delete (User Alias) 🗑️",
		Snippet:    "This email is for verifying delete on User Aliases...",
		ReceivedAt: time.Now(),
		IsRead:     false,
	}

	if err := db.Create(&email).Error; err != nil {
		log.Fatal("Failed to create email header:", err)
	}

	// 4. Create Content
	content := models.EmailContent{
		EmailID:  emailID,
		BodyText: "Try deleting me! If you can't, it means we forgot the API endpoint for User Aliases.",
		BodyHTML: "<div style='color:blue;'><h1>User Alias Test</h1><p>Try deleting me! If you can't, it means we forgot the API endpoint for User Aliases.</p></div>",
	}

	if err := db.Create(&content).Error; err != nil {
		log.Fatal("Failed to create email content:", err)
	}

	fmt.Printf("✅ Successfully injected message to %s@%s\nMessage ID: %s\n", localPart, domainName, emailID)
}
