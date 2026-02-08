# 🗄️ Proxmox CT - PostgreSQL + Redis Setup Guide

> **Mục đích**: CT này chạy PostgreSQL + Redis, phục vụ cả **Shop** và **AWF-MAIL**.

---

## 1. Tạo CT trên Proxmox

```
Template: ubuntu-24.04-standard
Hostname: ct-database
CPU: 2 cores
RAM: 2GB (tối thiểu 1GB)
Disk: 20GB+ (tùy data)
Network: vmbr0, DHCP hoặc Static IP
```

> 💡 Ghi nhớ IP của CT này (ví dụ: `192.168.1.100`), sẽ dùng ở bước cuối.

---

## 2. Cài đặt PostgreSQL

```bash
# Update system
apt update && apt upgrade -y

# Cài PostgreSQL
apt install -y postgresql postgresql-contrib

# Kiểm tra status
systemctl status postgresql
```

### 2.1. Tạo Databases & Users

```bash
# Chuyển sang user postgres
sudo -u postgres psql
```

```sql
-- Tạo databases
CREATE DATABASE shop_db;
CREATE DATABASE maildb;

-- Tạo users (ĐỔI PASSWORD!)
CREATE USER shopuser WITH PASSWORD 'Quang##2022';
CREATE USER mailuser WITH PASSWORD 'Quang##2022';

-- Cấp quyền
GRANT ALL PRIVILEGES ON DATABASE shop_db TO shopuser;
GRANT ALL PRIVILEGES ON DATABASE maildb TO mailuser;

-- Cấp quyền schema (PostgreSQL 15+ yêu cầu)
\c shop_db
GRANT ALL ON SCHEMA public TO shopuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO shopuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO shopuser;

\c maildb
GRANT ALL ON SCHEMA public TO mailuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mailuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mailuser;

-- Thoát
\q
```

### 2.2. Cho phép Remote Connections

```bash
# Tìm config path
sudo -u postgres psql -c "SHOW config_file;"
# Thường: /etc/postgresql/16/main/postgresql.conf
```

**Sửa `postgresql.conf`:**
```bash
nano /etc/postgresql/*/main/postgresql.conf
```
```
# Tìm dòng listen_addresses, sửa thành:
listen_addresses = '*'
```

**Sửa `pg_hba.conf`:**
```bash
nano /etc/postgresql/*/main/pg_hba.conf
```
```
# Thêm dòng cuối file (thay CT_APP_IP bằng IP của CT chạy apps)
# Cho phép 1 IP cụ thể:
host    all    all    CT_APP_IP/32    scram-sha-256

# Hoặc cho phép cả subnet (tiện hơn, kém bảo mật hơn):
host    all    all    192.168.1.0/24    scram-sha-256
```

**Restart PostgreSQL:**
```bash
systemctl restart postgresql
```

### 2.3. Test kết nối từ CT apps

```bash
# Từ CT apps, test kết nối:
psql -h CT_DATABASE_IP -U shopuser -d shop_db
psql -h CT_DATABASE_IP -U mailuser -d maildb
```

---

## 3. Cài đặt Redis

```bash
# Cài Redis
apt install -y redis-server

# Kiểm tra
systemctl status redis-server
```

### 3.1. Cấu hình Redis cho Remote Access

```bash
nano /etc/redis/redis.conf
```

Tìm và sửa các dòng sau:

```conf
# Cho phép remote connections (thay 0.0.0.0 nếu muốn mở tất cả)
bind 0.0.0.0

# Đặt password (BẮT BUỘC khi mở remote!)
requirepass Deobiet1

# Bật protected-mode off nếu đã có password
protected-mode no

# Tùy chọn: giới hạn RAM
maxmemory 512mb
maxmemory-policy allkeys-lru
```

**Restart Redis:**
```bash
systemctl restart redis-server
```

### 3.2. Test kết nối Redis

```bash
# Từ CT apps:
redis-cli -h CT_DATABASE_IP -a CHANGE_ME_REDIS_PASSWORD ping
# Expected: PONG
```

---

## 4. Firewall (Nếu dùng UFW)

```bash
# Chỉ cho phép CT apps kết nối
ufw allow from CT_APP_IP to any port 5432  # PostgreSQL
ufw allow from CT_APP_IP to any port 6379  # Redis
ufw enable
```

---

## 5. Auto-start on Boot

```bash
systemctl enable postgresql
systemctl enable redis-server
```

---

## 6. Backup (Khuyến nghị)

```bash
# Tạo script backup PostgreSQL
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup cả 2 databases
PGPASSWORD="CHANGE_ME" pg_dump -h localhost -U shopuser shop_db > "$BACKUP_DIR/shop_db_$DATE.sql"
PGPASSWORD="CHANGE_ME" pg_dump -h localhost -U mailuser maildb > "$BACKUP_DIR/maildb_$DATE.sql"

# Giữ lại 7 ngày gần nhất
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "[$DATE] Backup completed"
EOF

chmod +x /opt/backup-db.sh

# Cronjob backup hàng ngày lúc 3h sáng
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup-db.sh >> /var/log/db-backup.log 2>&1") | crontab -
```

---

## 7. ENV cho CT Apps (Copy & Paste)

Sau khi setup xong, cập nhật `.env` trên CT apps:

### Shop `.env`
```env
DATABASE_URL="postgresql://shopuser:PASSWORD@CT_DATABASE_IP:5432/shop_db"
SSO_JWT_SECRET="SHARED_SECRET_CẢ_2_APP"
```

### AWF-MAIL `.env`
```env
DATABASE_URL="host=CT_DATABASE_IP user=mailuser password=PASSWORD dbname=maildb port=5432 sslmode=disable TimeZone=Asia/Ho_Chi_Minh"
SSO_JWT_SECRET="SHARED_SECRET_CẢ_2_APP"
REDIS_ADDR="CT_DATABASE_IP:6379"
```

> ⚠️ Thay `CT_DATABASE_IP`, `PASSWORD`, `SHARED_SECRET` bằng giá trị thực!

---

## Quick Reference

| Service | Port | Config File |
|---------|------|-------------|
| PostgreSQL | 5432 | `/etc/postgresql/*/main/postgresql.conf` |
| Redis | 6379 | `/etc/redis/redis.conf` |

| Database | User | App |
|----------|------|-----|
| `shop_db` | `shopuser` | Shop (Next.js) |
| `maildb` | `mailuser` | AWF-MAIL (Go) |
