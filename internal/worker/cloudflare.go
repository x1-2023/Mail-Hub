package worker

import (
	"context"
	"log"

	"mailhub/internal/services"

	"github.com/hibiken/asynq"
)

const (
	TypeCloudflareSync = "cloudflare:sync"
)

func NewCloudflareSyncTask() *asynq.Task {
	return asynq.NewTask(TypeCloudflareSync, nil)
}

func HandleCloudflareSync(ctx context.Context, t *asynq.Task) error {
	log.Println("[Cloudflare] Starting DNS IP Sync...")
	
	cfService := services.NewCloudflareService()
	err := cfService.SyncAllIPs()
	if err != nil {
		log.Printf("[Cloudflare] DNS IP Sync failed: %v", err)
		return err
	}
	
	log.Println("[Cloudflare] DNS IP Sync completed successfully")
	return nil
}
