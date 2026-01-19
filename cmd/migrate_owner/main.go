package main

import (
	"fmt"
	"log"

	"mailhub/internal/models"
	"mailhub/pkg/database"

	"github.com/joho/godotenv"
)

func main() {
	// Load env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect to DB
	database.Connect()

	// Check if owner already exists
	var ownerCount int64
	database.DB.Model(&models.User{}).Where("role = ?", "owner").Count(&ownerCount)
	if ownerCount > 0 {
		fmt.Println("Owner already exists. Migration not needed.")
		return
	}

	// Find the first admin (by created_at)
	var firstAdmin models.User
	if err := database.DB.Where("role = ?", "admin").Order("created_at asc").First(&firstAdmin).Error; err != nil {
		log.Fatal("No admin user found to promote:", err)
	}

	fmt.Printf("Found first admin: %s (ID: %s)\n", firstAdmin.Email, firstAdmin.ID)

	// Promote to owner
	if err := database.DB.Model(&firstAdmin).Update("role", "owner").Error; err != nil {
		log.Fatal("Failed to update role:", err)
	}

	fmt.Printf("✅ Promoted %s to OWNER!\n", firstAdmin.Email)
}
