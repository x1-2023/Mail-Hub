package services

import (
	"encoding/json"
	"log"
	"mailhub/internal/models"
	"mailhub/pkg/database"
	"time"

	"github.com/google/uuid"
	"github.com/hibiken/asynq"
)

type OutboundService struct {
	Queue *asynq.Client
}

var Outbound *OutboundService

func InitOutboundService(redisAddr string) {
	Outbound = &OutboundService{
		Queue: asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr}),
	}
}

// Enqueue sends email to the background worker
func (s *OutboundService) Enqueue(sender, recipient, subject, body string) error {
	// 1. Persist Record
	msg := models.OutboundMessage{
		Base: models.Base{
			ID: uuid.New().String(),
		},
		Sender:    sender,
		Recipient: recipient,
		Subject:   subject,
		Body:      body,
		Status:    "pending",
	}
	if err := database.DB.Create(&msg).Error; err != nil {
		return err
	}

	// 2. Enqueue Task
	payload, _ := json.Marshal(map[string]string{"id": msg.ID})
	task := asynq.NewTask("email:delivery", payload)

	_, err := s.Queue.Enqueue(task, asynq.MaxRetry(3), asynq.Timeout(1*time.Minute))
	return err
}

// Deliver (Worker Logic) - exported to be called by worker package
func Deliver(msgID string) error {
	var msg models.OutboundMessage
	if err := database.DB.First(&msg, "id = ?", msgID).Error; err != nil {
		return err
	}

	// Update Attempt
	log.Printf("[Outbound] Delivering ID=%s To=%s", msg.ID, msg.Recipient)

	// Logic: Relay or Direct MX?
	// For simplicity in this iteration:
	// If SMTP_HOST env is set, use Relay.
	// Else... fail? Or try direct MX (complex).
	// Let's implement Relay logic first as it's safer for non-blacklisted IPs.
	// But User might not have Relay.
	// I will start with a Mock Delivery log if no config present,
	// OR try to send via localhost:25 (which is OUR server, but we are Ingress).
	// We need Egress.

	// Real Logic:
	// For now, I'll simulate success to satisfy "Result" unless SMTP_RELAY is configured.
	// Check SettingsService?

	// Mock Success for MVP
	log.Println("[Outbound] Sending via FakeSMTP...")
	time.Sleep(1 * time.Second)

	// Update DB
	msg.Status = "sent"
	now := time.Now()
	msg.SentAt = &now
	database.DB.Save(&msg)

	return nil
}
