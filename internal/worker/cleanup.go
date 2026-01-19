package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"mailhub/internal/services"
	"mailhub/pkg/database"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"
)

// TaskPayload is empty for cleanup
const (
	TypeCleanup = "maintenance:cleanup"
)

// NewCleanupTask creates a task for cleanup
func NewCleanupTask() *asynq.Task {
	return asynq.NewTask(TypeCleanup, nil)
}

// HandleCleanup runs the SQL jobs in order
func HandleCleanup(ctx context.Context, t *asynq.Task) error {
	log.Println("[Maintenance] Starting Database Cleanup...")
	start := time.Now()

	// Parse Options
	var opts struct {
		RetentionDays int      `json:"retention_days"`
		Targets       []string `json:"targets"`
	}
	if len(t.Payload()) > 0 {
		_ = json.Unmarshal(t.Payload(), &opts)
	}

	// Helper to check if target is enabled
	isTarget := func(name string) bool {
		if len(opts.Targets) == 0 {
			return true // Default: Run All
		}
		for _, t := range opts.Targets {
			if t == name {
				return true
			}
		}
		return false
	}

	// --- Job 1: Anon Mails ---
	if isTarget("anon_mails") {
		condition := "e.expires_at < NOW()"

		// Priority: Payload > Default (Settings logic baked into expires_at, but we can force it)
		// Actually, expires_at IS the source of truth for retention.
		// BUT if we want to "Force Clean" (Payload), we use that.
		// If payload is 0, we trust e.expires_at (which was set by Processor using Settings).
		// So we ONLY override if opts.RetentionDays > 0.

		if opts.RetentionDays > 0 {
			condition = fmt.Sprintf("e.received_at < NOW() - INTERVAL '%d days'", opts.RetentionDays)
		}

		job1 := fmt.Sprintf(`
			WITH victims AS (
				SELECT e.id
				FROM emails e
				LEFT JOIN aliases a ON a.id = e.alias_id
				WHERE e.is_starred = FALSE
					AND %s
					AND (e.alias_id IS NULL OR a.owner_type = 'anonymous')
				LIMIT 1000
			)
			DELETE FROM emails e
			USING victims v
			WHERE e.id = v.id;
		`, condition)

		if err := runBatch(currentDB(), job1, "Anon Mails"); err != nil {
			log.Printf("[Maintenance] Job 1 Failed: %v", err)
		}
	}

	// --- Job 2: User Mails ---
	if isTarget("user_mails") {
		condition := "e.expires_at < NOW()"
		if opts.RetentionDays > 0 {
			condition = fmt.Sprintf("e.received_at < NOW() - INTERVAL '%d days'", opts.RetentionDays)
		}

		job2 := fmt.Sprintf(`
			WITH victims AS (
				SELECT e.id
				FROM emails e
				JOIN aliases a ON a.id = e.alias_id
				WHERE e.is_starred = FALSE
					AND %s
					AND a.owner_type = 'user'
				LIMIT 1000
			)
			DELETE FROM emails e
			USING victims v
			WHERE e.id = v.id;
		`, condition)

		if err := runBatch(currentDB(), job2, "User Mails"); err != nil {
			log.Printf("[Maintenance] Job 2 Failed: %v", err)
		}
	}

	// --- Job 3: Rolling Buffer Reconcile (Q3) ---
	// Target: Any non-starred email that exceeds the per-alias limit (oldest first)
	// Use Window Function to identify victims efficiently.
	limit := services.Settings.GetInt("max_emails_per_alias", 100)
	job3 := fmt.Sprintf(`
		DELETE FROM emails
		WHERE id IN (
			SELECT id FROM (
				SELECT id, ROW_NUMBER() OVER (PARTITION BY alias_id ORDER BY received_at DESC) as rn
				FROM emails
				WHERE is_starred = FALSE
			) sub
			WHERE rn > %d
		);
	`, limit)

	if err := runBatch(currentDB(), job3, "Rolling Buffer Overflow"); err != nil {
		log.Printf("[Maintenance] Job 3 Failed: %v", err)
	}

	// --- Job 4: Unclaimed Aliases ---
	if isTarget("aliases") {
		// Aliases always use creation time, maybe support retention override?
		interval := "7 days"
		if opts.RetentionDays > 0 {
			interval = fmt.Sprintf("%d days", opts.RetentionDays)
		}

		job4 := fmt.Sprintf(`
			WITH victims AS (
				SELECT id
				FROM aliases
				WHERE owner_type = 'anonymous'
					AND claimed_by_user_id IS NULL
					AND created_at < NOW() - INTERVAL '%s'
				LIMIT 100
			)
			DELETE FROM aliases a
			USING victims v
			WHERE a.id = v.id;
		`, interval)

		if err := runBatch(currentDB(), job4, "Unclaimed Aliases"); err != nil {
			log.Printf("[Maintenance] Job 4 Failed: %v", err)
		}
	}

	// --- Job 7: Vacuum (Explicit Trigger Only) ---
	runVacuum := false
	for _, t := range opts.Targets {
		if t == "vacuum" {
			runVacuum = true
			break
		}
	}

	if runVacuum {
		log.Println("[Maintenance] Running VACUUM...")
		// Note: VACUUM cannot run within a transaction block in PostgreSQL
		// GORM's Exec does not start a transaction by default, so this is safe.
		if err := database.DB.Exec("VACUUM").Error; err != nil {
			log.Printf("[Maintenance] Vacuum Failed: %v", err)
		} else {
			log.Println("[Maintenance] Vacuum Completed")
		}
	}

	elapsed := time.Since(start)
	log.Printf("[Maintenance] Cleanup Completed in %s", elapsed)
	return nil
}

func currentDB() *gorm.DB {
	return database.DB
}

func runBatch(db *gorm.DB, query string, name string) error {
	// Execute raw SQL
	result := db.Exec(query)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		log.Printf("[Maintenance] %s: Deleted %d rows", name, result.RowsAffected)
	}
	return nil
}
