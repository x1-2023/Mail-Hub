package database

import (
	"log"
	"os"

	"mailhub/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL not set")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Connected to Database")
}

func Migrate() {
	log.Println("Running Migrations...")
	err := DB.AutoMigrate(
		&models.User{},
		&models.Domain{},
		&models.Alias{},
		&models.Email{},
		&models.EmailContent{},
		&models.SpamFilter{},
		&models.AuditLog{},
		&models.Notification{},
	)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}
	log.Println("Database Migrated Successfully")
}
