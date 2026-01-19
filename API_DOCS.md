# MailHub API Documentation

Base URL: `http://localhost:8080/api`

## Authentication

### Register
`POST /auth/register`
```json
{ "email": "admin@example.com", "password": "securepassword" }
```

### Login
`POST /auth/login`
```json
{ "email": "admin@example.com", "password": "securepassword" }
```
Response: `{ "token": "jwt...", "user": { ... } }`

---

## Anonymous Email (Public)

### Create Temporary Address
`POST /anon/address`
Response: `{ "address": "random@mailhub.local", "token": "access_token" }`

### Get Messages
`GET /anon/messages`
Headers: `X-Anon-Token: <token>`

### Get Message Content
`GET /anon/messages/:id`

---

## Notifications (Realtime)

### Subscribe (SSE)
`GET /notifications/stream?token=<jwt_token>`
Event Stream of JSON notifications.

### List Notifications
`GET /notifications`

### Mark All Read
`POST /notifications/read-all`

---

## Admin API (Protected)
Headers: `Authorization: Bearer <jwt_token>`

### Stats
`GET /admin/stats`

### User Management
- `GET /admin/users`
- `DELETE /admin/users/:id`

### Domain Management
- `GET /admin/domains`
- `POST /admin/domains` ({ "domain": "example.com", "is_public": true })

### Email Management (Global)
- `GET /admin/emails?q=Keyword` (Search Subject/Sender)
- `DELETE /admin/emails/:id`
- `POST /admin/emails/reply` 
  ```json
  { "recipient": "target@example.com", "subject": "Re: Help", "body": "Reply content..." }
  ```

### System & Maintenance
- `POST /admin/announcements` ({ "message": "System maintainenece in 5 mins", "type": "warning" })
- `POST /admin/cleanup` ({ "targets": ["vacuum"] })
- `GET /admin/logs`
- `GET /admin/settings`
- `PUT /admin/settings`

---

## Worker Tasks (Background)
- **Ingest**: Processes incoming SMTP mails.
- **Cleanup**: Auto-deletes expired mails (Anon: 24h).
- **Delivery**: Sends outbound emails via SMTP Relay.
