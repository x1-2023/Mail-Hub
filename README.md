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

## 🚀 Deployment Guide

### Option 1: Quick Start (Docker All-in-One)
Best for testing or simple deployments. Includes Database and Redis.

1.  **Clone & Config**
    ```bash
    git clone https://github.com/x1-2023/Mail-Hub.git
    cd Mail-Hub
    cp .env.example .env
    ```
    *Edit `.env` to set your domains and passwords.*

2.  **Start System**
    ```bash
    docker-compose up -d --build
    ```

3.  **Create Owner Account**
    Runs the setup script inside the container to create `admin@mailhub.dev` / `admin123`.
    ```bash
    docker-compose exec backend ./create_admin
    ```

4.  **Access**
    *   **Dashboard**: `http://localhost:3000` (or your configured domain)
    *   **Login**: Use the admin credentials above.

### Option 2: Advanced (External DB/Redis)
If you have an existing robust database infrastructure.

1.  **Edit `.env`**
    Set `DATABASE_URL` and `REDIS_ADDR` to point to your external services.

2.  **Edit `docker-compose.yml`**
    *   Comment out (`#`) the `db` and `redis` services.
    *   Remove the `depends_on` section in `backend`.
    *   **Important**: Remove the `DATABASE_URL` and `REDIS_ADDR` environment overrides in the `backend` service (lines 46-47) so it uses your `.env` values.

3.  **Start System**
    ```bash
    docker-compose up -d --build
    ```

### Option 3: Manual (No Docker)
See "Run Backend" section above for local dev setup.

## 🛠 Nginx Proxy Manager (Example)
For Production with SSL:

1.  **Backend API**: Forward `api.yourdomain.com` -> `http://<SERVER_IP>:3000`
2.  **Frontend**: Forward `yourdomain.com` -> `http://<SERVER_IP>:4000`
3.  Enable "Websockets Support" and "Block Common Exploits".
4.  Request SSL Certificate.

## 🗄️ External Database Setup (For Option 2)

If you use your own PostgreSQL:
1.  **Create Database**: Create a DB named `maildb` (or match your `.env`).
2.  **Extensions**: You MUST enable `pgcrypto` for UUID generation:
    ```sql
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    ```
    *Run this SQL in your `maildb` database before starting the backend.*

If you use your own Redis:
1.  **Persistence**: Enable AOF or RDB persistence in `redis.conf` to prevent data loss on restart (Queue uses Redis).
2.  **Version**: Redis 6.x or higher is recommended.

## License
MIT
