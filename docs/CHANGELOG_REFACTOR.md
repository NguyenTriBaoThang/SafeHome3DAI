# NHẬT KÝ TÁI CẤU TRÚC VÀ CẢI TIẾN HỆ THỐNG (CHANGELOG REFACTOR)
### SafeHome 3D AI (v1.1.0) — 14/11/2026

---

## 1. Các Tính Năng Mới & Tái Cấu Trúc Toàn Diện

### 1.1 Hành Trình Trải Nghiệm Khép Kín 7 Bước (`/workflow`)
- **Tệp nguồn mới**: `src/app/workflow/page.tsx`
- **Máy trạng thái**: `CREATED → SURVEY_IN_PROGRESS → SURVEY_COMPLETED → SCENE_READY → ASSESSED → SIMULATION_IN_PROGRESS → REASSESSED → REPORT_READY`.
- **7 Phân bước trực quan**:
  - Bước 1: Khởi tạo hồ sơ khảo sát & Thể trạng người cao tuổi.
  - Bước 2: Nhập số đo thực tế và trả lời checklist nguy cơ môi trường.
  - Bước 3: Quét ảnh thị giác AI, gắn bounding box và xác minh người dùng (Human-in-the-Loop).
  - Bước 4: Tự động tổng hợp không gian 3D tương tác.
  - Bước 5: Thẩm định 8 quy tắc rủi ro với tính năng nhấp chọn để camera 3D focus vào vật thể.
  - Bước 6: Mô phỏng can thiệp nhanh 1 chạm (Quick-Fix) và tính toán lại điểm an toàn.
  - Bước 7: Bảng so sánh Trước/Sau và kế hoạch hành động thực tế cho gia đình (Xuất PDF & JSON).

### 1.2 Khắc Phục Lỗi Chồng Chéo Nhãn 3D (3D Label Clustering Engine)
- **Tệp sửa đổi**: `src/components/three/RoomCanvas.tsx`
- **Cải tiến**:
  - Tự động gom cụm các cảnh báo nguy cơ trong bán kính `< 0.95m` thành huy hiệu `[ ⚠️ X Mối nguy ]`.
  - Mặc định ẩn nhãn văn bản của vật thể an toàn để tránh rối mắt.
  - Bổ sung thanh công tắc điều khiển trực tiếp trên 3D HUD: `Cảnh báo nguy cơ`, `Gom cụm chống đè`, `Hiện mọi tên đồ vật`, `Hành lang`.

### 1.3 Tái Thiết Kế Thanh Điều Hướng & Header
- **Tệp sửa đổi**: `src/components/layout/AppSidebar.tsx` và `src/components/layout/AppHeader.tsx`
- **Cải tiến**:
  - Tinh giản Sidebar từ 11 mục ngang hàng thành 5 mục trải nghiệm chính.
  - Chuyển các công cụ chuyên sâu vào mục mở rộng có thể thu gọn (Collapsible).
  - Thêm nút tắt nổi bật "Hành trình 7 Bước" trên Header để người dùng bắt đầu từ bất cứ đâu.

### 1.4 API Lưu Trữ Trạng Thái Quy Trình (Workflow State Persistence)
- **Tệp nguồn mới**:
  - `src/app/api/workflow/save-state/route.ts`: Lưu trữ trạng thái hoàn chỉnh vào SQLite (`Project`, `Home`, `Room`, `SceneObject`, `HomeSurvey`, `SurveyAuditEvent`).
  - `src/app/api/workflow/state/[id]/route.ts`: Khôi phục trạng thái khảo sát và mô phỏng 3D theo `projectId` hoặc `surveyId`.

---

## 2. Các Bài Kiểm Thử Đã Bổ Sung
- `tests/workflowEngine.test.ts`: Kiểm thử đơn vị logic gom cụm nhãn 3D, máy trạng thái 7 bước và chuyển tiếp dữ liệu.
- `tests/workflowIntegration.test.ts`: Kiểm thử tích hợp toàn trình luồng 7 bước không phụ thuộc dịch vụ ngoài.

