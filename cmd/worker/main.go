package main

import (
	"context"
	"log"
	"os"
	"time"

	"mailhub/internal/queue"
	"mailhub/internal/services"
	"mailhub/internal/worker"
	"mailhub/pkg/database"

	"github.com/hibiken/asynq"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load Env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// 2. Connect DB
	database.Connect()
	services.InitSettingsService() // Load settings for worker usage
	queue.Init()
	// 3. Setup Asynq Server
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	// 4. Setup Asynq Server (to process tasks)
	srv := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 5,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
		},
	)

	mux := asynq.NewServeMux()
	mux.HandleFunc("email:process", worker.HandleEmailTask)
	mux.HandleFunc(worker.TypeCleanup, worker.HandleCleanup)

	// 5. Setup Scheduler (to enqueue periodic tasks)
	scheduler := asynq.NewScheduler(
		asynq.RedisClientOpt{Addr: redisAddr},
		&asynq.SchedulerOpts{
			Location: time.UTC,
		},
	)

	// Run every 5 minutes
	if _, err := scheduler.Register("@every 5m", worker.NewCleanupTask()); err != nil {
		log.Fatal("Could not register cleanup task: ", err)
	}

	// Run Scheduler in background
	go func() {
		log.Println("Starting Scheduler...")
		if err := scheduler.Run(); err != nil {
			log.Fatal("Could not start scheduler: ", err)
		}
	}()

	log.Println("Starting Worker Service...")
	if err := srv.Run(mux); err != nil {
		log.Fatal("Could not start worker server: ", err)
	}
}

func handleEmailTask(ctx context.Context, t *asynq.Task) error {
	log.Printf("Processing Email Task: %s", t.Type())

	// TODO: Parse MIME, Store to DB, Push SSE
	// This is where the heavy lifting happens "Lazy Content"

	return nil
}
