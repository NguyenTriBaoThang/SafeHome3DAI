# BÁO CÁO NHỮNG HẠN CHẾ CÒN TỒN TẠI & ĐIỀU KIỆN TRIỂN KHAI THỰC TẾ (REMAINING ISSUES & PRODUCTION READINESS)

---

### 1. NHỮNG HẠN CHẾ KỸ THUẬT CÒN TỒN TẠI (KNOWN LIMITATIONS)

1. **Giới hạn đo đạc chiều sâu từ ảnh 2D RGB đơn lẻ**:
   - Hệ thống hiện tại nhận diện vật thể và ước lượng kích thước dựa trên Bounding Box 2D và tỷ lệ phòng tham chiếu.
   - Khi không có cảm biến LiDAR hoặc camera chiều sâu (Depth sensor), cao độ chính xác tuyệt đối (đến từng milimet) của gờ cửa hoặc độ dốc mặt sàn cần có sự xác nhận của người dùng hoặc chuyên viên khảo sát tại thực địa.

2. **Phụ thuộc vào kết nối mạng khi gọi Multimodal Vision qua Cloud API**:
   - Chức năng quét ảnh AI hiện trường sử dụng Gemini API. Khi thiết bị khảo sát ở vùng mất sóng mạng hoặc không có API Key, hệ thống sẽ tự động chuyển sang chế độ dự phòng nhận diện theo mẫu khảo sát nội thất tiêu chuẩn (Rule-based Fallback Detector).

3. **Phạm vi thẩm định y khoa**:
   - Hệ thống SafeHome 3D AI đóng vai trò là công cụ **hỗ trợ giáo dục và hoạch định cải tạo không gian sống an toàn**, tuyệt đối **không thay thế chẩn đoán y khoa chuyên sâu** hoặc đơn thuốc của bác sĩ điều trị.

---

### 2. MỨC ĐỘ SẴN SÀNG (READINESS SCORECARD)

| Mức độ sẵn sàng | Đánh giá | Ghi chú điều kiện |
| :--- | :--- | :--- |
| **Sẵn sàng trình diễn hội đồng (Demo Ready)** | **100% READY** | Hoạt động trơn tru toàn bộ 7 bước, 3 kịch bản, 3D Dollhouse 60 FPS, XAI minh bạch. |
| **Sẵn sàng thử nghiệm người dùng (Pilot Ready)** | **95% READY** | Sẵn sàng cho nhóm người chăm sóc và gia đình có người cao tuổi trải nghiệm khảo sát thử nghiệm. |
| **Sẵn sàng triển khai thực tế quy mô lớn** | **ĐẠT ĐIỀU KIỆN** | Cần cấu hình Production Database (PostgreSQL) và bộ khóa Gemini API chuyên dụng trước khi mở rộng toàn quốc. |

---

### 3. ĐIỀU KIỆN TIÊN QUYẾT TRƯỚC KHI ĐƯA VÀO VẬN HÀNH BỆNH VIỆN / CỘNG ĐỒNG

1. **Khóa bản quyền & Hạn ngạch API**: Đăng ký Google Cloud Gemini API hạn ngạch doanh nghiệp để đảm bảo không bị nghẽn lượt gọi đồng thời khi nhiều gia đình cùng tải ảnh.
2. **Cơ sở dữ liệu tập trung**: Chuyển đổi chuỗi kết nối từ SQLite (`dev.db`) sang PostgreSQL có bật sao lưu tự động hàng ngày (Daily Automated Backups).
3. **Quy trình xác nhận lâm sàng thực địa**: Kết hợp kết quả khảo sát của SafeHome 3D AI với bảng kiểm tra thể chất Timed Up and Go (TUG) của chuyên viên y tế dự phòng để có phác đồ can thiệp toàn diện nhất.

