
# MAILHUB – Quota & Cleanup Unified Specification (FINAL)

Version: v1  
Scope: Backend (Worker + Maintenance)  
Guarantee: **User alias IMMORTAL – Starred mail IMMORTAL**

---

## 0. CORE PRINCIPLES

1. **Quota and Cleanup are different layers**
   - Quota = policy (limits)
   - Cleanup = execution (deletion)
2. **Quota is enforced early (ingest / action time)**
3. **Cleanup is passive (reconcile + garbage collection)**
4. **Aliases owned by users are NEVER deleted**
5. **Starred mails are NEVER deleted by cleanup**
6. Cleanup only touches **anonymous + non-star** data

---

## 1. QUOTA TYPES (EXPLICITLY DEFINED)

MAILHUB uses exactly **4 quota types**. No hidden limits.

---

### Q1. Alias Quota (Creation-only)

| Field | Meaning |
|-----|--------|
| `max_aliases` | Maximum aliases a user may own |

**Rules**
- Checked ONLY when creating / claiming alias
- NEVER enforced by cleanup
- NEVER deletes aliases

```pseudo
if user.alias_count >= max_aliases:
  reject alias creation
```

---

### Q2. Mail Retention Quota (Time-based)

| Field | Meaning |
|------|--------|
| `retention_nonstar_days` | Days to keep non-star user mails |
| `anon_mail_ttl_hours` | TTL for anonymous/orphan mails |

**Execution**
- Converted into `expires_at` at ingest time
- Cleanup deletes when `expires_at < now()`

```pseudo
if mail.starred:
  expires_at = NULL
else if anonymous:
  expires_at = now + anon_ttl
else:
  expires_at = now + retention_days
```

---

### Q3. Rolling Buffer Quota (Count-based)

| Field | Meaning |
|------|--------|
| `per_alias_nonstar_limit` | Max non-star mails per alias |

**Execution**
- Enforced by worker immediately
- Cleanup only reconciles if needed

**Priority**
- `priority = 0` deleted first
- `priority = 1` protected longer

---

### Q4. Star Cap (Anti-abuse)

| Field | Meaning |
|------|--------|
| `star_cap` | Max starred mails per user |

**Rules**
- Starred mails are immortal
- API blocks new star when cap reached
- Cleanup never deletes starred mails

```pseudo
if user.star_count >= star_cap:
  reject star action
```

---

## 2. MAIL LIFECYCLE (QUOTA-AWARE)

### 2.1 On Mail Ingest (Worker)

```pseudo
resolve alias
resolve owner (user / anonymous)

if mail.starred == false:
  set expires_at (based on owner type)

insert email row

enforce rolling buffer per alias
```

**Important**
- 90% quota enforcement happens here
- Cleanup should be a safety net, not primary enforcer

---

### 2.2 On User Actions

#### Star Mail
```pseudo
if user.star_count >= star_cap:
  reject
else:
  is_starred = true
  expires_at = NULL
```

#### Unstar Mail
```pseudo
is_starred = false
expires_at = now + retention_days
```

---

## 3. CLEANUP RESPONSIBILITIES (PASSIVE)

Cleanup never decides policy. It only executes rules already encoded in data.

---

### Cleanup MAY delete

| Target | Condition |
|------|-----------|
| Anonymous mail | `expires_at < now()` |
| Orphan mail | `alias_id IS NULL AND expires_at < now()` |
| User non-star mail | `expires_at < now()` |
| Rolling overflow | `count(non-star) > limit` |
| Unclaimed anon alias | `created_at < TTL` |
| Raw spool | `raw_expires_at < now()` |

### Cleanup MUST NOT delete

- Any alias with `owner_type = user`
- Any mail with `is_starred = true`

---

## 4. CLEANUP JOB MAPPING

| Job | Purpose | Quota |
|----|--------|------|
| JOB 1 | Expire anonymous/orphan mails | Q2 |
| JOB 2 | Expire user non-star mails | Q2 |
| JOB 3 | Rolling buffer reconcile | Q3 |
| JOB 4 | Delete unclaimed anon aliases | Q2 |
| JOB 5 | Delete raw spool | Q2 |
| JOB 6 | Attachment GC | Q2 |
| JOB 7 | Vacuum / Analyze | Infra |

---

## 5. SQL-LEVEL SAFETY MODEL

### Central invariant
```sql
DELETE FROM emails
WHERE is_starred = FALSE
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
```

If this query is safe, the system is safe.

---

## 6. EDGE CASES & CORRECT BEHAVIOR

### Case: User stars mail right before expiry
- `expires_at` set to NULL
- Cleanup skips

### Case: User unstars old mail
- `expires_at = now + retention`
- Mail lives again

### Case: Worker crash before rolling buffer
- Maintenance JOB 3 reconciles later

### Case: Alias receives spam flood
- Rolling buffer deletes oldest non-star
- Starred unaffected

### Case: User tries to bypass quota by starring everything
- `star_cap` blocks action
- Cleanup not involved

---

## 7. WHY THIS DESIGN IS STABLE

- No cleanup logic touches alias ownership
- Cleanup is monotonic (only deletes expired/overflow)
- Worker enforces quota early
- `expires_at` is single source of truth
- Easy to audit and reason about

---

## 8. IMPLEMENTATION CHECKLIST

- [ ] expires_at set on ingest
- [ ] starred => expires_at NULL
- [ ] rolling buffer enforced in worker
- [ ] cleanup jobs batch + throttle
- [ ] FK `aliases -> emails` uses `ON DELETE SET NULL`
- [ ] tests for all edge cases

---

## FINAL GUARANTEE

If implemented as specified:

- Alias quota never deletes data
- Starred mails never disappear
- Database growth is bounded
- Cleanup is deterministic and safe
- System behavior is predictable under load
