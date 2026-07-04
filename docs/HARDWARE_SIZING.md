# HARDWARE_SIZING.md - Chiến lược Cấu hình Phần cứng (Quy mô 10-20 Người dùng)

> **Ngữ cảnh**: Triển khai quy mô nhỏ (Sử dụng cá nhân / Gia đình / Đội nhóm)
> **Công nghệ cốt lõi**: Go (Fiber) + Postgres + Redis + React (Static)
> **Kiến trúc**: Triển khai trong một Container duy nhất (AIO)

---

## 1. Phân Tích Tiêu Thụ Tài Nguyên (Resource Breakdown)

### **RAM (Bộ nhớ trong)** - *Tài nguyên Quan trọng nhất*
*   **MailHub App (Go)**: Cực kỳ nhẹ. Khi không hoạt động (Idle) tốn khoảng ~20MB, khi có tải (Load) tốn khoảng ~100MB.
*   **Postgres**: Mặc định tốn ~150-200MB (nếu tinh chỉnh lại thông số `shared_buffers` thì có thể giảm xuống).
*   **Redis**: Dùng để lưu trữ hàng đợi (queue) và bộ nhớ đệm (cache) rất nhẹ, tốn khoảng ~50MB.
*   **Hệ điều hành (Linux Kernel)**: ~150MB.

👉 **Tổng ước tính**: ~500MB đến 600MB RAM.

### **CPU (Vi xử lý)**
*   **Go Runtime**: Xử lý đồng thời (concurrent) cực tốt, khi không hoạt động mức chiếm dụng gần như 0%.
*   **Bộ lọc Spam (Spam Filter - Regex)**: Tiêu thụ CPU nhiều nhất khi có email mới đến (do phải khớp các biểu thức chính quy - Regex matching).
*   **Worker**: Chạy ngầm rất nhẹ nhàng.

👉 **Khuyến nghị**: 1 vCPU là quá đủ cho toàn bộ hệ thống.

### **Ổ cứng (Disk / Storage)**
*   **Docker Image**: ~100MB (Do sử dụng Alpine base).
*   **Dữ liệu Postgres (Postgres Data)**:
    *   10 người dùng x 50 aliases = 500 aliases (hòm thư ảo).
    *   Mỗi ngày 1000 email rác (vài KB cho mỗi text) + 500 email HTML (vài chục KB).
    *   Giữ lại email (Retention) trong 30 ngày -> Cần khoảng 2GB - 5GB không gian lưu trữ.

---

## 2. Cấu Hình Đề Xuất (Recommended Specs)

### ✅ Lựa chọn Tối ưu (Best Value)
*   **RAM**: 1GB (Có thể cấu hình SWAP để dự phòng khi đầy RAM).
*   **CPU**: 1 Core.
*   **Ổ cứng**: 10GB - 20GB SSD.
*   **Loại VPS (Máy chủ ảo)**:
    *   **Cloudflare Tunnel**: Không cần IP tĩnh, có thể chạy tại nhà (Home Server) hoặc VPS cấu hình dạng NAT.
    *   **Nhà cung cấp gợi ý**: DigitalOcean ($4/tháng), Hetzner (€4/tháng), hoặc Vultr ($3.5/tháng dùng IPv6).

### ⚡ Lựa chọn Tiết kiệm (Low End)
*   **RAM**: 512MB (**BẮT BUỘC PHẢI TẠO FILE SWAP TỐI THIỂU 1GB**).
*   **CPU**: Shared Core.
*   **Ổ cứng**: 5GB.
*   *Lưu ý quan trọng*: Postgres có thể bị hệ điều hành tắt ép buộc (OOM Kill) nếu không có đủ dung lượng Swap.

---

## 3. Hướng Dẫn Tinh Chỉnh Cho Máy Chủ Yếu (Tuning Guide for Low-End VPS)

Để hệ thống chạy mượt trên VPS chỉ có 1GB RAM, bạn nên chỉnh lại nội dung trong `docker-compose.aio.yml` hoặc file config như sau:

1.  **Tinh chỉnh Postgres (Postgres Tuning)**: Giới hạn lượng RAM tối đa sử dụng.
    ```bash
    command: postgres -c 'shared_buffers=64MB' -c 'max_connections=50'
    ```
2.  **Go GC (Garbage Collector)**: Tăng tần suất dọn dẹp RAM của Go.
    ```bash
    environment:
      - GOGC=50  # Tiến hành dọn rác khi bộ nhớ heap tăng 50% (Mức mặc định là 100)
    ```

---

## 4. Khả Năng Mở Rộng (Scalability - Khi nào cần nâng cấp?)
Với cấu hình cơ bản 1 Core / 1GB RAM, hệ thống vẫn có thể chịu tải tốt ở mức:
*   ~500,000 email/tháng (Luồng nhận thư Ingestion).
*   ~50 Người dùng thao tác đồng thời (Web Interface).

=> Với dự tính 10-20 người dùng của bạn, cấu hình này dư sức hoạt động ổn định trong 5 năm tới. 😎
