package services

import (
	"encoding/json"
	"fmt"
	"log"
	"mailhub/internal/models"
	"mailhub/pkg/database"
	"sync"
	"time"

	"github.com/google/uuid"
)

var Notifications *NotificationService

type NotificationService struct {
	// Active SSE clients: UserID -> []Channel
	clients map[string][]chan string
	mu      sync.RWMutex
}

func InitNotificationService() {
	Notifications = &NotificationService{
		clients: make(map[string][]chan string),
	}
}

// Subscribe returns a channel that receives JSON events
func (s *NotificationService) Subscribe(userID string) chan string {
	s.mu.Lock()
	defer s.mu.Unlock()

	ch := make(chan string, 10)
	s.clients[userID] = append(s.clients[userID], ch)
	log.Printf("[Notify] User %s subscribed (Total clients: %d)", userID, len(s.clients[userID]))
	return ch
}

// Unsubscribe removes a specific channel
func (s *NotificationService) Unsubscribe(userID string, ch chan string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	channels := s.clients[userID]
	for i, c := range channels {
		if c == ch {
			// Remove from list
			s.clients[userID] = append(channels[:i], channels[i+1:]...)
			close(ch)
			break
		}
	}
	if len(s.clients[userID]) == 0 {
		delete(s.clients, userID)
	}
	log.Printf("[Notify] User %s unsubscribed", userID)
}

// Create persists notification and pushes to streaming clients
func (s *NotificationService) Create(userID *string, notifType, message string) error {
	notif := models.Notification{
		Base: models.Base{
			ID: uuid.New().String(),
		},
		UserID:  userID,
		Type:    notifType,
		Message: message,
		IsRead:  false,
	}

	// 1. Save to DB
	if err := database.DB.Create(&notif).Error; err != nil {
		return err
	}

	// 2. Broadcast Realtime
	// 2. Broadcast Realtime
	if userID != nil {
		go s.pushToUser(*userID, &notif)
	}

	return nil
}

// GlobalBroadcast sends to ALL connected users AND persists to DB (System Notification)
func (s *NotificationService) GlobalBroadcast(notifType, message string) error {
	// 1. Persist as Global Notification (UserID = nil)
	// We reuse Create which now handles nil UserID
	if err := s.Create(nil, notifType, message); err != nil {
		return err
	}

	// 2. Broadcast via WebSocket (Ephemeral push for UI update)
	s.mu.RLock()
	defer s.mu.RUnlock()

	payload := map[string]interface{}{
		"id":         "global-" + fmt.Sprint(time.Now().Unix()), // Temporary ID for realtime, real ID in DB
		"type":       notifType,
		"message":    message,
		"is_read":    false,
		"created_at": time.Now(),
		"user_id":    nil, // Explicitly nil
	}

	data, _ := json.Marshal(payload)
	msg := string(data)

	for _, userChans := range s.clients {
		for _, ch := range userChans {
			select {
			case ch <- msg:
			default:
			}
		}
	}
	return nil
}

func (s *NotificationService) pushToUser(userID string, notif *models.Notification) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	channels, ok := s.clients[userID]
	if !ok {
		return
	}

	data, _ := json.Marshal(notif)
	msg := string(data)

	for _, ch := range channels {
		select {
		case ch <- msg:
		default:
			// Channel full, drop?
		}
	}
}

func (s *NotificationService) Delete(id string) error {
	return database.DB.Delete(&models.Notification{}, "id = ?", id).Error
}

func (s *NotificationService) List(userID string) ([]models.Notification, error) {
	var list []models.Notification
	// Fetch User Specific OR Global (UserID is NULL)
	err := database.DB.Where("user_id = ? OR user_id IS NULL", userID).Order("created_at desc").Limit(20).Find(&list).Error
	return list, err
}

func (s *NotificationService) MarkAllRead(userID string) error {
	return database.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}
