# HARDWARE_SIZING.md - Resource Strategy (10-20 Users)

> **Context**: Small scale deployment (Family/Team/Personal use)
> **Stack**: Go (Fiber) + Postgres + Redis + React (Static)
> **Architecture**: Single Container (AIO)

---

## 1. Resource Breakdown (Phân tích tiêu thụ)

### **RAM (Memory)** - *Critical Resource*
*   **MailHub App (Go)**: Cực nhẹ. Idle ~20MB, Load ~100MB.
*   **Postgres**: Mặc định tốn ~150-200MB (nếu tune lại `shared_buffers` thì giảm đc).
*   **Redis**: Lưu queue và cache nhẹ, ~50MB.
*   **System (Linux Kernel)**: ~150MB.

👉 **Tổng ước tính**: ~500MB - 600MB RAM.

### **CPU**
*   **Go Runtime**: Xử lý concurrent cực tốt, idle gần như 0%.
*   **Spam Filter (Regex)**: Tốn CPU nhất khi có mail đến (Regex matching).
*   **Worker**: Chạy nền nhẹ nhàng.

👉 **Khuyến nghị**: 1 vCPU là quá đủ.

### **Disk (Storage)**
*   **Docker Image**: ~100MB (Alpine base).
*   **Postgres Data**:
    *   10 user x 50 aliases = 500 aliases.
    *   Mỗi ngày 1000 email rác (vài KB text) + 500 email HTML (vài chục KB).
    *   Retention 30 ngày -> Cần khoảng 2GB - 5GB lưu trữ.

---

## 2. Recommended Specs (Cấu hình đề xuất)

### ✅ Lựa chọn tối ưu (Best Value)
*   **RAM**: 1GB (Có thể dùng SWAP nếu đầy).
*   **CPU**: 1 Core.
*   **Disk**: 10GB - 20GB SSD.
*   **Loại VPS**:
    *   **Cloudflare Tunnel**: Không cần IP tĩnh, chạy tại nhà (Home Server) hoặc VPS NAT.
    *   **Provider gợi ý**: DigitalOcean ($4/mo), Hetzner (€4/mo), hoặc Vultr ($3.5/IPv6).

### ⚡ Lựa chọn tiết kiệm (Low End)
*   **RAM**: 512MB (BẮT BUỘC PHẢI TẠO SWAP 1GB).
*   **CPU**: Shared Core.
*   **Disk**: 5GB.
*   *Lưu ý*: Postgres có thể bị OOM Kill nếu không có Swap.

---

## 3. Tuning Guide for Low-End VPS

Để chạy mượt trên VPS 1GB RAM, bạn nên chỉnh `docker-compose.aio.yml` hoặc file config như sau:

1.  **Postgres Tuning**: Giới hạn RAM.
    ```bash
    command: postgres -c 'shared_buffers=64MB' -c 'max_connections=50'
    ```
2.  **Go GC**: Tăng tần suất dọn RAM.
    ```bash
    environment:
      - GOGC=50  # Dọn rác khi heap tăng 50% (Mặc định 100)
    ```

---

## 4. Scalability (Khi nào cần nâng cấp?)
Cấu hình 1 Core / 1GB RAM có thể chịu tải:
*   ~500,000 email/tháng (Ingestion).
*   ~50 Concurrent Users (Web Interface).

=> Với 10-20 user của bạn, cấu hình này dư sức chạy 5 năm nữa. 😎
