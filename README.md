# MailHub - Disposable Email System

MailHub is a self-hosted, high-performance disposable email service built with Go (Backend) and React/Vite (Frontend).

## Features

- **Anonymous Email**: Generate temporary, privacy-focused email addresses instantly.
- **Realtime Updates**: WebSocket/SSE notifications for new emails.
- **Admin Dashboard**: Validated management of Users, Domains, and System Settings.
- **Global Search**: Admin can search and manage all emails in the system.
- **Outbound Reply**: Admin can reply to incoming emails directly from the dashboard.
- **Automated Cleanup**: Configurable retention policies (e.g., Delete Anon mails after 24h).
- **Spam Protection**: Configurable spam filters and Rate Limiting.

## Technology Stack

- **Backend**: Go (Fiber v2), GORM (Postgres/SQLite), Asynq (Redis Queue), SwiftSMTP.
- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/UI, Tanstack Query.
- **Database**: PostgreSQL (Production) or SQLite (Dev).
- **Queue**: Redis.

## Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- Redis (for Queue)
- PostgreSQL (Recommended)

### Env Setup
Copy `.env.example` to `.env`:
```bash
PORT=8080
DB_DSN="host=localhost user=postgres password=secret dbname=mailhub port=5432 sslmode=disable"
REDIS_ADDR="localhost:6379"
JWT_SECRET="your-secret-key"
SMTP_DOMAIN="mailhub.local"
```

### Run Backend
```bash
# Start API
go run cmd/api/main.go

# Start Worker (Background Tasks)
go run cmd/worker/main.go

# Start SMTP Server
go run cmd/smtp/main.go
```

### Run Frontend
```bash
cd web
npm install
npm run dev
```

## Docker Deployment (Production)

This project includes a full Docker setup for easy deployment.

### 1. Configuration
Check `.env` and set your desired ports and domains:
```bash
API_PORT=3000   # Exposed API Port
WEB_PORT=4000   # Exposed Frontend Port
DOMAIN=yourdomain.com
```

### 2. Build & Run
```bash
# Build and start all services (Backend, Frontend, Postgres, Redis)
docker-compose up -d --build
```

### 3. Nginx Proxy Manager Setup
If you are using Nginx Proxy Manager:
- **Frontend**: Forward `hotmailv.com` -> `http://<HOST_IP>:4000`
- **Backend**: Forward `api.hotmailv.com` -> `http://<HOST_IP>:3000`
- Enables SSL (HTTPS) for both domains easily.

## Documentation

Full API Documentation is available in [API_DOCS.md](API_DOCS.md).

## Project Structure

- `cmd/`: Entry points (api, worker, smtp).
- `internal/`: Core logic (handlers, models, services).
- `web/`: Frontend application.
- `pkg/`: Shared libraries.

## License
MIT
