# BÁO CÁO KIỂM TOÁN GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX AUDIT)
### SafeHome 3D AI — Định Hướng Thiết Kế "Modern Healthcare Digital Twin Platform"

---

## 1. Vấn Đề Nghiêm Trọng Về Nhãn 3D (3D Label Overlapping Issue — HIGH PRIORITY)

### 1.1 Nguyên nhân gốc rễ (Root Cause)
Trong thành phần `src/components/three/RoomCanvas.tsx`, mỗi vật thể (`room.objects`) đều render một component `<Html>` của thư viện `@react-three/drei` ngay trên đỉnh của vật thể (`obj.position[1] + obj.dimensions.height + 0.25`).
- Khi các vật thể nằm gần nhau trong phòng thực tế (ví dụ: Giường ngủ, Tab đầu giường, Thảm cạnh giường, Dây điện sàn đều nằm trong bán kính 1m ở góc phòng), cả 4 thẻ HTML lớn chứa icon cảnh báo nhấp nháy, text nguy cơ và tên vật thể bị hiển thị đè trực tiếp lên nhau.
- Các thẻ HTML không có cơ chế phát hiện va chạm 2D screen-space, dẫn đến giao diện bị rối mắt, chữ bị che lấp và người dùng không thể nhấp chọn chính xác từng vật thể.

### 1.2 Giải pháp khắc phục triệt để (The Solution)
1. **Chế độ hiển thị phân cấp (Hierarchical Visibility)**:
   - Mặc định: Không hiển thị nhãn văn bản của tất cả các vật thể.
   - Với vật thể có nguy cơ: Chỉ hiển thị một chấm tròn cảnh báo nhỏ gọn (Pulsing Hazard Dot) với màu sắc theo cấp độ nghiêm trọng (Đỏ cho `HIGH/CRITICAL`, Vàng cam cho `MEDIUM`).
2. **Gom cụm cảnh báo thông minh (Smart Marker Clustering)**:
   - Tính toán khoảng cách không gian 3D giữa các điểm cảnh báo: nếu khoảng cách `< 0.8m`, gom các cảnh báo thành một cụm badge duy nhất: ví dụ: `[ 3 Mối nguy ]`.
   - Khi nhấp vào cụm, hiển thị menu nhỏ thả xuống hoặc mở danh sách chi tiết ở panel bên phải.
3. **Tương tác có chọn lọc (Focus on Demand)**:
   - Chỉ khi người dùng Hover chuột vào vật thể hoặc nhấp chọn trong danh sách ở Right Panel, Card thông tin chi tiết mới xuất hiện.
   - Thêm nút bật/tắt rõ ràng trên thanh HUD: `[x] Nhãn tên đồ vật` | `[x] Điểm cảnh báo nguy cơ` | `[x] Lối đi an toàn`.

---

## 2. Kiểm Toán Điều Hướng & Cấu Trúc Thông Tin (Navigation & Information Hierarchy)

### 2.1 Hiện trạng
- Thanh Sidebar hiện có tới **11 liên kết ngang hàng**, bao gồm cả các trang có vai trò tương đương hoặc hỗ trợ (như `Traceability`, `Explainability`, `Analytics`).
- Người dùng không có điểm khởi đầu tự nhiên, không biết thứ tự thực hiện đúng từ việc đo đạc nhà cửa đến việc nhận báo cáo an toàn.

### 2.2 Kiến trúc điều hướng mới (New Navigation Architecture)
- **Menu chính (Main Journey)**:
  1. `Tổng quan (Dashboard)`: Thống kê số lượng khảo sát, chỉ số an toàn trung bình, dự án gần đây.
  2. `Hành trình an toàn (Guided Workflow)`: Quy trình 7 bước tích hợp từ A-Z.
  3. `Không gian số 3D (Digital Twin)`: Bản sao số 3D trực quan, tương tác bố trí.
  4. `Mô phỏng can thiệp (Scenario Simulator)`: Thử nghiệm giải pháp cải tạo và so sánh Before/After.
  5. `Báo cáo & Đề xuất (Reports)`: Xuất kế hoạch cải tạo thực tế, tài liệu y khoa.
- **Công cụ chuyên sâu (Advanced Tools - Có thể thu gọn)**:
  - Khảo sát AI từng bước (`/ai-guided-survey`)
  - Studio Thị giác AI (`/ai-vision`)
  - Trợ lý AI & RAG (`/ai-assistant`)
  - Giải trình XAI chi tiết (`/explainability`)

---

## 3. Kiểm Toán Khả Năng Tiếp Cận & Typography (Accessibility & Typography)
- **Hỗ trợ người cao tuổi & Người chăm sóc**:
  - Tăng độ tương phản màu (Color Contrast ratio >= 4.5:1 đạt chuẩn WCAG 2.2 AA).
  - Cỡ chữ cơ sở từ 14px trở lên; tiêu đề rõ ràng từ 18px đến 26px.
  - Không dựa vào màu sắc là phương tiện báo hiệu duy nhất: luôn kết hợp Icon + Text + Màu sắc (ví dụ: Icon Tam giác cảnh báo + Text "Nguy cơ cao" + Màu đỏ).
  - Tối ưu hóa phông chữ tiếng Việt không bị lỗi font hoặc cắt chữ trên màn hình nhỏ.

