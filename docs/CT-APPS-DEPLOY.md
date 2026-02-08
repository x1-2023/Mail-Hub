# 🚀 Proxmox CT - Deploy Shop + AWF-MAIL

> **CT Apps IP**: `192.168.1.100`  
> **CT Database IP**: `192.168.1.99`

---

## 1. Chuẩn bị CT

```bash
apt update && apt upgrade -y

# Cài Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git build-essential

# Cài Go 1.24
wget https://go.dev/dl/go1.24.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.24.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile
source /etc/profile


# Cài PM2
npm install -g pm2

# Tạo thư mục apps
mkdir -p /opt/apps
```

---

## 2. SSO Secret (đã gen sẵn)

```
SSO_JWT_SECRET=d0fd4e767fd5179073be6101e0c4ad76dc4819f33566ba832bf1acfcefe55f71
# Giá trị này GIỐNG NHAU ở cả 2 app
```

---

## 3. Deploy Shop (Next.js)

### 3.1. Clone & Install

```bash
cd /opt/apps
git clone https://github.com/x1-2023/digital-shop.git shop
cd shop
npm install
```

### 3.2. Tạo `.env`

```bash
cat > .env << 'ENVEOF'
# Database
DATABASE_URL="postgresql://shopuser:Quang%23%232022@192.168.1.99:5432/shop_db"

# SSO (PHẢI GIỐNG AWF-MAIL)
SSO_JWT_SECRET="d0fd4e767fd5179073be6101e0c4ad76dc4819f33566ba832bf1acfcefe55f71"

# Session
SESSION_SECRET="f054867c96825d1cd20cf7dbf8c6448a213d2c24c37ccad25fc5158439f406a9"

# App URLs
APP_URL="https://webmmo.net"
NEXT_PUBLIC_APP_URL="https://webmmo.net"

# Branding
NEXT_PUBLIC_SITE_NAME="WebMMO"
NEXT_PUBLIC_SUPPORT_EMAIL="support@webmmo.net"
NEXT_PUBLIC_TELEGRAM_HANDLE="@ADTVC"

# Email (Resend)
RESEND_API_KEY="re_HDVXiJ4s_3ey96UScxPgAqDeQeNrQu85Q"
RESEND_FROM_EMAIL="no-reply@webmmo.net"

# Contact
NEXT_PUBLIC_TELEGRAM_URL="https://t.me/ADTVC"

# Production
NODE_ENV=production
PORT=5000
ENVEOF
```

> ✅ **Sẵn sàng copy-paste!** Tất cả giá trị đã điền.

### 3.3. Setup Database & Build

```bash
# Push schema vào PostgreSQL
npx prisma generate
npx prisma db push

# Build production
npm run build
```

### 3.4. Tạo Admin Account

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Deobiet1', 12);
  await prisma.user.upsert({
    where: { email: 'admin@webmmo.net' },
    update: {},
    create: {
      email: 'admin@webmmo.net',
      passwordHash: hash,
      role: 'OWNER',
      tokenVersion: 0,
      status: 'ACTIVE'
    }
  });
  console.log('Admin created!');
}
main().catch(console.error).finally(() => prisma.\$disconnect());
"
```

### 3.5. Start với PM2

```bash
PORT=5000 pm2 start npm --name "shop" -- start
pm2 save
```

### 3.6. Verify

```bash
curl http://localhost:5000/api/health
# Expected: {"success":true,"data":{"status":"ok"}}
```

---

## 4. Deploy AWF-MAIL (Go API + Vite Frontend)

### 4.1. Clone & Build Backend

```bash
cd /opt/apps
git clone https://github.com/x1-2023/Mail-Hub.git awf-mail
cd awf-mail

# Build Go binary
go build -o mailhub-api ./cmd/api/
```

### 4.2. Build Frontend

```bash
cd web
npm install
npx vite build
# Output: web/dist/ → sẽ copy vào public/ để Go serve

# Copy frontend build vào public (Go sẽ serve static files)
cp -r dist ../public
cd ..
```

### 4.3. Tạo `.env`

```bash
cat > .env << 'ENVEOF'
# Server
PORT=8080

