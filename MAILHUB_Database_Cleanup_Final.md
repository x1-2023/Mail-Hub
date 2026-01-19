
# MAILHUB – Database Cleanup & Maintenance Logic (FINAL)

Version: v1  
Scope: PostgreSQL + Redis + Asynq  
Guarantees: **User alias is immortal, Starred mail is immortal**

---

## 0. HARD INVARIANTS (MUST NEVER BREAK)

1. **NEVER delete aliases owned by users**
   - `aliases.owner_type = 'user'` is IMMORTAL.
2. **ONLY users can delete their own aliases**
3. **Admins may NOT delete user aliases**
   - Only list / disable / transfer.
4. **Maintenance NEVER deletes starred mails**
   - `emails.is_starred = true` is IMMORTAL.
5. Maintenance MAY delete:
   - Anonymous mails (TTL)
   - Orphan mails (`alias_id IS NULL`) (TTL)
   - User mails **non-star** (retention / quota)
   - Anonymous aliases **unclaimed** (TTL)
   - Raw spool / attachments with no references

These rules override everything.

---

## 1. DATA REQUIRED FOR SAFE CLEANUP

### Required Columns
- `emails.expires_at` (NULL for starred)
- `emails.raw_expires_at`
- `emails.is_starred`
- `aliases.owner_type`
- `aliases.claimed_by_user_id`

### Required Indexes
```sql
CREATE INDEX idx_emails_expires
  ON emails(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX idx_emails_raw_expires
  ON emails(raw_expires_at)
  WHERE raw_expires_at IS NOT NULL;

CREATE INDEX idx_aliases_owner_claim
  ON aliases(owner_type, claimed_by_user_id, created_at);
```

Purpose:
- Cleanup always runs via **range scans**
- No full-table scan
- Safe under large datasets (100GB+)

---

## 2. SAFE MAINTENANCE MODE

Cleanup runs only when system is healthy.

### Guardrails
Cleanup PAUSES if:
- Redis queue depth > threshold
- DB p95 latency > threshold
- CPU load too high

### Execution Rules
- Batch size: 1,000 – 10,000 rows
- Throttle: 100–300ms between batches
- All jobs resumable
- No long locks

---

## 3. CLEANUP JOBS (ORDER MATTERS)

1. Expire anonymous / orphan mails  
2. Expire user non-star mails  
3. Rolling buffer reconciliation  
4. Delete unclaimed anonymous aliases  
5. Delete expired raw spool  
6. Delete orphan attachments  
7. Vacuum / Analyze (light)

Each job runs independently and safely.

---

## 4. JOB DETAILS

---

### JOB 1 — Delete Expired Anonymous / Orphan Mails

**Target**
- `emails.is_starred = false`
- `emails.expires_at < now()`
- `alias_id IS NULL` OR `aliases.owner_type = 'anonymous'`

```sql
WITH victims AS (
  SELECT e.id
  FROM emails e
  LEFT JOIN aliases a ON a.id = e.alias_id
  WHERE e.is_starred = FALSE
    AND e.expires_at IS NOT NULL
    AND e.expires_at < NOW()
    AND (e.alias_id IS NULL OR a.owner_type = 'anonymous')
  ORDER BY e.expires_at ASC
  LIMIT $BATCH
)
DELETE FROM emails e
USING victims v
WHERE e.id = v.id;
```

Notes:
- Starred mails are excluded
- Cascades delete `email_contents`
- Raw spool handled later

---

### JOB 2 — Delete User Non-Star Mails by Retention

**Target**
- `aliases.owner_type = 'user'`
- `emails.is_starred = false`
- `emails.expires_at < now()`

```sql
WITH victims AS (
  SELECT e.id
  FROM emails e
  JOIN aliases a ON a.id = e.alias_id
  WHERE e.is_starred = FALSE
    AND e.expires_at IS NOT NULL
    AND e.expires_at < NOW()
    AND a.owner_type = 'user'
  ORDER BY e.expires_at ASC
  LIMIT $BATCH
)
DELETE FROM emails e
USING victims v
WHERE e.id = v.id;
```

Guarantee:
- Alias untouched
- Starred untouched

---

### JOB 3 — Rolling Buffer Reconciliation (Per Alias)

Purpose:
- Enforce `N` non-star mails per alias
- Priority mails survive longer

Rules:
- Keep newest mails
- Delete oldest
- `priority = 0` deleted before `priority = 1`

```sql
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY alias_id
           ORDER BY priority ASC, received_at DESC
         ) AS rn
  FROM emails
  WHERE alias_id = $ALIAS_ID
    AND is_starred = FALSE
),
victims AS (
  SELECT id
  FROM ranked
  WHERE rn > $LIMIT
  ORDER BY rn DESC
  LIMIT $BATCH
)
DELETE FROM emails e
USING victims v
WHERE e.id = v.id;
```

Runs:
- Inline during mail ingest
- Periodic reconciliation in maintenance

---

### JOB 4 — Delete Unclaimed Anonymous Aliases

**Target**
- `owner_type = 'anonymous'`
- `claimed_by_user_id IS NULL`
- `created_at < now() - TTL`

```sql
WITH victims AS (
  SELECT id
  FROM aliases
  WHERE owner_type = 'anonymous'
    AND claimed_by_user_id IS NULL
    AND created_at < NOW() - INTERVAL '7 days'
  ORDER BY created_at ASC
  LIMIT $BATCH
)
DELETE FROM aliases a
USING victims v
WHERE a.id = v.id;
```

Important:
- FK from `emails.alias_id` MUST be `ON DELETE SET NULL`
- Orphan mails cleaned by JOB 1

---

### JOB 5 — Delete Expired Raw Spool

**Target**
- `raw_expires_at < now()`

```sql
SELECT raw_key
FROM emails
WHERE raw_key IS NOT NULL
  AND raw_expires_at IS NOT NULL
  AND raw_expires_at < NOW()
LIMIT $BATCH;
```

Steps:
1. Delete file/object
2. Set `raw_key = NULL`

Optional:
- If mail is starred, pin raw by setting `raw_expires_at = NULL` on star.

---

### JOB 6 — Delete Orphan Attachments

Recommended:
- Track attachments in `attachment_objects(email_id, object_key)`

Logic:
- Delete objects where `email_id` no longer exists

---

### JOB 7 — Vacuum / Analyze

Rules:
- `VACUUM (ANALYZE)` only
- No `VACUUM FULL` during peak
- Schedule during low traffic

---

## 5. SCHEDULE PLAN

| Interval | Jobs |
|--------|------|
| Every 5 min | Job 1, Job 5 |
| Every 30 min | Job 2 |
| Every 6 hours | Job 4 |
| Nightly | Job 6, Job 7 |

---

## 6. LOGGING & AUDIT

### Maintenance Logs
- job_name
- start_time
- end_time
- rows_deleted
- batch_count
- paused_reason

### Audit Logs
- Admin-triggered cleanup
- Config changes (TTL, retention, quota)

---

## 7. TEST CASES (MANDATORY)

1. User alias exists → cleanup runs → alias still exists
2. Starred mail exists → cleanup runs → mail still exists
3. Non-star expired → deleted
4. Anonymous alias unclaimed expired → deleted
5. Anonymous alias claimed → NOT deleted
6. Rolling buffer deletes only non-star overflow

---

## FINAL GUARANTEE

If implemented as written:
- No user alias is ever lost
- No starred mail is ever lost
- Database size remains bounded
- Cleanup is safe under load
