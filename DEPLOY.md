# 🚀 Hướng dẫn Triển khai MailHub (Chi tiết từ A-Z)

Tài liệu này hướng dẫn bạn cài đặt MailHub từ Source Code trên GitHub lên một server mới (Ubuntu/Debian) sử dụng Docker.

## 1. Chuẩn bị (Prerequisites)

Đảm bảo server của bạn đã cài đặt:
- **Git**: Để tải mã nguồn.
- **Docker** & **Docker Compose**: Để chạy ứng dụng.

```bash
# Cài đặt nhanh trên Ubuntu
sudo apt update
sudo apt install -y git docker.io
sudo systemctl enable --now docker
sudo apt install -y docker-compose
```

## 2. Tải Mã Nguồn (Clone Repo)

Tải code từ GitHub về thư mục mong muốn (ví dụ `/opt/mailhub`):

```bash
cd /opt
git clone https://github.com/x1-2023/Mail-Hub.git
cd Mail-Hub
```

## 3. Cấu hình Biến Môi trường (.env)

Bước này quan trọng nhất. Bạn cần copy file mẫu và sửa lại cho đúng với server của bạn.

```bash
cp .env.example .env
nano .env
```

### Giải thích các biến quan trọng:

**A. Cấu hình Port (Server Config)**
Đây là các port sẽ mở ra trên server của bạn (Host Ports).
*   `API_PORT=3000`: Port của Backend API. (Nginx sẽ trỏ vào đây).
*   `WEB_PORT=4000`: Port của Giao diện Website. (Nginx sẽ trỏ vào đây).
*   `SMTP_PORT=2525`: Port nhận email. **Lưu ý**: Nếu bạn muốn nhận email thực tế từ Gmail/Outlook, bạn nên để là `25` (cần quyền root hoặc map port 25:2525 trong docker-compose).

**B. Cấu hình Domain (Frontend Config)**
*   `DOMAIN=hotmailv.com`: Tên miền chính của hệ thống email (đuôi email sẽ là `@hotmailv.com`).
*   `VITE_API_URL=https://api.hotmailv.com/api`: Địa chỉ public của API. Frontend (chạy trên trình duyệt người dùng) sẽ gọi vào link này. **Phải là HTTPS nếu web chạy HTTPS**.

**C. Cấu hình Database & Security**
*   `DB_PASSWORD`: Đặt mật khẩu khó đoán cho database.
*   `JWT_SECRET`: Chuỗi ngẫu nhiên để mã hóa đăng nhập. Gõ bừa một đoạn dài là được.

---

## 4. Chạy Hệ thống (Start Docker)

Sau khi lưu file `.env`, chạy lệnh sau để build và khởi động toàn bộ hệ thống:

```bash
docker-compose up -d --build
```

*   `up -d`: Chạy ngầm (background).
*   `--build`: Build lại code mới nhất.

Đợi khoảng 1-2 phút. Kiểm tra xem các container đã chạy chưa:
```bash
docker ps
```
Bạn sẽ thấy 4 container: `mailhub-frontend`, `mailhub-backend`, `mailhub-db`, `mailhub-redis`.

## 5. Tạo Tài khoản Admin (Owner)

Mặc định database sẽ trống trơn. Bạn cần chạy công cụ setup có sẵn trong container Backend để tạo tài khoản chủ sở hữu.

```bash
docker-compose exec backend ./create_admin
```

Nếu thành công, nó sẽ báo:
> ✅ Admin Created: admin@mailhub.dev / admin123

## 6. Cấu hình Nginx Proxy Manager (Hoặc Nginx thường)

Để truy cập từ ngoài internet và có SSL (HTTPS), bạn cần cấu hình Reverse Proxy.

### Nếu dùng Nginx Proxy Manager:

**Host 1: Frontend (Giao diện chính)**
*   **Domain Names**: `hotmailv.com` (hoặc domain của bạn)
*   **Scheme**: `http`
*   **Forward Host**: `192.168.1.101` (IP LAN của Server - Đừng dùng localhost hay 127.0.0.1)
*   **Forward Port**: `4000`
*   **SSL**: Request chứng chỉ Let's Encrypt. Bật "Force SSL" & "Websockets Support".

**Host 2: Backend (API Subdomain)**
*   **Domain Names**: `api.hotmailv.com`
*   **Scheme**: `http`
*   **Forward Host**: `192.168.1.101` (IP LAN của Server)
*   **Forward Port**: `3000`
*   **SSL**: Request chứng chỉ Let's Encrypt. Bật "Force SSL".

### Kiểm tra:
Truy cập `https://hotmailv.com`. Đăng nhập với `admin@mailhub.dev` / `admin123`.

## 7. Cập nhật mới (Update)

Khi có code mới trên GitHub, bạn chỉ cần:

```bash
git pull                   # 1. Tải code mới
docker-compose down        # 2. Tắt container cũ
docker-compose up -d --build # 3. Chạy lại
```

## 8. Cấu hình Port Forwarding (Nếu chạy ở nhà)

Nếu server của bạn có IP cục bộ (VD: `192.168.1.99`), bạn cần mở port trên Modem/Router để người ngoài truy cập được.

**Các Port cần mở (Forward 1-1):**
*   **TCP 4000**: Cho người dùng truy cập web (Destination IP: `192.168.1.99`).
*   **TCP 3000**: Cho API (Destination IP: `192.168.1.99`).
*   **TCP 25**: Để nhận email từ Gmail/Outlook.

> ⚠️ **Lưu ý quan trọng về Port 25:**
> Hầu hết các nhà mạng (ISP) chặn chiều **RA** và **VÀO** của port 25 đối với khách hàng cá nhân để chống spam.
> *   Nếu bị chặn chiều VÀO: Bạn sẽ không nhận được thư.
> *   Nếu bị chặn chiều RA: Bạn sẽ không gửi được thư ra ngoài (Gmail, Yahoo...).
> *   Giải pháp: Check [Open Port Check Tool](https://www.yougetsignal.com/tools/open-ports/) xem port 25 có thông không.

---
Chúc bạn thành công! 🚀
