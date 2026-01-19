
# Backend Agent Prompt — MAILHUB v1

## Objective
Implement the MAILHUB backend (Go + PostgreSQL + Redis) for a tempmail system with accounts, anonymous automation (NO CAPTCHA), admin tools, and high performance.

You MUST follow all HARD RULES below. This is a production-lean v1.

---

## HARD RULES (NON-NEGOTIABLE)
1. NEVER auto-delete aliases owned by users.
2. Only users can delete their own aliases.
3. Admins may list / disable / transfer aliases, NOT delete user aliases.
4. Anonymous-created aliases or addresses CAN be claimed by anyone (atomic claim).
5. Maintenance MAY delete:
   - anonymous mails (TTL),
   - unclaimed anonymous aliases (TTL),
   - non-star mails by retention/quota.
6. Starred mails are NEVER deleted by maintenance.
7. Admin-only system sender can reply/forward ANY email; all actions MUST be audited.

---

## Architecture
- CT-DATA: PostgreSQL 15, Redis 7
- CT-APP:
  - SMTP Service (Go)
  - Worker Service (Go + Asynq)
  - API Service (Go Fiber)
- Realtime: Redis Pub/Sub → SSE (default)

---

## Core Tables (required)
- users
- domains
- aliases
- emails
- email_contents
- plans
- user_subscriptions
- api_keys (ONE key per user, no scopes, no IP allowlist)
- anon_access_tokens (per address)
- notifications
- announcements
- spam_filters
- audit_logs
- outbound_messages

(Refer to full schema discussed earlier; do not add extra complexity.)

---

## Anonymous Automation (CRITICAL)
NO CAPTCHA. NO PUBLIC ENUMERATION.

### Model
Anonymous Token PER ADDRESS.

### Flow
1. POST /api/anon/address
   → returns { address, anon_token, expires_at }
2. GET /api/anon/messages?address=...
   → requires Authorization: Bearer anon_token
3. GET /api/anon/messages/:id
4. Optional: GET /api/anon/stream (SSE)

Token TTL = 24h.
Token ONLY works for its bound address.

---

## Ingestion Algorithm
1. SMTP validates domain via Redis.
2. Parse minimal metadata + fingerprint.
3. Store raw MIME (spool).
4. Worker:
   - dedupe (unique fingerprint)
   - resolve alias
   - set expires_at
   - insert metadata
   - enforce rolling limit (atomic, non-star first)
   - publish realtime event

---

## Lazy Content
- Always store metadata.
- Full content parsed ONLY on read or star.
- CAS lock on materialization.

---

## Maintenance
- Batch jobs with throttling.
- Pause on high queue depth or DB latency.
- NEVER delete starred mails.
- NEVER delete user-owned aliases.

---

## API Surface (Minimum)
User:
- POST /api/auth/login
- POST /api/me/password
- GET /api/messages
- GET /api/messages/:id
- PATCH /api/messages/:id
- DELETE /api/messages/:id
- POST /api/accounts (claim alias)

API Key:
- GET /api/me/api-key
- POST /api/me/api-key/rotate

Anonymous:
- POST /api/anon/address
- GET /api/anon/messages
- GET /api/anon/messages/:id

Admin:
- CRUD users, plans
- Assign subscription
- Alias disable/transfer
- Mail search + bulk delete non-star
- Spam filters
- Announcements
- Maintenance control
- Admin sender reply/forward
- Audit log read

---

## Output Expectation
- Clean Go code
- Clear service separation
- No unnecessary abstractions
- Production-ready error handling

---

## Detailed Schema Reference (Recommended)

### 1. `users`
- `id` (UUID, PK)
- `email` (Unique)
- `password_hash`
- `role` (user/admin)
- `created_at`

### 2. `domains`
- `id` (UUID, PK)
- `domain` (string, Unique) - e.g. "mailhub.com"
- `is_public` (boolean) - anonymous users can use?
- `owner_id` (UUID, FK -> users.id, nullable) - if custom domain
- `verified_at` (timestamp, nullable)

### 3. `aliases`
- `id` (UUID, PK)
- `local_part` (string)
- `domain_id` (FK -> domains.id)
- `user_id` (FK -> users.id, nullable)
- `is_active` (boolean)
- `expires_at` (timestamp, nullable) - for anon aliases
- `created_at`
- Unique(local_part, domain_id)

### 4. `emails`
- `id` (UUID, PK)
- `alias_id` (FK -> aliases.id)
- `sender` (string)
- `subject` (string)
- `snippet` (string)
- `is_read` (boolean)
- `is_starred` (boolean)
- `received_at` (timestamp)
- `fingerprint` (string, hash of content) - for deduplication

### 5. `email_contents`
- `email_id` (FK -> emails.id, PK)
- `body_text` (text)
- `body_html` (text)
- `headers` (jsonb)

### 6. `api_keys`
- `id` (UUID, PK)
- `user_id` (FK -> users.id)
- `key_hash` (string)
- `masked_key` (string)
- `last_used_at` (timestamp)

### 7. `notifications`
- `id` (UUID, PK)
- `user_id` (FK -> users.id)
- `type` (info/warning/error)
- `message` (string)
- `is_read` (boolean)
- `created_at`

### 8. `plans`
- `id` (string, PK) - free, pro
- `max_aliases` (int)
- `max_retention_days` (int)
- `allow_custom_domain` (boolean)

### 9. `user_subscriptions`
- `user_id` (FK -> users.id, PK)
- `plan_id` (FK -> plans.id)
- `starts_at`
- `ends_at`

### 10. `anon_access_tokens`
- `token` (string, PK) - secure random string
- `alias_id` (FK -> aliases.id)
- `expires_at` (timestamp) - default 24h

### 11. `audit_logs`
- `id` (UUID, PK)
- `user_id` (FK, nullable)
- `action` (string)
- `target_resource` (string)
- `ip_address` (string)
- `created_at`

### 12. `outbound_messages` (Audit)
- `id` (UUID, PK)
- `sender_alias_id` (FK)
- `recipient` (string)
- `subject` (string)
- `sent_at`
