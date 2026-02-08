package models

import (
	"time"

	"gorm.io/gorm"
)

type Base struct {
	ID        string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type User struct {
	Base
	Email        string  `gorm:"uniqueIndex" json:"email"`
	Username     *string `gorm:"uniqueIndex" json:"username,omitempty"`
	PasswordHash string  `gorm:"column:password_hash" json:"-"`  // SSO: mapped to password_hash column
	Role         string  `json:"role"`                           // SSO: "OWNER", "ADMIN", "USER"
	TokenVersion int     `gorm:"default:0" json:"token_version"` // SSO: increment to revoke all tokens
	Status       string  `gorm:"default:ACTIVE" json:"status"`   // SSO: "ACTIVE", "BANNED"
	APIKey       *string `gorm:"uniqueIndex" json:"api_key"`

	Aliases []Alias `json:"aliases,omitempty"`
}

type Domain struct {
	Base
	Domain   string  `gorm:"uniqueIndex" json:"domain"`
	IsPublic bool    `json:"is_public"`
	OwnerID  *string `json:"owner_id"` // Nullable for system domains
}

type Alias struct {
	Base
	LocalPart string  `gorm:"index" json:"local_part"`
	DomainID  string  `json:"domain_id"`
	Domain    Domain  `json:"domain"`
	UserID    *string `json:"user_id"` // Nullable (Anon)
	User      *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`

	// Cleanup Logic
	OwnerType       string  `gorm:"default:'user';index" json:"owner_type"` // "user", "anonymous"
	ClaimedByUserID *string `gorm:"index" json:"claimed_by_user_id"`
	ClaimedByUser   *User   `gorm:"foreignKey:ClaimedByUserID" json:"claimed_by_user,omitempty"`

	IsActive  bool       `json:"is_active"`
	ExpiresAt *time.Time `json:"expires_at"` // For Anon
}

type Email struct {
	Base
	AliasID     string    `gorm:"index" json:"alias_id"`
	Sender      string    `json:"sender"`
	Subject     string    `json:"subject"`
	Snippet     string    `json:"snippet"`
	IsRead      bool      `json:"is_read"`
	IsStarred   bool      `json:"is_starred"`
	ReceivedAt  time.Time `gorm:"index" json:"received_at"`
	Fingerprint string    `gorm:"index" json:"fingerprint"`

	// Cleanup Logic
	ExpiresAt    *time.Time `gorm:"index" json:"expires_at"`
	RawExpiresAt *time.Time `gorm:"index" json:"raw_expires_at"`
}

type EmailContent struct {
	EmailID  string `gorm:"type:uuid;primaryKey;constraint:OnDelete:CASCADE;" json:"email_id"` // Add Cascade Delete
	BodyText string `json:"body_text"`
	BodyHTML string `json:"body_html"`
	Headers  []byte `gorm:"type:jsonb" json:"headers"`
}

// --- Phase 5 Additions ---

type SpamFilter struct {
	Base
	Rule     string `json:"rule"`   // e.g. "contains:casino"
	Type     string `json:"type"`   // "subject", "sender", "body"
	Action   string `json:"action"` // "reject", "flag"
	IsActive bool   `json:"is_active"`
}

type AuditLog struct {
	Base
	UserID *string `json:"user_id"` // Nullable
	Action string  `json:"action"`
	Target string  `json:"target"`
	IP     string  `json:"ip"`
}

type Notification struct {
	Base
	UserID  *string `json:"user_id"` // Nullable for system-wide
	Type    string  `json:"type"`    // "info", "warning"
	Message string  `json:"message"`
	IsRead  bool    `json:"is_read"`
}

type SystemLog struct {
	Base
	Level   string `json:"level"` // INFO, ERROR, WARN
	Message string `json:"message"`
	Source  string `json:"source"` // "api", "smtp", "worker"
}

type SystemSetting struct {
	Key         string `gorm:"primaryKey" json:"key"`
	Value       string `json:"value"`       // Parsed as int/bool/string based on code usage
	Description string `json:"description"` // For Admin UI hint
	UpdatedAt   time.Time
}

type OutboundMessage struct {
	Base
	Recipient string     `json:"recipient"`
	Sender    string     `json:"sender"`
	Subject   string     `json:"subject"`
	Body      string     `json:"body"`
	Status    string     `json:"status"` // "pending", "sent", "failed"
	Error     string     `json:"error"`
	SentAt    *time.Time `json:"sent_at"`
}