# Security
JWT_SECRET="Jb0t0S1mKzq8w2gq3x9b8fQ1d0z3Jv7yR8m1bqfGm2tqv0Lw6Wn9mG6gX0p5Qx8hXf3r0yG7dQ2m1vK8zQ9pA=="
SSO_JWT_SECRET="d0fd4e767fd5179073be6101e0c4ad76dc4819f33566ba832bf1acfcefe55f71"

# Database
DATABASE_URL="host=192.168.1.99 user=mailuser password=Quang##2022 dbname=maildb port=5432 sslmode=disable TimeZone=Asia/Ho_Chi_Minh"

# Redis
REDIS_ADDR="192.168.1.99:6379"
REDIS_PASSWORD="Deobiet1"

# Domain (mail domain mặc định khi seed)
DOMAIN=webmmo.net

# Frontend
VITE_API_URL=https://mailhub.webmmo.net/api
ENVEOF
```

> ✅ **Sẵn sàng copy-paste!** Tất cả giá trị đã điền.

### 4.4. Start với PM2

```bash
pm2 start ./mailhub-api --name "mailhub-api"
pm2 save
```

### 4.5. Verify

```bash
curl http://localhost:8080/api/health
# Expected: {"success":true,"data":{"status":"ok","service":"api"}}
```

---

## 5. PM2 Auto-start on Boot

```bash
pm2 startup
# Chạy lệnh mà PM2 in ra (bắt đầu bằng sudo env...)
pm2 save
```

Kiểm tra cả 2 app chạy:

```bash
pm2 list
# ┌────┬──────────────┬────────┬─────┐
# │ id │ name         │ status │ cpu │
# ├────┼──────────────┼────────┼─────┤
# │ 0  │ shop         │ online │  1% │
# │ 1  │ mailhub-api  │ online │  1% │
# └────┴──────────────┴────────┴─────┘
```

---

## 6. Nginx Reverse Proxy

```bash
apt install -y nginx

cat > /etc/nginx/sites-available/apps << 'NGINX'
# Shop - webmmo.net
server {
    listen 80;
    server_name webmmo.net www.webmmo.net;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Upload size limit (products)
    client_max_body_size 50M;
}

# AWF-MAIL API - mailhub.webmmo.net
server {
    listen 80;
    server_name mailhub.webmmo.net;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support (notifications stream)
        proxy_read_timeout 86400;
        proxy_buffering off;
    }
}

# AWF-MAIL Frontend - hotmailv.com (nếu serve riêng, không dùng Go)
# server {
#     listen 80;
#     server_name hotmailv.com www.hotmailv.com;
#     root /opt/apps/awf-mail/public;
#     index index.html;
#     location / {
#         try_files $uri $uri/ /index.html;
#     }
# }
NGINX

ln -s /etc/nginx/sites-available/apps /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### SSL với Certbot (khuyến nghị):

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d webmmo.net -d www.webmmo.net
certbot --nginx -d mailhub.webmmo.net
# Certbot tự cấu hình SSL + auto-renew
```

---

## 7. Update Code (Khi cần deploy lại)

### Shop:
```bash
cd /opt/apps/shop
git pull
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart shop
```

### AWF-MAIL:
```bash
cd /opt/apps/awf-mail
git pull
go build -o mailhub-api ./cmd/api/
cd web && npm install && npx vite build && cp -r dist ../public && cd ..
pm2 restart mailhub-api
```

---

## 8. Monitoring & Logs

```bash
# Xem logs
pm2 logs shop
pm2 logs mailhub-api

# Monitor realtime
pm2 monit

# Restart nếu crash
pm2 restart all
```

---

## Quick Reference

| App | Port | PM2 Name | Domain |
|-----|------|----------|--------|
| Shop | 5000 | `shop` | webmmo.net |
| AWF-MAIL API | 8080 | `mailhub-api` | mailhub.webmmo.net |

| ENV Variable | Giá trị | Lưu ý |
|-------------|---------|-------|
| `SSO_JWT_SECRET` | Giống nhau cả 2 | Gen 1 lần ở bước 2 |
| `DATABASE_URL` | Trỏ CT database IP | Khác format giữa Prisma vs GORM |
| `REDIS_ADDR` | CT database IP:6379 | Chỉ AWF-MAIL cần |
