# 📚 Tài liệu Dự án MailHub

Chào mừng đến với thư mục tài liệu của dự án MailHub. Các tài liệu ở đây được chia thành các nhóm chính để bạn dễ dàng tra cứu và nắm bắt hệ thống.

---

## 🚀 Triển khai & Thiết lập (Deployment & Setup)
Hướng dẫn chi tiết cách dựng server, cấu hình cơ sở dữ liệu và yêu cầu phần cứng.

*   [CT-APPS-DEPLOY.md](./CT-APPS-DEPLOY.md): Hướng dẫn cài đặt và deploy hai ứng dụng chính (Shop & AWF-MAIL) lên Proxmox Container (Node.js, Go, PM2, Nginx).
*   [CT-DATABASE-SETUP.md](./CT-DATABASE-SETUP.md): Hướng dẫn dựng và tinh chỉnh PostgreSQL & Redis trên một Proxmox Container riêng biệt để phục vụ database.
*   [HARDWARE_SIZING.md](./HARDWARE_SIZING.md): Chiến lược cấp phát phần cứng và tài nguyên cho hệ thống với quy mô 10-20 người dùng.

---

## 📝 Đánh giá & Kế hoạch (Assessment & Plans)
Các tài liệu liên quan đến việc đánh giá hiện trạng mã nguồn, phân tích lỗi và lên kế hoạch phát triển các tính năng tiếp theo.

*   [PROJECT_ASSESSMENT.md](./PROJECT_ASSESSMENT.md): Báo cáo đánh giá tổng quan về kiến trúc và tính năng của MailHub hiện tại so với các đối thủ (MVP+ Status).
*   [PLAN-project-audit.md](./PLAN-project-audit.md): Kế hoạch kiểm tra sức khỏe hệ thống (Audit), các rủi ro tồn đọng và ý tưởng cho phiên bản V2 (AI, Scale).
*   [PLAN-advanced-spam-filter.md](./PLAN-advanced-spam-filter.md): Kế hoạch và thiết kế kỹ thuật cho bộ lọc tĩnh chống thư rác (Spam Filter) khi hệ thống kích hoạt tính năng nhận con nuôi (Orphan Adoption).

---

> 💡 **Lưu ý**: Hệ thống tài liệu này được thiết kế để liên tục cập nhật theo quá trình phát triển của dự án. Nếu bạn thêm route/api mới, hãy xem xét bổ sung vào thư mục này để dễ dàng bảo trì.
