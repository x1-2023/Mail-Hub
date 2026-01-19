package services

import (
	"context"
	"errors"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"mailhub/internal/models"
	"mailhub/internal/utils"
	"mailhub/pkg/database"
)

type AuthService struct{}

var JwtSecret []byte

func init() {
	LoadJwtSecret()
}

func LoadJwtSecret() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		JwtSecret = []byte("default_secret_please_change")
	} else {
		JwtSecret = []byte(secret)
	}
}

// Register creates a new user and returns it
func (s *AuthService) Register(ctx context.Context, email, username, password string, role string) (*models.User, error) {
	// 1. Hash Password
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Generate API Key
	apiKey, err := utils.GenerateRandomString(32)
	if err != nil {
		return nil, err
	}
	apiKey = "mh_" + apiKey

	// Handle constraints
	var userUsername *string
	if username != "" {
		userUsername = &username
	}

	// Email handling: Postgres Unique Index on empty string fails if duplicates.
	// If email is empty, we MUST generate a unique dummy.
	// Or we require email.
	if email == "" && username != "" {
		email = username + "@local.user"
	}

	if role == "" {
		role = "user"
	}

	user := &models.User{
		Email:        email,
		Username:     userUsername,
		PasswordHash: string(hashed),
		Role:         role,
		APIKey:       &apiKey,
	}

	// 2. Save DB
	if err := database.DB.Create(user).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return nil, errors.New("email or username already exists")
		}
		return nil, err
	}

	log.Printf("[Auth] Registered user: %s (Role: %s)", email, role)
	return user, nil
}

// Login returns token and user if credentials valid
func (s *AuthService) Login(ctx context.Context, identifier, password string) (string, *models.User, error) {
	var user models.User
	// Find by email OR username
	if err := database.DB.Where("email = ? OR username = ?", identifier, identifier).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil, errors.New("invalid credentials")
		}
		return "", nil, err
	}

	// Verify Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	// Generate Token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(7 * 24 * time.Hour).Unix(),
	})

	t, err := token.SignedString(JwtSecret)
	if err != nil {
		return "", nil, err
	}

	return t, &user, nil
}
