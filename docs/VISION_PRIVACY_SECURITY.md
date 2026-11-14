# Bảo Mật Và Quyền Riêng Tư Dữ Liệu Thị Giác (Vision Privacy & Security)

Hình ảnh không gian sống gia đình, đặc biệt là phòng ngủ và phòng tắm của người cao tuổi, là dữ liệu cá nhân nhạy cảm bậc nhất trong y tế gia đình. Phân hệ **SafeHome Vision Intelligence** áp dụng tiêu chuẩn bảo mật đa lớp nghiêm ngặt.

---

## 1. Kiểm Tra Tính Hợp Lệ Tập Tin (Binary Magic Bytes Validation)

Hệ thống **không chỉ dựa vào phần mở rộng tệp (.jpg, .png)** mà đọc trực tiếp các byte đầu tiên (Magic Bytes) của bộ đệm nhị phân trước khi lưu trữ:
- **JPEG**: Bắt đầu bằng 3 byte `0xFF, 0xD8, 0xFF`
- **PNG**: Bắt đầu bằng 8 byte `0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`
- **WebP**: Bắt đầu bằng ký tự `RIFF` và `WEBP` tại vị trí byte 8..11

Mọi tệp tin thực thi giả mạo hoặc tệp độc hại có đuôi `.jpg` đều bị phát hiện và từ chối với mã lỗi `400 BAD_REQUEST`.

---

## 2. Loại Bỏ Triệt Để Siêu Dữ Liệu EXIF (EXIF Metadata Stripping)

Máy ảnh điện thoại thông minh thường tự động nhúng các thông tin nhạy cảm vào ảnh:
- Tọa độ địa lý GPS chính xác đến từng mét (Vĩ độ, Kinh độ, Độ cao).
- Tên thiết bị, số serial máy, phiên bản hệ điều hành.
- Thời gian chụp chi tiết.

Bộ lọc `imagePreprocessor.ts` tự động phát hiện và bóc tách hoàn toàn các phân đoạn EXIF (`APP1` marker `0xFFE1`) khỏi ảnh JPEG trước khi ghi vào đĩa hoặc gửi qua API, đảm bảo không thể truy vết vị trí địa lý của gia đình.

---

## 3. Quản Lý Tên Tập Tin Và Quyền Truy Cập (Safe Storage & Isolation)

- **Tên tệp ngẫu nhiên UUID**: Tên tệp gốc của người dùng được thay thế bằng chuỗi định danh mã hóa an toàn: `<uuid>.<ext>`, triệt tiêu nguy cơ tấn công duyệt thư mục (*Path Traversal*).
- **Giới hạn kích thước**: Tối đa 10 MB cho mỗi ảnh để ngăn chặn tấn công từ chối dịch vụ (DoS).
- **Nhật ký kiểm toán (Audit Trail)**: Mọi thao tác tải ảnh, xóa ảnh, xác nhận nhãn hoặc sửa nhãn đều được ghi lại trong bảng `VisionAuditEvent` với thời gian thực và định danh tác nhân.
- **Quyền xóa dữ liệu (Right to Erasure)**: Người dùng có quyền bấm nút xóa ảnh bất kỳ lúc nào; tệp ảnh vật lý trên ổ đĩa và các bản ghi phân tích trong cơ sở dữ liệu sẽ bị xóa vĩnh viễn ngay lập tức (`CASCADE`).

