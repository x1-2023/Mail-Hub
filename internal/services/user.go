package services

import (
	"errors"
	"mailhub/internal/models"
	"mailhub/internal/utils"
	"mailhub/pkg/database"

	"golang.org/x/crypto/bcrypt"
)

type UserService struct{}

func NewUserService() *UserService {
	return &UserService{}
}

func (s *UserService) ChangePassword(userID, oldPassword, newPassword string) error {
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return err
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(oldPassword)); err != nil {
		return errors.New("incorrect old password")
	}

	// Hash new password
	hashed, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user.PasswordHash = string(hashed)
	return database.DB.Save(&user).Error
}

func (s *UserService) GetAPIKey(userID string) (string, error) {
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return "", err
	}

	if user.APIKey != nil {
		return *user.APIKey, nil
	}

	// Generate if missing
	newKey, err := utils.GenerateRandomString(32) // 64 hex chars
	if err != nil {
		return "", err
	}

	// Prefix for identification
	key := "mh_" + newKey
	user.APIKey = &key
	if err := database.DB.Save(&user).Error; err != nil {
		return "", err
	}

	return *user.APIKey, nil
}

func (s *UserService) RotateAPIKey(userID string) (string, error) {
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		return "", err
	}

	newKey, err := utils.GenerateRandomString(32)
	if err != nil {
		return "", err
	}

	key := "mh_" + newKey
	user.APIKey = &key
	if err := database.DB.Save(&user).Error; err != nil {
		return "", err
	}

	return *user.APIKey, nil
}
