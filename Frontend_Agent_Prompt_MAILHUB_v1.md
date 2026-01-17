
# Frontend Agent Prompt — MAILHUB v1 (React + Vite)

## Objective
Build the MAILHUB frontend: fast, multi-theme, professional.
Target users: anonymous users, registered users, admins.

---

## Stack
- React 18 + Vite
- Tailwind CSS (CSS variables theme tokens)
- TanStack Query
- React Router
- SSE for realtime
- UI patterns from ui-ux-pro-max-skill.nextlevelbuilder.io

---

## Global Requirements
- Multi-theme (Lavender default, others optional)
- Lightweight (code-splitting, no heavy UI libs)
- Responsive
- No captcha UX
- Clean admin console

---

## Routes
Public:
- /
- /login
- /docs/api

User:
- /inbox
- /starred
- /account
- /account/api-key

Admin:
- /admin/dashboard
- /admin/users
- /admin/plans
- /admin/aliases
- /admin/emails
- /admin/spam-filters
- /admin/announcements
- /admin/sender
- /admin/maintenance
- /admin/audit

---

## Core User Features
### Inbox
- Alias selector
- Message list (cursor pagination)
- Message viewer (sandboxed iframe)
- Star / delete / read
- Realtime update (SSE)

### Account
- Change password
- API Key page:
  - show masked key
  - rotate key (confirm)
  - copy-once UX

---

## Anonymous UX
- Generate temp address
- Show anon token ONCE
- List/read messages using anon token
- Optional realtime refresh

---

## Notifications
- Bell icon + dropdown panel
- Badge count
- Toast ONLY for realtime events
- Modal ONLY for critical announcements

---

## Admin Console
- Data tables with filters + bulk actions
- Side drawer detail views
- Reason-required dialogs for destructive actions
- No delete button for user-owned aliases

---

## Security UX
- Mail HTML rendered in iframe sandbox
- Never re-show API keys or anon tokens after first display

---

## Output Expectation
- Clean component structure
- Reusable UI components
- Minimal global state
- Clear API client abstraction
