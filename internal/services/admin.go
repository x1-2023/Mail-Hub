package services

import (
	"mailhub/internal/models"
	"mailhub/internal/utils"
	"mailhub/pkg/database"
	"runtime"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/shirou/gopsutil/v3/cpu"
	"gorm.io/gorm"
)

type AdminService struct{}

var (
	currCPU     float64
	cpuMutex    sync.RWMutex
	monitorOnce sync.Once
)

func NewAdminService() *AdminService {
	monitorOnce.Do(func() {
		go func() {
			for {
				p, _ := cpu.Percent(time.Second, false)
				if len(p) > 0 {
					cpuMutex.Lock()
					currCPU = p[0]
					cpuMutex.Unlock()
				}
			}
		}()
	})
	return &AdminService{}
}

type DailyCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type SystemHealth struct {
	MemUsage     uint64  `json:"mem_usage"` // MB
	CPUUsage     float64 `json:"cpu_usage"` // %
	NumGoroutine int     `json:"num_goroutine"`
	Uptime       string  `json:"uptime"`
}

type SystemStats struct {
	TotalUsers      int64  `json:"total_users"`
	TotalAliases    int64  `json:"total_aliases"`
	ActiveAliases   int64  `json:"active_aliases"`
	TotalEmails     int64  `json:"total_emails"`
	ActiveDomains   int64  `json:"active_domains"`
	StorageUsed     int64  `json:"storage_used"`
	RetentionPolicy string `json:"retention_policy"`

	// New Fields
	TrafficTrend []DailyCount       `json:"traffic_trend"`
	SystemHealth SystemHealth       `json:"system_health"`
	RecentLogs   []models.SystemLog `json:"recent_logs"`
	TopAliases   []TopAlias         `json:"top_aliases"`
}

type TopAlias struct {
	Email string `json:"email"`
	Count int64  `json:"count"`
}

var startTime = time.Now()

func (s *AdminService) GetStats() (*SystemStats, error) {
	var stats SystemStats

	// Basic Counts
	database.DB.Model(&models.User{}).Count(&stats.TotalUsers)
	database.DB.Model(&models.Alias{}).Count(&stats.TotalAliases)
	database.DB.Model(&models.Alias{}).Where("is_active = ?", true).Count(&stats.ActiveAliases)
	database.DB.Model(&models.Email{}).Count(&stats.TotalEmails)
	database.DB.Model(&models.Domain{}).Count(&stats.ActiveDomains)

	// Storage Used
	var totalSize int64
	database.DB.Model(&models.EmailContent{}).
		Select("COALESCE(SUM(LENGTH(COALESCE(body_text, '') || COALESCE(body_html, ''))), 0)").
		Scan(&totalSize)
	stats.StorageUsed = totalSize

	stats.RetentionPolicy = "Anon: 48h, User: 30d"

	// 1. Traffic Trend (Last 7 Days)
	stats.TrafficTrend = make([]DailyCount, 7)
	for i := 0; i < 7; i++ {
		date := time.Now().AddDate(0, 0, -6+i) // Start from 6 days ago
		startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.Local)
		endOfDay := startOfDay.Add(24 * time.Hour)

		var count int64
		database.DB.Model(&models.Email{}).
			Where("received_at >= ? AND received_at < ?", startOfDay, endOfDay).
			Count(&count)

		stats.TrafficTrend[i] = DailyCount{
			Date:  date.Format("Mon"), // Mon, Tue...
			Count: count,
		}
	}

	// 2. System Health - Real Runtime Stats
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	cpuMutex.RLock()
	valCPU := currCPU
	cpuMutex.RUnlock()

	stats.SystemHealth = SystemHealth{
		MemUsage:     m.Alloc / 1024 / 1024,
		CPUUsage:     valCPU,
		NumGoroutine: runtime.NumGoroutine(),
		Uptime:       time.Since(startTime).Round(time.Minute).String(),
	}

	// 3. Recent Logs
	database.DB.Order("created_at desc").Limit(5).Find(&stats.RecentLogs)

	// 4. Top Aliases (Most Active)
	database.DB.Raw(`
		SELECT 
			CONCAT(a.local_part, '@', d.domain) as email,
			COUNT(e.id) as count
		FROM aliases a
		JOIN domains d ON a.domain_id::text = d.id::text
		JOIN emails e ON e.alias_id::text = a.id::text
		GROUP BY a.id, a.local_part, d.domain
		ORDER BY count DESC
		LIMIT 5
	`).Scan(&stats.TopAliases)

	return &stats, nil
}

func (s *AdminService) GetUsers(limit, offset int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	db := database.DB.Model(&models.User{})
	db.Count(&total)

	err := db.Limit(limit).Offset(offset).Order("created_at desc").Find(&users).Error
	return users, total, err
}

func (s *AdminService) GetDomains() ([]models.Domain, error) {
	var domains []models.Domain
	err := database.DB.Find(&domains).Error
	return domains, err
}

func (s *AdminService) CreateDomain(domain string, isPublic bool) (*models.Domain, error) {
	d := &models.Domain{
		Base: models.Base{
			ID: uuid.New().String(),
		},
		Domain:   domain,
		IsPublic: isPublic,
	}
	err := database.DB.Create(d).Error
	return d, err
}

type AliasStats struct {
	Aliases       []models.Alias
	Total         int64
	UserCount     int64
	AnonCount     int64
	DisabledCount int64
}

