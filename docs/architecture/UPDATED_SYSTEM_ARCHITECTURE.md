# KIẾN TRÚC HỆ THỐNG SAU CẢI TIẾN (UPDATED SYSTEM ARCHITECTURE)
### SafeHome 3D AI — Nền Tảng An Toàn Không Gian Sống Hợp Nhất

Tài liệu này tổng hợp toàn bộ các cải tiến kiến trúc đã được triển khai trong dự án SafeHome 3D AI để chuyển đổi từ một tập hợp các module rời rạc thành một sản phẩm khép kín, hoạt động ổn định và sẵn sàng sản xuất.

---

## 1. Cải Tiến Kiến Trúc Cốt Lõi (Key Architectural Upgrades)

### 1.1 Hợp Nhất Quy Trình Trải Nghiệm (Unified End-to-End Guided Workflow)
- **Trước**: Người dùng phải tự tìm đường giữa 11 trang giao diện khác nhau (Khảo sát, Thị giác AI, Digital Twin, Simulator, Risk, XAI, Báo cáo...) mà không có trình tự rõ ràng.
- **Sau**: Xây dựng tuyến hành trình chính tại `/workflow` gồm **7 Bước Khép Kín** có máy trạng thái (State Machine):
  1. Khởi tạo hồ sơ khảo sát & Thể trạng người cao tuổi.
  2. Thu thập kích thước, ảnh chụp và checklist nguy cơ.
  3. Phân tích Thị giác AI & Xác minh nhãn (Human-in-the-Loop).
  4. Tự động tổng hợp và dựng Bản sao số 3D (Digital Twin).
  5. Thẩm định nguy cơ bằng 8 Quy tắc xác định (CDC STEADI & WHO 2021).
  6. Mô phỏng can thiệp cải tạo môi trường (What-if Scenario).
  7. Ma trận so sánh Trước/Sau và Xuất kế hoạch hành động thực tế (PDF/JSON).

### 1.2 Giải Quyết Triệt Để Lỗi Chồng Chéo Nhãn 3D (3D Label Clustering System)
- **Trước**: Trong `RoomCanvas.tsx`, tất cả vật thể đều hiển thị đồng thời cả huy hiệu cảnh báo nguy cơ và nhãn tên đồ vật, dẫn đến tình trạng các nhãn đè lên nhau tại góc phòng có nhiều đồ nội thất (giường, tab, thảm, dây điện).
- **Sau**:
  - Tự động gom cụm (Clustering) các cảnh báo nguy cơ nằm trong bán kính `< 0.95m` thành một cụm duy nhất (ví dụ: `[ ⚠️ 2 Mối nguy ]`).
  - Mặc định ẩn nhãn văn bản của các vật thể không có nguy cơ để không gian 3D luôn thoáng đãng.
  - Khi người dùng nhấp chọn hoặc di chuột qua, hiển thị thẻ thông tin nổi bật với hoạt ảnh mượt mà.
  - Đồng bộ nhấp chọn danh sách nguy cơ bên ngoài -> Camera 3D tự động focus mượt mà tới tâm của vật cản.

### 1.3 Tái Cấu Trúc Điều Hướng (Navigation Hierarchy)
- **Thanh menu chính (Primary Journey)**: Rút gọn còn 5 mục chủ đạo:
  1. `Tổng quan & Chỉ số` (`/dashboard`)
  2. `Hành trình an toàn (7 Bước AI)` (`/workflow`)
  3. `Bản sao số 3D` (`/digital-twin`)
  4. `Mô phỏng can thiệp` (`/scenario-simulator`)
  5. `Báo cáo an toàn` (`/reports`)
- **Nhóm công cụ chuyên sâu (Advanced Tools)**: Được đưa vào ngăn kéo có thể thu gọn (Collapsible Drawer), giữ nguyên 100% tính năng cho chuyên viên mà không làm rối người dùng phổ thông.

### 1.4 Đồng Bộ Hóa Cơ Sở Dữ Liệu Thực Tế (Real Persistence API)
- Tạo API endpoints `/api/workflow/save-state` và `/api/workflow/state/[id]`.
- Mọi dữ liệu khảo sát, đồ vật 3D, kịch bản cải tạo và đánh giá rủi ro đều được lưu vào cơ sở dữ liệu SQLite (`prisma/dev.db`), cho phép người dùng tải lại trang (reload) hoặc tiếp tục công việc bất kỳ lúc nào mà không bị mất dữ liệu.

