# PLAN-advanced-spam-filter: Bộ lọc tĩnh bảo vệ tính năng Nhận thư rác (Orphan Adoption)

> **Ngữ cảnh**: Người dùng yêu cầu bật tính năng "Nhận con nuôi" (tự động tạo alias cho các email nhận nhầm hoặc email cũ), nhưng cần một bộ lọc nghiêm ngặt để loại bỏ các email rác quá rõ ràng (Ký tự tiếng Nhật, chữ "% OFF", spam tiếp thị) mà không làm ảnh hưởng đến các Luật Spam Động (Dynamic Admin Spam Rules) đang có.

## 1. Chiến lược (Strategy)
Triển khai một bước **Kiểm tra sơ bộ bằng Luật cứng (Hardcoded Pre-flight Check)** dành riêng cho luồng "Nhận con nuôi". Bước kiểm tra này CHỈ chạy khi một email chuẩn bị kích hoạt tiến trình tạo mới Alias Ẩn danh. Các alias đã tồn tại sẽ không bị ảnh hưởng bởi luật này.

## 2. Cách thức triển khai Kỹ thuật (Technical Implementation)

### 2.1 Bộ máy xử lý luật (`internal/smtp/hardcoded_rules.go`)
Tạo một tiện ích (utility) mới để chứa các quy tắc tĩnh này.

**Tiêu chí Chặn (Criteria to Reject):**
1.  **Từ khóa Tiêu đề (Subject Keywords)**:
    - `% OFF`, `SALE`, `Discount`, `Free`
    - Ký tự tiếng Nhật (Dải ký tự `\p{Hiragana}|\p{Katakana}|\p{Han}`) - *Có thể cấu hình lại*
    - `Casino`, `Bet`, `Crypto`, `Lottery`
2.  **Độ uy tín của Người gửi (Sender Reputation)** (Tùy chọn/Cho tương lai):
    - Chặn các đuôi tên miền (TLDs): `.xyz`, `.top`, `.tk` (thường là nguồn spam trong quá trình phục hồi email).

### 2.2 Điểm Tích hợp (`internal/worker/processor.go`)
Chỉnh sửa khối mã *Legacy Adoption*:
```go
if err != nil { // Nếu Alias chưa tồn tại
    // ... kiểm tra biến allow_legacy_adoption ...
    
    // MỚI: Kiểm tra các quy tắc rác bằng luật cứng (Hardcoded Spam Rules)
    if smtp.IsLegacySpam(payload.Sender, subject, body) {
        log.Printf("[Orphan] Từ chối yêu cầu nhận mail từ %s: Nội dung khả nghi", payload.Sender)
        return nil
    }

    // ... Tiếp tục tiến trình tạo alias mới ...
}
```

## 3. Bộ Quy Tắc (Luật Cứng - Hardcoded)

```go
var LegacyBlocklist = []string{
    `(?i)\d+%\s*OFF`,      // "50% OFF"
    `(?i)SALE`,            // "SALE"
    `[\p{Hiragana}\p{Katakana}]`, // Ký tự tiếng Nhật (thường có trong các luồng spam cụ thể)
    `(?i)VIAGRA`,
    `(?i)BITCOIN`,
}
```

## 4. Quá trình Xác minh (Verification)
1.  **Unit Test (Kiểm thử chức năng)**: Test hàm `IsLegacySpam` bằng cách dùng text tiếng Anh sạch và so sánh với text tiếng Nhật chứa mã rác.
2.  **Integration (Kiểm thử tích hợp)**: Thử gửi một mail với Tiêu đề "50% OFF Sushi" đến một alias chưa tồn tại -> Mong đợi: KHÔNG tạo alias.
3.  **Integration (Kiểm thử tích hợp)**: Thử gửi một mail "Hello friend" đến một alias chưa tồn tại -> Mong đợi: TẠO alias mới.

## 5. Kế hoạch Thực thi (Execution Plan)
- [ ] Tạo file `internal/smtp/legacy_rules.go` chứa engine chạy Regex.
- [ ] Tích hợp vào bên trong `internal/worker/processor.go`.
- [ ] Thêm chức năng ghi log đầy đủ để theo dõi chính xác những gì đã bị hệ thống chặn.
