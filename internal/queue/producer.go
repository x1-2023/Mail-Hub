package queue

import (
	"encoding/json"
	"log"
	"os"

	"github.com/hibiken/asynq"
)

var Client *asynq.Client

func Init() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")

	Client = asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr, Password: redisPassword})
	log.Println("Initialized Asynq Client")
}

func Close() {
	if Client != nil {
		Client.Close()
	}
}

// EnqueueEmailTask creates a task to process an incoming email
func EnqueueEmailTask(rawMime []byte, sender, rcpt string) error {
	payload := map[string]string{
		"mime":   string(rawMime),
		"sender": sender,
		"rcpt":   rcpt,
	}

	// Serialize Payload
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	task := asynq.NewTask("email:process", payloadBytes, asynq.MaxRetry(3))

	if _, err := Client.Enqueue(task); err != nil {
		return err
	}
	return nil
}

// CleanupOptions defines manual override settings
type CleanupOptions struct {
	RetentionDays int      `json:"retention_days"` // 0 = use default expires_at logic
	Targets       []string `json:"targets"`        // "anon_mails", "user_mails", "orphans"
}

// EnqueueCleanup creates a task to run maintenance
func EnqueueCleanup(opts *CleanupOptions) error {
	var payload []byte
	if opts != nil {
		var err error
		payload, err = json.Marshal(opts)
		if err != nil {
			return err
		}
	}

	task := asynq.NewTask("maintenance:cleanup", payload)
	if _, err := Client.Enqueue(task); err != nil {
		return err
	}
	return nil
}
