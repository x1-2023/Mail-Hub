package smtp

import (
	"regexp"
)

// LegacyBlocklist contains regex patterns for subjects that should be rejected
// during the Orphan Adoption phase.
var LegacyBlocklist = []string{
	`(?i)\d+%\s*OFF`,   // "50% OFF", "10% OFF"
	`(?i)SALE`,         // "SALE"
	`(?i)BLACK FRIDAY`, // "BLACK FRIDAY"
	`(?i)VIAGRA`,       // "VIAGRA"
	`(?i)BITCOIN`,      // "BITCOIN"
	`(?i)CRYPTO`,       // "CRYPTO"
	`(?i)CASINO`,       // "CASINO"
	`(?i)LOTTERY`,      // "LOTTERY"
	`(?i)WINNER`,       // "WINNER"
	`(?i)PRIZE`,        // "PRIZE"
}

// compiledLegacyRules caches the compiled regexes
var compiledLegacyRules []*regexp.Regexp

func init() {
	for _, pattern := range LegacyBlocklist {
		compiledLegacyRules = append(compiledLegacyRules, regexp.MustCompile(pattern))
	}
}

// IsLegacySpam checks if the email content is suspicious enough to reject orphan adoption.
// This is a stricter check than normal spam filters.
func IsLegacySpam(sender, subject, body string) bool {
	// 1. Check Subject against Blocklist Regex (Keywords only)
	for _, re := range compiledLegacyRules {
		if re.MatchString(subject) {
			return true
		}
	}

	return false
}
