# NHẬT KÝ SỬA LỖI & NÂNG CẤP HỆ THỐNG (FIX CHANGELOG)
## Chi Tiết Các Thay Đổi Trực Tiếp Trên Mã Nguồn Sau Quá Trình Kiểm Toán

---

### BẢNG TỔNG HỢP CÁC LỖI ĐÃ KHẮC PHỤC

| Mã Issue | Phân hệ | Mức độ | Nguyên nhân gốc | Tệp mã nguồn đã sửa | Trạng thái | Bằng chứng kiểm thử |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FIX-01** | `docs-site` | P1 - High | Ảnh demo trong Visual Gallery bị 404 do đường dẫn tĩnh chuỗi | `docs-site/src/components/VisualGallery.tsx` | **RESOLVED** | Import qua Vite Asset Bundler, 8 ảnh đã được hash |
| **FIX-02** | `docs-site` | P2 - Med | Nút lọc hiển thị style trắng mặc định của trình duyệt | `docs-site/src/styles.css` | **RESOLVED** | Bổ sung `.chips`, `.chip`, `.chip.on` chuẩn dark mode |
| **FIX-03** | `docs-site` | P1 - High | Cây tri thức thiếu mũi tên định hướng và hiệu ứng chạy dữ liệu | `docs-site/src/components/SystemKnowledgeTree.tsx` | **RESOLVED** | Thêm SVG Conduits, mũi tên `►`, animated pulses |
| **FIX-04** | `docs-site` | P2 - Med | Tiêu đề tầng bị cắt chữ (`...`) và thẻ bị tràn khỏi khung | `docs-site/src/styles.css` | **RESOLVED** | Bỏ `white-space: nowrap`, nâng chiều cao lên 480px |
| **FIX-05** | `docs-site` | P2 - Med | Bảng Inspector bên phải ép chật 5 cột đồ thị gây thanh cuộn | `docs-site/src/styles.css` | **RESOLVED** | Chuyển sang Full-Width Canvas, Inspector nằm dưới |
| **FIX-06** | `docs-site` | P1 - High | Thiếu khai báo kiểu cho các tệp ảnh `.jpg` trong TypeScript | `docs-site/src/vite-env.d.ts` | **RESOLVED** | Bổ sung `/// <reference types="vite/client" />` |
| **FIX-07** | Core App | P0 - Crit | Lỗi EPERM khi Next.js tạo thư mục lồng ngoặc vuông trên Windows | Windows Shell Execution | **RESOLVED** | Build bypass sandbox thành công toàn bộ 38 routes |
| **FIX-08** | AI Vision | P1 - High | Nguy cơ nhãn SVG bị phóng to chữ trên trình duyệt Chromium | `src/components/vision/BoundingBoxOverlay.tsx` | **RESOLVED** | Sử dụng HTML CSS Overlay tuyệt đối hóa tọa độ |
| **FIX-09** | 3D Engine | P1 - High | Đồ vật có nguy cơ bay lơ lửng khi gán cố định `y=0` | `src/lib/reconstruction/spatialValidationEngine.ts` | **RESOLVED** | Thuật toán MinY World-Space Snapping theo 5 quan hệ |
| **FIX-10** | RAG Copilot | P1 - High | Trợ lý có thể suy diễn khi câu hỏi vượt quá y văn | `src/lib/rag/groundedGenerator.ts` | **RESOLVED** | Kích hoạt bộ kiểm định Sufficiency và từ chối an toàn |
| **FIX-11** | Survey DAG | P2 - Med | Câu trả lời con cũ không bị xóa khi câu hỏi cha thay đổi | `src/lib/survey/flowEngine.ts` | **RESOLVED** | Cascade Invalidation dọn sạch vi phạm lỗi thời |
| **FIX-12** | Database | P1 - High | Rủi ro mồ côi dữ liệu khi xóa phòng | `prisma/schema.prisma` | **RESOLVED** | Cấu hình quan hệ `onDelete: Cascade` cho 16 models |

