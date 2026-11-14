# BÁO CÁO KIỂM TOÁN DIGITAL TWIN 3D & AI RAG
### SafeHome 3D AI

---

## 1. Kiểm Toán Digital Twin 3D Engine

### 1.1 Khả Năng Hiển Thị & Tương Tác
- **WebGL Engine**: `@react-three/fiber` kết hợp Three.js core.
- **Dựng hình nội thất (Procedural Furniture)**: Hỗ trợ giường ngủ (`bed`), tủ đầu giường (`nightstand`), tủ quần áo (`wardrobe`), thảm trải sàn (`rug`), dây điện sàn (`cable`), bồn cầu (`toilet`), vòi sen (`shower`), thanh tay vịn (`grab_bar`), sofa (`sofa`), đèn cảm biến (`lamp`).
- **Tương tác**: Cho phép người dùng nhấp chọn vật thể, đổi vị trí, xoay góc, thêm thiết bị hỗ trợ an toàn (tay vịn, thảm cao su chống trượt, đèn ngủ cảm ứng), khôi phục vị trí ban đầu.
- **Điểm yếu đã xác định**:
  - Nhãn HTML 3D đè lên nhau (Đã có giải pháp gom cụm và ẩn nhãn mặc định).
  - Tải lại trang bị mất trạng thái tùy biến vì chưa tự động ghi xuống bảng `SceneSnapshot` trong database.

---

## 2. Kiểm Toán AI, Multimodal Vision & RAG Pipeline

### 2.1 Tính Trung Thực Của Mô Hình & Không Gian 2D/3D (Scientific Integrity)
- **Cam kết không bịa đặt (Zero Hallucination)**:
  - Thị giác AI từ ảnh 2D tĩnh tuyệt đối không khẳng định khoảng cách mét tuyệt đối khi chưa có hiệu chuẩn quang sai; mọi tọa độ 3D chuyển đổi từ 2D đều gắn nhãn minh bạch `isEstimate: true`.
  - Hệ thống không tự động suy đoán tình trạng đèn đêm từ ảnh chụp ban ngày; trường hợp này được gắn nhãn `SPATIAL_UNCERTAINTY` và hỏi lại người dùng qua câu hỏi làm rõ.
- **RAG & Trích dẫn nguồn (Source Traceability)**:
  - Tất cả các khuyến nghị can thiệp môi trường đều đối chiếu với tài liệu y tế chính thống:
    - **WHO (2021)**: Step Safety & Fall Prevention Guidelines for Older Adults.
    - **CDC STEADI (2019)**: The 30-60-90 Environmental Algorithm & Grab Bar Weight Capacity (250 lbs).
  - Không sinh URL hoặc tài liệu trích dẫn giả mạo; nếu thiếu dữ liệu, hệ thống thông báo minh bạch "Cần kiểm tra thêm".

