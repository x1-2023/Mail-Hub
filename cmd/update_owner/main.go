package main

import (
	"fmt"
	"log"
	"mailhub/internal/models"
	"mailhub/pkg/database"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Connect to Database
	database.Connect()

	// Find the current owner
	var owner models.User
	if err := database.DB.Where("role = ?", "owner").First(&owner).Error; err != nil {
		log.Fatalf("Error finding owner: %v", err)
	}

	newEmail := "qug2210@gmail.com"
	newPass := "Quang##2022"

	// Hash password
	hashedPass, err := bcrypt.GenerateFromPassword([]byte(newPass), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	// Update owner
	originalEmail := owner.Email
	owner.Email = newEmail
	owner.PasswordHash = string(hashedPass)

	if err := database.DB.Save(&owner).Error; err != nil {
		log.Fatalf("Failed to update owner: %v", err)
	}

	fmt.Printf("✅ Success! Owner updated.\n")
	fmt.Printf("Old Email: %s\n", originalEmail)
	fmt.Printf("New Email: %s\n", newEmail)
	fmt.Printf("Credentials updated successfully.\n")
}
