package main

import (
	"fmt"
	"log"
	"mailhub/internal/models"
	"mailhub/pkg/database"
	"os"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// 1. Load Env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env")
	}

	// 2. Connect DB
	database.Connect()

	email := "admin@mailhub.dev"
	password := "admin123"

	// 3. Hash Password
	hashed, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

	// 4. Create User
	user := models.User{
		Email:        email,
		PasswordHash: string(hashed),
		Role:         "admin",
	}

	// Upsert (On Conflict Do Nothing) is hard with GORM generic, so check exist
	var count int64
	database.DB.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		fmt.Println("⚠️ Admin already exists.")
		// Update password to be sure?
		// database.DB.Model(&models.User{}).Where("email = ?", email).Update("password_hash", string(hashed))
		// fmt.Println("✅ Reset Admin password to 'admin123'")
	} else {
		if err := database.DB.Create(&user).Error; err != nil {
			panic(err)
		}
		fmt.Printf("✅ Admin Created: %s / %s\n", email, password)
	}

	// 5. Ensure System Domain Exists
	systemDomain := os.Getenv("DOMAIN")
	if systemDomain == "" {
		log.Fatal("DOMAIN env is required")
	}
	var domainCount int64
	database.DB.Model(&models.Domain{}).Where("domain = ?", systemDomain).Count(&domainCount)
	if domainCount == 0 {
		sysDomain := models.Domain{
			Domain:   systemDomain,
			IsPublic: true,
		}
		database.DB.Create(&sysDomain)
		fmt.Printf("✅ System Domain '%s' created.\n", systemDomain)
	}

	fmt.Println("🎉 Database Seeded Successfully.")
	os.Exit(0)
}
