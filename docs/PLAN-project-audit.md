# PLAN-project-audit: Comprehensive Review & Evolution Strategy

> **Status**: Draft / Brainstorming
> **Target**: MailHub (Go + React + Docker)
> **Goal**: Audit health, identify security/performance gaps, and plan V2 improvements.

---

## Phase 1: Context & Discovery (Khám phá & Kiểm tra)

### 1.1 Architecture Review (Điểm bất thường trong kiến trúc)
- [ ] **Dependency Audit**: Check `go.mod` and `package.json` for unused or vulnerable libs (`govulncheck`, `npm audit`).
- [ ] **Hardcoded Secrets**: Scan for API keys or env vars hardcoded in `*.go` or `*.tsx`.
- [ ] **Docker Efficiency**:
    - [ ] Check image size (is `Dockerfile.aio` optimized with caching?).
    - [ ] Check `entrypoint.sh` for race conditions (Postgres readiness).
- [ ] **Database Schema**:
    - [ ] Check for missing Indexes on frequently queried fields (`alias_id`, `received_at`).
    - [ ] Check `deleted_at` usage (Soft delete efficiency).

### 1.2 Code Quality (Chất lượng mã nguồn)
- [ ] **Backend (Go)**:
    - [ ] Error handling patterns (Do we just `return err` or log context?).
    - [ ] Middleware consistency (Auth checks on all sensitive routes?).
- [ ] **Frontend (React)**:
    - [ ] Re-rendering issues in `LeftSidebar` or `InboxContent`.
    - [ ] Type safety (Any `any` types in TypeScript?).

---

## Phase 2: Feature Inventory (Tính năng hiện có)

| Component | Feature Status | Notes |
|-----------|----------------|-------|
| **Core** | ✅ SMTP Ingestion | `go-guerrilla` style, supports HELO/DATA |
| **Worker** | ✅ Async Processing | Asynq + Redis. Auto-retry enabled. |
| **Storage** | ✅ Database | Postgres (GORM). Email content lazy updated. |
| **Auth** | ✅ JWT System | Support Login/Register/Anon Token. |
| **UI** | ✅ Dashboard | Brutalist Theme via Shadcn. Realtime Charts. |
| **Infra** | ✅ Docker AIO | Single container deployment. |
| **Legacy** | ⚠️ Orphan Adoption | Code exists but verifying activation status. |

---

## Phase 3: Anomalies & Risks (Điểm bất thường tiềm ẩn)

1.  **Orphan Email Logic**:
    - *Risk*: If spam domains flood the server, `allow_legacy_adoption` might create infinite aliases.
    - *Fix Plan*: Add Rate Limiting per Domain for adoption.
2.  **Worker Idempotency**:
    - *Risk*: If worker crashes mid-process, is the email saved twice?
    - *Review*: Check Transaction usage in `processor.go`.
3.  **Static Serving**:
    - *Risk*: `cmd/api/main.go` serving static files might be slow compared to Nginx.
    - *Fix Plan*: Benchmark or add Gzip middleware.

---

## Phase 4: Brainstorming v2 (Ý tưởng cải tiến)

### 4.1 AI Integration (Tích hợp AI)
- [ ] **Smart Summarize**: Use local LLM (Ollama) or Gemini API to summarize email thread.
- [ ] **Auto-Reply**: Draft replies styles (Professional, Casual) based on content.
- [ ] **Spam Detection v2**: Analyze content sentiment to detect "Soft Spam" (Phishing).

### 4.2 Performance & Scale
- [ ] **S3 Support**: Move `BodyHTML` from Postgres to MinIO/S3 to save DB space.
- [ ] **Horizontal Scaling**: Ensure `Asynq` + Redis handles multiple Worker replicas.

### 4.3 User Experience
- [ ] **Unified Inbox**: View all aliases in one "All Mail" view.
- [ ] **Mobile App**: PWA support (Manifest.json + Service Worker).
- [ ] **Dark Mode Sync**: Auto-sync theme with OS preference.

---

## Next Steps (Hành động tiếp theo)

Please select a focus area:
1.  **Run Audit**: I will run `govulncheck` and `staticcheck` on backend.
2.  **Fix Anomalies**: Address the "Orphan Risk" or "Transaction" check.
3.  **Prototype AI**: Build the "Email Summary" feature.