func (s *AdminService) GetAliases(limit, offset int) (*AliasStats, error) {
	var aliases []models.Alias
	stats := &AliasStats{}

	db := database.DB.Model(&models.Alias{}).Preload("Domain").Preload("User").Preload("ClaimedByUser")
	db.Count(&stats.Total)

	// Count by type
	database.DB.Model(&models.Alias{}).Where("owner_type = ?", "user").Count(&stats.UserCount)
	database.DB.Model(&models.Alias{}).Where("owner_type = ?", "anonymous").Count(&stats.AnonCount)
	database.DB.Model(&models.Alias{}).Where("is_active = ?", false).Count(&stats.DisabledCount)

	err := db.Limit(limit).Offset(offset).Order("created_at desc").Find(&aliases).Error
	stats.Aliases = aliases
	return stats, err
}

func (s *AdminService) DeleteUser(id string) error {
	return database.DB.Delete(&models.User{}, "id = ?", id).Error
}

func (s *AdminService) DeleteDomain(id string) error {
	return database.DB.Transaction(func(tx *gorm.DB) error {
		// Use Unscoped() to HARD DELETE everything to clear "ghost" data

		// 1. Get Alias IDs linked to this domain (including soft deleted ones)
		var aliasIDs []string
		if err := tx.Unscoped().Model(&models.Alias{}).Where("domain_id = ?", id).Pluck("id", &aliasIDs).Error; err != nil {
			utils.LogError("DeleteDomain: Failed to fetch aliases: %v", err)
			return err
		}

		if len(aliasIDs) > 0 {
			// 2. Get Email IDs linked to these aliases
			var emailIDs []string
			if err := tx.Unscoped().Model(&models.Email{}).Where("alias_id IN ?", aliasIDs).Pluck("id", &emailIDs).Error; err != nil {
				utils.LogError("DeleteDomain: Failed to fetch emails: %v", err)
				return err
			}

			if len(emailIDs) > 0 {
				// 3. Delete Email Contents
				if err := tx.Unscoped().Where("email_id IN ?", emailIDs).Delete(&models.EmailContent{}).Error; err != nil {
					utils.LogError("DeleteDomain: Failed to delete contents: %v", err)
					return err
				}

				// 4. Delete Emails
				if err := tx.Unscoped().Where("id IN ?", emailIDs).Delete(&models.Email{}).Error; err != nil {
					utils.LogError("DeleteDomain: Failed to delete emails: %v", err)
					return err
				}
			}

			// 5. Delete Aliases
			if err := tx.Unscoped().Where("id IN ?", aliasIDs).Delete(&models.Alias{}).Error; err != nil {
				utils.LogError("DeleteDomain: Failed to delete aliases: %v", err)
				return err
			}
		}

		// 6. Delete the Domain
		if err := tx.Unscoped().Delete(&models.Domain{}, "id = ?", id).Error; err != nil {
			utils.LogError("DeleteDomain: Failed to delete domain: %v", err)
			return err
		}
		return nil
	})
}

func (s *AdminService) DeleteAlias(id string) error {
	return database.DB.Delete(&models.Alias{}, "id = ?", id).Error
}

// TransferAlias transfers a single alias to a different user
func (s *AdminService) TransferAlias(aliasID, newUserID string) error {
	updates := map[string]interface{
		"user_id":            newUserID,
		"owner_type":         "user",
		"claimed_by_user_id": newUserID,
		"expires_at":         gorm.Expr("NULL"), // Unset expiration for user aliases
	}
	return database.DB.Model(&models.Alias{}).Where("id = ?", aliasID).Updates(updates).Error
}

// TransferAliases transfers multiple aliases to a different user (Bulk)
func (s *AdminService) TransferAliases(aliasIDs []string, newUserID string) error {
	if len(aliasIDs) == 0 {
		return nil
	}
	updates := map[string]interface{
		"user_id":            newUserID,
		"owner_type":         "user",
		"claimed_by_user_id": newUserID,
		"expires_at":         gorm.Expr("NULL"),
	}
	// Use IN clause for bulk update
	return database.DB.Model(&models.Alias{}).Where("id IN ?", aliasIDs).Updates(updates).Error
}

// ToggleAliasActive enables or disables an alias
func (s *AdminService) ToggleAliasActive(aliasID string, isActive bool) error {
	return database.DB.Model(&models.Alias{}).Where("id = ?", aliasID).Update("is_active", isActive).Error
}

func (s *AdminService) SearchEmails(query string, limit, offset int) ([]models.Email, int64, error) {
	var emails []models.Email
	var total int64

	db := database.DB.Model(&models.Email{})

	if query != "" {
		likeQuery := "%" + query + "%"
		// Using 'LIKE' assuming dev/postgres compatibility. For strict case-insensitive in PG use ILIKE
		db = db.Where("subject LIKE ? OR sender LIKE ?", likeQuery, likeQuery)
	}

	db.Count(&total)
	err := db.Limit(limit).Offset(offset).Order("received_at desc").Find(&emails).Error
	return emails, total, err
}

func (s *AdminService) DeleteEmail(id string) error {
	return database.DB.Delete(&models.Email{}, "id = ?", id).Error
}

// --- Spam Filters ---

func (s *AdminService) GetSpamFilters() ([]models.SpamFilter, error) {
	var filters []models.SpamFilter
	err := database.DB.Order("created_at desc").Find(&filters).Error
	return filters, err
}

func (s *AdminService) CreateSpamFilter(rule, filterType, action string) (*models.SpamFilter, error) {
	filter := &models.SpamFilter{
		Base: models.Base{
			ID: uuid.New().String(),
		},
		Rule:     rule,
		Type:     filterType,
		Action:   action,
		IsActive: true,
	}
	err := database.DB.Create(filter).Error
	return filter, err
}

func (s *AdminService) UpdateSpamFilter(id string, isActive bool) error {
	return database.DB.Model(&models.SpamFilter{}).Where("id = ?", id).Update("is_active", isActive).Error
}

func (s *AdminService) DeleteSpamFilter(id string) error {
	return database.DB.Delete(&models.SpamFilter{}, "id = ?", id).Error
}
