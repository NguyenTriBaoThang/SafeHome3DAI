# BÁO CÁO KIỂM TOÁN AN TOÀN THÔNG TIN & QUYỀN RIÊNG TƯ (SECURITY AUDIT)
## Kiểm Định Theo Tiêu Chuẩn OWASP Top 10, Bảo Mật Ảnh Hiện Trường & Quản Lý Khóa Bí Mật

- **Phạm vi kiểm toán**: File Upload Handler, API Route Authentication, Session Management, EXIF Metadata, Prompt Injection, Client-side Key Exposure.

---

### 1. BẢNG KIỂM TRA LỖ HỔNG THEO OWASP TOP 10

| Hạng mục OWASP | Rủi ro tiềm ẩn | Biện pháp bảo vệ triển khai thực tế | Trạng thái |
| :--- | :--- | :--- | :--- |
| **A01: Broken Access Control** | Người dùng xem dữ liệu phòng của người khác | Ràng buộc quyền truy cập theo `homeId`/`roomId` sở hữu | **PASS** |
| **A02: Cryptographic Failures** | Lộ API Key hoặc token nhạy cảm | API Key Gemini lưu trong biến môi trường server-side | **PASS** |
| **A03: Injection** | SQL Injection hoặc Prompt Injection | Prisma ORM tham số hóa 100%; Sanitized Prompting | **PASS** |
| **A04: Insecure Design** | Tin tưởng tuyệt đối dữ liệu đầu vào | Schema Validation bằng Zod v3.23 trên mọi endpoint | **PASS** |
| **A05: Security Misconfiguration** | CORS mở rộng hoặc lộ stack trace | CORS chặt chẽ, ẩn lỗi chi tiết ở môi trường production | **PASS** |
| **A06: Vulnerable Components** | Dependencies lỗi thời | Kiểm toán qua `npm audit`, không có lỗ hổng mức Critical | **PASS** |
| **A07: Identification & Auth** | Giả mạo phiên làm việc | Phiên làm việc được định danh bằng UUID v4 bất biến | **PASS** |
| **A08: Software & Data Integrity**| Dữ liệu rác làm sai lệch điểm an toàn | Stale Dependency Purger cascade xóa sạch vi phạm lỗi thời | **PASS** |
| **A09: Logging & Monitoring** | Lộ thông tin cá nhân trong log | Loại bỏ mật khẩu, số điện thoại và tọa độ GPS khỏi logs | **PASS** |
| **A10: Server-Side Request Forgery**| SSRF qua upload ảnh hoặc URL | Chỉ chấp nhận multipart file trực tiếp, chặn fetch URL ngoài | **PASS** |

---

### 2. KIỂM ĐỊNH AN TOÀN TẢI LÊN HÌNH ẢNH (SECURE FILE UPLOAD)

1. **Xác thực Magic Bytes nhị phân (Binary Header Inspection)**:
   - Hệ thống không tin tưởng phần mở rộng tệp tin `.jpg`/`.png` từ client gửi lên.
   - Hàm `validateImageMagicBytes()` kiểm tra trực tiếp các byte đầu tiên:
     - JPEG: `FF D8 FF`
     - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - Bất kỳ tệp thực thi nào đội lốt ảnh đều bị từ chối ngay lập tức tại tầng gateway với mã lỗi `HTTP 400 Bad Request`.

2. **Cắt bỏ hoàn toàn siêu dữ liệu EXIF / GPS**:
   - Hình ảnh không gian sống của người cao tuổi chứa thông tin nhạy cảm về vị trí địa lý của gia đình.
   - Toàn bộ ảnh được xử lý qua bộ lọc nhị phân cắt bỏ các khối metadata EXIF, GPS và Serial thiết bị trước khi lưu trữ hoặc chuyển tiếp đến AI.

