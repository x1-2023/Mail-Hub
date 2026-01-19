
# MAILHUB – Master Implementation Plan (Phased Checklist)

This document is a **step-by-step phase plan** for AI agents to implement MAILHUB.
Each checkbox is an explicit acceptance criterion.

Core invariants:
- User-owned aliases are IMMORTAL
- Starred mails are IMMORTAL
- Cleanup never violates ownership or stars

---

## Phase 0 — Foundations (Infra & Repo)

### Backend / Infra
- [ ] Repo structure: cmd/{api,worker,smtp}, internal/*
- [ ] Config loader (.env + env override)
- [ ] Structured logger
- [ ] Docker multi-stage build (single binary)
- [ ] Docker Compose (api, worker, smtp, frontend)
- [ ] Network hardening (only needed ports open)

### Data Node
- [ ] PostgreSQL 15 tuned
- [ ] Redis 7 running
- [ ] Backup strategy defined

---

## Phase 1 — Database Schema

- [ ] users
- [ ] domains
- [ ] aliases
- [ ] emails
- [ ] email_contents
- [ ] plans
- [ ] user_subscriptions
- [ ] api_keys
- [ ] anon_access_tokens
- [ ] spam_filters
- [ ] notifications
- [ ] announcements
- [ ] audit_logs
- [ ] outbound_messages

### Critical FK rules
- [ ] emails.alias_id ON DELETE SET NULL
- [ ] email_contents.email_id ON DELETE CASCADE

### Indexes
- [ ] emails(alias_id, received_at DESC)
- [ ] emails(to_address, received_at DESC)
- [ ] emails(expires_at) WHERE expires_at IS NOT NULL
- [ ] emails(raw_expires_at) WHERE raw_expires_at IS NOT NULL
- [ ] aliases(owner_type, claimed_by_user_id, created_at)

---

## Phase 2 — Auth & Users

- [ ] Login endpoint
- [ ] JWT middleware
- [ ] Change password
- [ ] Plan resolution logic
- [ ] Admin user creation with plan assignment

---

## Phase 3 — API Keys (Minimal)

- [ ] One API key per user
- [ ] Secure hash storage
- [ ] Rotate API key (return once)
- [ ] API key middleware
- [ ] Rate limit per key

---

## Phase 4 — Anonymous Automation (No Captcha)

- [ ] Create anonymous address
- [ ] Issue anon token (shown once)
- [ ] Token bound to address
- [ ] List messages via token
- [ ] Read message via token
- [ ] Anonymous TTL enforced
- [ ] Anti-enumeration enforced

---

## Phase 5 — SMTP Ingestion

- [ ] SMTP server on port 25
- [ ] Domain validation via Redis
- [ ] Stream raw mail to spool
- [ ] Minimal parse (metadata only)
- [ ] Enqueue incoming job
- [ ] Backpressure (451 on failure)
- [ ] Size / rate limits

---

## Phase 6 — Worker Ingest Pipeline

- [ ] Dedupe via fingerprint
- [ ] Alias resolution
- [ ] expires_at set correctly
- [ ] Insert metadata-only email
- [ ] Rolling buffer enforcement (atomic)
- [ ] Realtime publish

---

## Phase 7 — Lazy Content Materialization

- [ ] Metadata-only inbox listing
- [ ] Materialize on read
- [ ] CAS lock for materialization
- [ ] HTML sanitization
- [ ] Star / unstar behavior correct

---

## Phase 8 — Cleanup & Maintenance

- [ ] Job 1: expire anonymous/orphan mails
- [ ] Job 2: expire user non-star mails
- [ ] Job 3: rolling buffer reconcile
- [ ] Job 4: delete unclaimed anonymous aliases
- [ ] Job 5: raw spool GC
- [ ] Job 6: attachment GC
- [ ] Job 7: vacuum/analyze
- [ ] Batch + throttle
- [ ] Safe mode pause logic

---

## Phase 9 — Notifications

- [ ] Notifications table
- [ ] Announcements
- [ ] Realtime notification push
- [ ] Read / read-all

---

## Phase 10 — Admin Console (Backend)

- [ ] Admin auth
- [ ] User management
- [ ] Plan management
- [ ] Alias list / disable / transfer
- [ ] Email global search
- [ ] Bulk delete non-star
- [ ] Spam filters
- [ ] Maintenance controls
- [ ] Audit logs

---

## Phase 11 — Admin System Sender

- [ ] Admin reply / forward any mail
- [ ] DKIM signing
- [ ] Outbound worker
- [ ] Audit log per send
- [ ] Rate limiting

---

## Frontend Phases

### FE Phase 1 — App Shell
- [ ] Multi-theme support
- [ ] Auth guard
- [ ] Layout system

### FE Phase 2 — Inbox
- [ ] Alias picker
- [ ] Message list
- [ ] Message viewer (iframe)
- [ ] Star / delete
- [ ] Realtime updates

### FE Phase 3 — Account
- [ ] Change password
- [ ] API key management

### FE Phase 4 — Anonymous Inbox
- [ ] Generate address
- [ ] Show anon token once
- [ ] Anonymous inbox UI

### FE Phase 5 — Notifications
- [ ] Bell panel
- [ ] Toast realtime
- [ ] Critical modal

### FE Phase 6 — Admin UI
- [ ] Dashboard
- [ ] Users
- [ ] Plans
- [ ] Aliases
- [ ] Emails
- [ ] Spam filters
- [ ] Maintenance
- [ ] Audit

---

## Final Acceptance Checklist

- [ ] User alias cannot be deleted by maintenance
- [ ] Starred mail never deleted
- [ ] Anonymous inbox not enumerable
- [ ] SMTP responds fast (enqueue-only)
- [ ] Cleanup safe under load
- [ ] Admin actions fully audited

---

END OF PLAN
