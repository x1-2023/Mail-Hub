package utils

import (
	"fmt"
	"time"

	"mailhub/internal/models"
	"mailhub/pkg/database"
)

// LogEntry represents a single log line (for UI)
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
}

// LogBuffer is preserved for interface compatibility but uses DB now
type LogBuffer struct{}

var SystemLogs = &LogBuffer{}

func (l *LogBuffer) Add(level, msg string) {
	// Not used directly, use LogInfo/LogError
}

func (l *LogBuffer) Get() []LogEntry {
	if database.DB == nil {
		return []LogEntry{}
	}
	var logs []models.SystemLog
	var entries []LogEntry

	database.DB.Order("created_at desc").Limit(200).Find(&logs)

	for _, log := range logs {
		entries = append(entries, LogEntry{
			Timestamp: log.CreatedAt,
			Level:     log.Level,
			Message:   log.Message,
		})
	}
	return entries
}

// Global helper to log and store
func LogInfo(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	fmt.Println("[INFO]", msg)
	persistLog("INFO", msg)
}

func LogError(format string, args ...interface{}) {
	msg := fmt.Sprintf(format, args...)
	fmt.Println("[ERROR]", msg)
	persistLog("ERROR", msg)
}

func persistLog(level, msg string) {
	if database.DB == nil {
		return
	}
	// Async insert to not block
	go func() {
		database.DB.Create(&models.SystemLog{
			Level:   level,
			Message: msg,
			Source:  "system",
		})
	}()
}
