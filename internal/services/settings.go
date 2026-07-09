package services

import (
	"log"
	"mailhub/internal/models"
	"mailhub/pkg/database"
	"strconv"
	"sync"
	"time"
)

var Settings *SettingsService

type SettingsService struct {
	cache sync.Map
}

func InitSettingsService() {
	log.Println("Initializing Settings Service...")
	Settings = &SettingsService{}
	Settings.LoadAll()
}

// LoadAll reads all settings from DB into cache
func (s *SettingsService) LoadAll() {
	var settings []models.SystemSetting
	if err := database.DB.Find(&settings).Error; err != nil {
		log.Printf("Failed to load settings: %v", err)
		return
	}
	for _, setting := range settings {
		s.cache.Store(setting.Key, setting.Value)
	}
	log.Printf("Loaded %d system settings", len(settings))
}

// GetString returns value or default
func (s *SettingsService) GetString(key string, defaultVal string) string {
	if val, ok := s.cache.Load(key); ok {
		return val.(string)
	}
	return defaultVal
}

// GetInt returns parsed int or default
func (s *SettingsService) GetInt(key string, defaultVal int) int {
	valStr := s.GetString(key, "")
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

// SetConfig updates DB and Cache
func (s *SettingsService) SetConfig(key string, value string, description string) error {
	setting := models.SystemSetting{
		Key:         key,
		Value:       value,
		Description: description,
		UpdatedAt:   time.Now(),
	}

	if err := database.DB.Save(&setting).Error; err != nil {
		return err
	}

	s.cache.Store(key, value)
	return nil
}

// GetAll returns all settings map
func (s *SettingsService) GetAll() map[string]string {
	m := make(map[string]string)
	s.cache.Range(func(key, value any) bool {
		m[key.(string)] = value.(string)
		return true
	})
	return m
}

// InitializeDefaults ensures critical keys exist
func (s *SettingsService) InitializeDefaults() {
	defaults := map[string]string{
		"max_aliases_per_user":   "10",
		"max_emails_per_alias":   "100",
		"star_cap_per_user":      "50",
		"anon_retention_hours":   "24",
		"user_retention_days":    "30",
		"rolling_buffer_enabled": "true",
		"donate_bank_name":       "MBBank",
		"donate_account_number":  "9999999999",
		"donate_account_name":    "MAILHUB DONATE",
		"donate_message":         "Mọi sự đóng góp đều giúp chúng tôi duy trì server và phát triển tính năng mới.",
		"allow_legacy_adoption":  "false",
		"cf_api_token":           "",
	}

	for k, v := range defaults {
		if _, ok := s.cache.Load(k); !ok {
			// Not found in cache (so likely not in DB), set it
			if err := s.SetConfig(k, v, "Default Value"); err != nil {
				log.Printf("Failed to init default setting %s: %v", k, err)
			}
		}
	}
}
