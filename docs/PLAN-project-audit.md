# PLAN-project-audit: Kế hoạch Đánh giá & Chiến lược Phát triển

> **Trạng thái**: Bản nháp / Lên ý tưởng
> **Dự án**: MailHub (Go + React + Docker)
> **Mục tiêu**: Kiểm tra sức khỏe hệ thống, xác định các lỗ hổng bảo mật/hiệu năng và lên kế hoạch cải tiến cho phiên bản V2.

---

## Giai đoạn 1: Khám phá & Kiểm tra (Context & Discovery)

### 1.1 Đánh giá Kiến trúc (Architecture Review)
- [ ] **Kiểm tra Thư viện (Dependency Audit)**: Kiểm tra `go.mod` và `package.json` xem có thư viện nào không dùng hoặc chứa lỗ hổng bảo mật không (`govulncheck`, `npm audit`).
- [ ] **Mật khẩu & Khóa (Hardcoded Secrets)**: Quét các file `*.go` hoặc `*.tsx` xem có API key hay biến môi trường nào bị code cứng vào không.
- [ ] **Hiệu suất Docker**:
    - [ ] Kiểm tra dung lượng image (file `Dockerfile.aio` đã tối ưu cache tốt chưa?).
    - [ ] Kiểm tra `entrypoint.sh` xem có lỗi race condition không (ví dụ: chờ Postgres khởi động xong mới chạy app).
- [ ] **Cấu trúc Cơ sở dữ liệu (Database Schema)**:
    - [ ] Kiểm tra xem có thiếu Index ở các trường hay truy vấn (`alias_id`, `received_at`) không.
    - [ ] Kiểm tra hiệu quả của cơ chế xóa mềm (`deleted_at`).

### 1.2 Chất lượng Mã nguồn (Code Quality)
- [ ] **Backend (Go)**:
    - [ ] Các mẫu xử lý lỗi (Chỉ trả về `return err` hay có log thêm ngữ cảnh rõ ràng không?).
    - [ ] Tính nhất quán của Middleware (Các API nhạy cảm đã được kiểm tra quyền đầy đủ chưa?).
- [ ] **Frontend (React)**:
    - [ ] Kiểm tra vấn đề render lại (re-render) không cần thiết ở `LeftSidebar` hoặc `InboxContent`.
    - [ ] Kiểm tra tính chặt chẽ của kiểu dữ liệu (Có dùng bừa bãi kiểu `any` trong TypeScript không?).

---

## Giai đoạn 2: Hiện trạng Tính năng (Feature Inventory)

| Phân hệ (Component) | Trạng thái (Status) | Ghi chú (Notes) |
|-----------|----------------|-------|
| **Core** | ✅ Nhận SMTP | Kế thừa phong cách `go-guerrilla`, hỗ trợ chuẩn HELO/DATA |
| **Worker** | ✅ Xử lý Bất đồng bộ | Asynq + Redis. Có tích hợp tự động thử lại (Auto-retry). |
| **Storage** | ✅ Cơ sở dữ liệu | Postgres (GORM). Nội dung email được cập nhật theo cơ chế lazy update. |
| **Auth** | ✅ Hệ thống JWT | Hỗ trợ Đăng nhập/Đăng ký/Token Ẩn danh. |
| **UI** | ✅ Bảng điều khiển | Giao diện Brutalist thông qua Shadcn. Biểu đồ thời gian thực. |
| **Infra** | ✅ Docker AIO | Triển khai chỉ với một container duy nhất. |
| **Legacy** | ✅ Nhận mail lạc (Orphan) | Tính năng đã hoạt động chuẩn xác (Tự tạo Alias khi có mail đến domain hợp lệ). |

---

## Giai đoạn 3: Rủi ro & Bất thường Tiềm ẩn (Anomalies & Risks)

1.  **Logic nhận mail lạc (Orphan Email Logic)**:
    - *Rủi ro*: Nếu các nguồn spam đẩy lượng lớn email rác vào server, tính năng `allow_legacy_adoption` có thể tạo ra vô hạn Alias mới gây rác DB.
    - *Kế hoạch sửa*: Thêm cơ chế Giới hạn Tần suất (Rate Limiting) trên mỗi Tên miền cho việc nhận con nuôi.
2.  **Tính toàn vẹn của Worker (Worker Idempotency)**:
    - *Rủi ro*: Nếu worker bị crash (sập) giữa chừng khi đang xử lý, email có bị lưu trùng hai lần không?
    - *Kiểm tra*: Rà soát lại việc sử dụng Transaction (giao dịch) trong `processor.go`.
3.  **Phục vụ file tĩnh (Static Serving)**:
    - *Rủi ro*: Việc dùng `cmd/api/main.go` để phục vụ file tĩnh của Frontend có thể chậm hơn so với dùng Nginx.
    - *Kế hoạch sửa*: Chạy test hiệu năng (Benchmark) hoặc bổ sung Gzip middleware.

---

## Giai đoạn 4: Ý tưởng Cải tiến V2 (Brainstorming v2)

### 4.1 Tích hợp AI (AI Integration)
- [ ] **Tóm tắt Thông minh (Smart Summarize)**: Sử dụng LLM cục bộ (Ollama) hoặc Gemini API để tóm tắt nội dung các luồng email dài.
- [ ] **Tự động Trả lời (Auto-Reply)**: Gợi ý các mẫu trả lời (Chuyên nghiệp, Gần gũi) dựa trên nội dung email nhận được.
- [ ] **Phát hiện Spam V2**: Phân tích cảm xúc nội dung để phát hiện các dạng "Spam ngầm" (Phishing/Lừa đảo).

### 4.2 Hiệu năng & Mở rộng (Performance & Scale)
- [ ] **Hỗ trợ S3**: Chuyển nội dung `BodyHTML` từ Postgres sang lưu trữ tại MinIO/S3 để tiết kiệm dung lượng DB.
- [ ] **Mở rộng ngang (Horizontal Scaling)**: Đảm bảo bộ đôi `Asynq` + Redis có thể xử lý trơn tru khi chạy nhiều Worker replicas.

### 4.3 Trải nghiệm Người dùng (User Experience)
- [ ] **Hộp thư Hợp nhất (Unified Inbox)**: Xem tất cả các email từ mọi Alias trong cùng một tab "Tất cả thư".
- [ ] **Ứng dụng Di động (Mobile App)**: Cập nhật PWA (Manifest.json + Service Worker) để cài đặt app ngay trên trình duyệt điện thoại.
- [ ] **Đồng bộ Giao diện tối (Dark Mode Sync)**: Tự động đổi giao diện theo cấu hình hệ điều hành (OS preference).

---

## Các Bước Tiếp Theo (Next Steps)

Vui lòng chọn hướng ưu tiên:
1.  **Chạy Audit (Kiểm tra hệ thống)**: Tôi sẽ chạy `govulncheck` và `staticcheck` cho phần backend.
2.  **Khắc phục Rủi ro**: Xử lý các rủi ro liên quan đến "Orphan Risk" hoặc kiểm tra lại "Transaction".
3.  **Bản thử nghiệm AI (Prototype AI)**: Bắt tay xây dựng tính năng "Tóm tắt Email".

