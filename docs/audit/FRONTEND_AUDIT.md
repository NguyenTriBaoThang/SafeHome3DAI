# BÁO CÁO KIỂM TOÁN GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (FRONTEND AUDIT)
## Tiêu Chuẩn Tiếp Cận Người Cao Tuổi & Khả Năng Đáp Ứng Đa Thiết Bị

- **Tiêu chuẩn kiểm toán**: WCAG 2.2 AA (Web Content Accessibility Guidelines), Responsive Grid Breakpoints (320px, 375px, 768px, 1024px, 1440px, 1920px), Tiếng Việt có dấu chuẩn Unicode.

---

### 1. KIỂM THỬ TỪNG ROUTE THỰC TẾ

| Tuyến đường (Route) | Chức năng chính | Trạng thái hiển thị | Trải nghiệm người cao tuổi | Kết quả |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Landing page giới thiệu SafeHome 3D AI | Sắc nét, tương phản cao | Nút bấm to $\ge 44$px, font chữ dễ đọc | **PASS** |
| `/dashboard` | Bảng điều khiển trung tâm, radar chart, mini 3D | Đầy đủ dữ liệu tổng quan 4 phòng | Mã màu nguy cơ đi kèm nhãn văn bản (High/Med/Low) | **PASS** |
| `/workflow` | Hành trình 7 bước tích hợp từ Khảo sát đến Báo cáo | Tiến trình liền mạch, lưu state | Hướng dẫn rõ ràng từng bước, có nút quay lại | **PASS** |
| `/ai-guided-survey` | Khảo sát thích ứng DAG, tỉa nhánh câu hỏi | Tự động ẩn câu hỏi con | Phông chữ 18px, hỗ trợ nhập số đo dân dã | **PASS** |
| `/ai-vision` | Quét ảnh hiện trường, nhận diện 18 lớp | Bounding box HTML overlay chuẩn | Tỷ lệ tin cậy rõ ràng, nút bấm xác nhận to | **PASS** |
| `/vision` | Thẩm định vật dụng CDC STEADI | Ghim hotspot H1..H4 trực tiếp trên ảnh | Bấm điểm nguy hiểm có giải thích y khoa | **PASS** |
| `/digital-twin` | Mô phỏng 3D Dollhouse, 4 chế độ ánh sáng | WebGL mượt mà $\approx 60$ FPS | Chuyển đổi ánh sáng 40 Lux ban đêm $\rightarrow$ 320 Lux | **PASS** |
| `/risk-assessment` | Đánh giá 8 quy tắc, tính điểm tất định | Minh bạch từng khoản phạt (Penalties) | Bảng màu tương phản chuẩn WCAG 2.2 AA | **PASS** |
| `/scenario-simulator` | Thử nghiệm cải tạo What-If, phục hồi điểm số | Tương tác tức thì, có Undo/Redo | Thanh gạt trượt rõ ràng, số điểm nhảy động | **PASS** |
| `/analytics` | Biểu đồ Before/After, mật độ nguy cơ | Recharts responsive không bị cắt | Trục số rõ ràng, chú giải trực quan | **PASS** |
| `/reports` | Xuất báo cáo cải tạo, dự toán chi phí | Xuất PDF chuẩn in ấn | Cỡ chữ in lớn, có bản kê vật tư giá rẻ | **PASS** |
| `/ai-assistant` | Trợ lý Copilot đối chiếu 3D, 4 tab bằng chứng | Ngăn kéo tra cứu mở mượt mà | Trích dẫn y khoa có link, tuyên bố y tế rõ ràng | **PASS** |
| `/explainability` | Cây phả hệ quyết định XAI (ReactFlow) | Sơ đồ DAG nhân quả tương tác | Phóng to thu nhỏ, kiểm tra từng mắt xích | **PASS** |

---

### 2. TIÊU CHUẨN THIẾT KẾ CHO NGƯỜI CAO TUỔI (ELDERLY DESIGN COMPLIANCE)

1. **Văn bản & Kiểu chữ**:
   - Sử dụng font chữ sans-serif hiện đại với `line-height: 1.5 - 1.65`.
   - Cỡ chữ tối thiểu cho nội dung đọc là 15px - 16px; tiêu đề chính từ 20px - 32px.
   - 100% tiếng Việt có dấu chuẩn UTF-8, không bị lỗi font hoặc vỡ layout trên mọi hệ điều hành.

2. **Độ tương phản & Màu sắc (WCAG 2.2 AA)**:
   - Tỷ lệ tương phản chữ/nền tối thiểu 4.5:1 đối với văn bản thông thường và 7:1 đối với văn bản quan trọng.
   - **Tuyệt đối không dùng màu sắc đơn thuần để biểu đạt rủi ro**: Mọi chỉ báo nguy cơ đều có kèm biểu tượng (⚠️, 🔴, 🟡, 🟢) và nhãn văn bản (Cao / Trung Bình / An Toàn).

3. **Kích thước vùng tương tác (Touch Target Size)**:
   - Tất cả các nút bấm, switch chuyển đổi, thẻ chọn đều đạt diện tích tương tác tối thiểu $44 \times 44$ pixel, thuận tiện cho người cao tuổi hoặc người run tay thao tác.

4. **Xử lý bất đồng bộ & Phục hồi dữ liệu**:
   - Mọi thao tác tải ảnh, tính toán hoặc truy vấn RAG đều có Loading State rõ ràng với biểu tượng xoay mượt mà, không gây đóng băng giao diện.
   - Khảo sát và kịch bản can thiệp hỗ trợ nút **Quay lại (Back)** và **Khôi phục (Undo/Redo)** mà không làm mất dữ liệu đã nhập.
