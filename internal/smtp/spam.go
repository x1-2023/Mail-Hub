package smtp

import (
	"strings"

	"mailhub/internal/models"
	"mailhub/internal/utils"
	"mailhub/pkg/database"
)

// SpamCheckResult contains the result of spam filtering
type SpamCheckResult struct {
	IsSpam bool
	Action string // "reject" or "flag"
	Rule   string // The matched rule
}

// CheckSpam checks if an email matches any active spam filter rules
// Returns (isSpam, action, matchedRule)
func CheckSpam(sender, subject, body string) SpamCheckResult {
	var filters []models.SpamFilter
	if err := database.DB.Where("is_active = ?", true).Find(&filters).Error; err != nil {
		utils.LogError("Error loading spam filters: %v", err)
		return SpamCheckResult{IsSpam: false}
	}

	for _, filter := range filters {
		keyword := strings.ToLower(filter.Rule)
		matched := false

		switch filter.Type {
		case "sender":
			matched = strings.Contains(strings.ToLower(sender), keyword)
		case "subject":
			matched = strings.Contains(strings.ToLower(subject), keyword)
		case "body":
			matched = strings.Contains(strings.ToLower(body), keyword)
		}

		if matched {
			utils.LogInfo("Spam filter matched: rule=%s, type=%s, action=%s", filter.Rule, filter.Type, filter.Action)
			return SpamCheckResult{
				IsSpam: true,
				Action: filter.Action,
				Rule:   filter.Rule,
			}
		}
	}

	return SpamCheckResult{IsSpam: false}
}
