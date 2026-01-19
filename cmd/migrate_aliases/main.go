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

	// Find first admin user
	var admin models.User
	if err := database.DB.Where("role = ?", "admin").First(&admin).Error; err != nil {
		log.Fatal("No admin user found:", err)
	}

	fmt.Printf("Found admin user: %s (ID: %s)\n", admin.Email, admin.ID)

	// Count orphan aliases
	var orphanCount int64
	database.DB.Model(&models.Alias{}).Where("user_id IS NULL").Count(&orphanCount)
	fmt.Printf("Found %d aliases without owner\n", orphanCount)

	if orphanCount == 0 {
		fmt.Println("No orphan aliases to update. Done!")
		return
	}

	// Update all aliases without owner
	result := database.DB.Model(&models.Alias{}).
		Where("user_id IS NULL").
		Updates(map[string]interface{}{
			"user_id":            admin.ID,
			"owner_type":         "user",
			"claimed_by_user_id": admin.ID,
			"expires_at":         nil,
		})

	if result.Error != nil {
		log.Fatal("Update failed:", result.Error)
	}

	fmt.Printf("✅ Updated %d aliases. Owner set to admin user: %s\n", result.RowsAffected, admin.Email)
}
