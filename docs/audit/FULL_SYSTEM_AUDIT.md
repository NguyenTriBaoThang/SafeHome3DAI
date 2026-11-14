# BÁO CÁO KIỂM TOÁN HỆ THỐNG TOÀN DIỆN (FULL SYSTEM AUDIT)
### SafeHome 3D AI — Nền Tảng Bản Sao Số & An Toàn Không Gian Sống Cho Người Cao Tuổi

- **Ngày thực hiện**: 14/11/2026
- **Nhóm kiểm toán**: Principal Software Architect, Senior Full-Stack Engineer, AI/RAG Engineer, Three.js Engineer, UI/UX Designer, QA Automation Engineer.
- **Trạng thái kho mã nguồn**: `SafeHome3DAI (v1.0.0)` — Next.js 14.2.5 (App Router), TypeScript 5.5, Prisma 5.22, SQLite (`prisma/dev.db`), Tailwind CSS 3.4, React Three Fiber 8.16, Zustand 4.5.

---

## 1. Kiến Trúc Tổng Thể Hiện Tại (Current System Architecture)

Hệ sinh thái SafeHome 3D AI bao gồm các khối thành phần:
1. **Frontend Layer**: Next.js 14 App Router với 11 trang giao diện độc lập (`/dashboard`, `/ai-guided-survey`, `/ai-vision`, `/digital-twin`, `/scenario-simulator`, `/risk-assessment`, `/risk-assessment/traceability`, `/ai-assistant`, `/analytics`, `/explainability`, `/reports`).
2. **3D Digital Twin Simulation Engine**: Three.js, `@react-three/fiber`, `@react-three/drei` với mô hình nội thất thủ tục (`ProceduralFurniture.tsx`), quản lý trạng thái bằng Zustand (`useSimulationStore.ts`).
3. **AI Vision Studio**: Tiếp nhận ảnh chụp/webcam, kiểm định magic bytes, khử EXIF, phân loại 15 thực thể nội thất, nhận diện quan sát bất định và tạo câu hỏi làm rõ (`/ai-vision`).
4. **AI Guided Survey Engine**: Khảo sát thích ứng từng câu hỏi, nhánh hóa động, phân tích NLP ngôn ngữ tự nhiên, tính điểm hoàn thiện và tổng hợp `RoomProfile` (`/ai-guided-survey`).
5. **Deterministic Risk Intelligence Engine**: Động cơ thẩm định 8 quy tắc nguy cơ môi trường (CDC STEADI & WHO), phân cấp ưu tiên và tính toán chỉ số an toàn.
6. **Trustworthy Healthcare RAG**: Tra cứu tài liệu khoa học WHO 2021, CDC STEADI 2019, kiểm định trích dẫn nguồn, từ chối câu hỏi ngoài phạm vi y khoa.
7. **Database & Storage Layer**: SQLite quản lý bởi Prisma ORM với 16 models lưu trữ thông tin khảo sát, ảnh, phát hiện thị giác, kịch bản, và nhật ký kiểm toán.

---

## 2. Phân Loại Trạng Thái Hoạt Động Của Các Module (Module Operational Status)

### 2.1 Module Hoạt Động Đầy Đủ (Fully Operational — PASS)
- **AI Guided Survey (`/ai-guided-survey`)**: Tạo khảo sát, lưu câu trả lời vào database, nhánh hóa câu hỏi, invalidation answers, tính completeness, kiểm tra 46 unit/integration tests.
- **AI Vision Intelligence (`/ai-vision`)**: Upload ảnh, webcam capture, loại bỏ EXIF, magic bytes check, canvas SVG zoom/pan, vẽ bbox thủ công, xác minh câu hỏi làm rõ, đồng bộ khảo sát, tái đánh giá rủi ro.
- **AI Chat Copilot & RAG Pipeline (`/ai-assistant`, `/api/ai/chat`)**: Tra cứu văn bản y khoa chính thống, từ chối ảo giác, hiển thị trích dẫn nguồn chính xác (WHO/CDC), streaming chat.
- **Risk Intelligence Engine (`src/lib/risk/`)**: 8 quy tắc rủi ro xác định (`ruleEngine.ts`, `riskRuleRegistry.ts`), tính toán chỉ số ưu tiên, phân loại severity.

### 2.2 Module Hoạt Động Một Phần (Partial Operational — PARTIAL)
- **Digital Twin 3D (`/digital-twin`)**: Khởi tạo scene Three.js, camera controls (Isometric/Top/Front), chọn vật thể, đổi vị trí, khôi phục gốc, NHƯNG chủ yếu đọc từ `mockRooms.ts` trong Zustand store, chưa tự động đồng bộ từ database khảo sát mới nhất của người dùng.
- **Scenario Simulator (`/scenario-simulator`)**: Mô phỏng thay đổi vật thể (luồn dây, dán thảm, thêm tay vịn), tính toán delta so sánh trước/sau, NHƯNG chưa lưu trực tiếp snapshot vào bảng `SimulationScenario` trong database mà chỉ lưu in-memory.
- **Báo cáo an toàn (`/reports`)**: Xuất báo cáo in PDF và file JSON, NHƯNG thông tin chủ hộ còn hardcoded (`"Bác Nam 75 tuổi"`), chưa liên kết động với Survey ID thực tế.

### 2.3 Các Điểm Trùng Lặp & Phân Mảnh (Redundancies & Duplications)
1. **Trùng lặp Rule Engine**: Tồn tại 2 file đánh giá rủi ro:
   - `src/features/risk-engine/rules.ts` (viết riêng cho Zustand in-memory simulation).
   - `src/lib/risk/ruleEngine.ts` (viết chuẩn cho Database & Survey API).
2. **Trùng lặp trang chức năng**:
   - `/risk-assessment` và `/risk-assessment/traceability` và `/explainability` có nhiều thành phần UI giải trình XAI tương tự nhau.
   - `/digital-twin` và `/scenario-simulator` đều tải lại toàn bộ canvas 3D với các thanh công cụ gần như giống hệt nhau.
3. **Quá tải Navigation**: Thanh menu bên trái (Sidebar) hiển thị 11 liên kết ngang hàng, khiến người dùng không biết phải bắt đầu từ đâu và kết thúc ở đâu.

### 2.4 Các Luồng Dữ Liệu Bị Đứt (Broken Data Flows)
1. **Survey / Vision sang 3D Digital Twin**: Sau khi hoàn thành khảo sát tại `/ai-guided-survey` hoặc tải ảnh tại `/ai-vision`, người dùng nhấp sang `/digital-twin` thì vẫn thấy phòng mẫu (`room-bedroom-01`) thay vì phòng thực tế vừa khảo sát.
2. **Digital Twin sang Báo Cáo**: Các thay đổi vị trí 3D được lưu trong Zustand store, nhưng trang `/reports` không có cơ chế chọn tải lại từ một `Project ID` hoặc `Assessment ID` đã lưu trong database.

### 2.5 Nợ Kỹ Thuật (Technical Debt) & Vấn Đề Giao Diện 3D
1. **Chồng chéo nhãn 3D (Label & Badge Overlapping)**: Trong `src/components/three/RoomCanvas.tsx`, tất cả vật thể đều hiển thị đồng thời cả huy hiệu cảnh báo nguy cơ và nhãn tên đồ vật, dẫn đến tình trạng các nhãn đè lên nhau tại góc phòng có nhiều đồ nội thất (giường, tab, thảm, dây điện).
2. **Thiếu Guided Workflow Stepper**: Chưa có thanh tiến trình 7 bước hướng dẫn người dùng đi theo lộ trình chuẩn.

---

## 3. Bảng Kiểm Toán Chi Tiết Các Tính Năng (Feature Audit Table)

| Feature | Route | Source File | UI Status | Backend Status | Persistence | Test Coverage | Problem / Gap | Priority | Đề Xuất Sửa Đổi |
|---|---|---|---|---|---|---|---|:---:|---|
| **Dashboard** | `/dashboard` | `src/app/dashboard/page.tsx` | PASS | PARTIAL | Partial (Mock + DB) | Partial | Số liệu thống kê chưa liên kết 100% với danh sách dự án DB thực tế | P1 | Kết nối với `prisma.homeSurvey.count()` và `prisma.assessment.findMany()` |
| **Guided Survey** | `/ai-guided-survey` | `src/app/ai-guided-survey/page.tsx` | PASS | PASS | DB SQLite | 100% (46 tests) | Trang riêng biệt, chưa gắn liền với thanh quy trình 7 bước | P1 | Tích hợp vào Step 1 & Step 2 của Guided Workflow |
| **AI Vision Studio** | `/ai-vision` | `src/app/ai-vision/page.tsx` | PASS | PASS | DB SQLite | 100% (16 tests) | Chưa có nút bấm chuyển nhanh dữ liệu nhận diện sang dựng phòng 3D | P0 | Bổ sung nút "Chuyển sang Không gian 3D" kích hoạt `sceneDraftAdapter` |
| **Digital Twin 3D** | `/digital-twin` | `src/app/digital-twin/page.tsx` | PASS | PARTIAL | In-Memory (Zustand) | Needs 3D Test | Nhãn 3D chồng chéo; chưa tải phòng từ khảo sát người dùng | P0 | Khử chồng nhãn, thêm cơ chế `loadRoomFromSurvey(surveyId)` |
| **Scenario Simulator**| `/scenario-simulator` | `src/app/scenario-simulator/page.tsx` | PASS | PARTIAL | In-Memory | Partial | Mô phỏng tính toán tốt nhưng chưa lưu bản ghi vào `SimulationScenario` DB | P1 | Bổ sung API lưu snapshot kịch bản vào cơ sở dữ liệu |
| **Risk Assessment** | `/risk-assessment` | `src/app/risk-assessment/page.tsx` | PASS | PASS | DB SQLite | 100% (21 tests) | Giao diện còn tách biệt với không gian mô phỏng 3D | P1 | Nhúng trực tiếp vào panel bên phải của không gian 3D |
| **XAI Traceability** | `/risk-assessment/traceability` | `src/app/risk-assessment/traceability/page.tsx` | PASS | PASS | DB SQLite | Covered | Trùng lặp nội dung với trang giải trình | P2 | Hợp nhất vào ngăn kéo ngữ cảnh (Drawer) của mục Đánh giá |
| **AI Assistant RAG** | `/ai-assistant` | `src/app/ai-assistant/page.tsx` | PASS | PASS | DB SQLite | 100% (15 tests) | Là trang chat độc lập, người dùng trong 3D khó gọi hỗ trợ | P1 | Tích hợp AI Copilot thành cửa sổ trôi (Floating Chat) hoặc tab ngữ cảnh |
| **Báo Cáo An Toàn** | `/reports` | `src/app/reports/page.tsx` | PASS | PARTIAL | In-Memory Export | Manual | Dữ liệu nhân khẩu học còn hardcoded; chưa chọn được dự án cũ | P0 | Cho phép chọn Project / Survey, load dữ liệu thật, xuất PDF chuyên nghiệp |

---

## 4. Kế Hoạch Tái Cấu Trúc Toàn Diện (Comprehensive Refactoring Plan)

1. **Xây dựng Trang Quy Trình Xuyên Suốt (End-to-End Guided Workflow)**:
   - Tạo trang `/workflow` với Stepper 7 bước:
     `Khảo sát -> Thu thập ảnh/thông số -> Thị giác AI -> Bản sao số 3D -> Đánh giá nguy cơ -> Mô phỏng cải thiện -> So sánh & Báo cáo`.
2. **Khắc phục triệt để lỗi chồng chéo nhãn 3D (3D Label Clustering & Smart Markers)**:
   - Chuyển từ việc hiển thị tất cả nhãn HTML sang cơ chế:
     - Mặc định ẩn text dài, chỉ hiển thị Icon/Chấm cảnh báo nguy cơ nhỏ gọn (Discrete hazard dot).
     - Gom cụm (Clustering) các cảnh báo nếu khoảng cách Euclidean trong 3D `< 0.8m`.
     - Chỉ mở Card chi tiết khi người dùng Hover hoặc Nhấp chọn vật thể.
     - Đồng bộ nhấp chọn danh sách ở Right Panel -> Camera 3D di chuyển mượt mà tới tâm vật thể.
3. **Thống nhất Động cơ Đánh giá Rủi ro (Unify Risk Engine)**:
   - Kết nối trực tiếp logic đánh giá 8 quy tắc của `src/lib/risk/ruleEngine.ts` với `useSimulationStore.ts`.
4. **Tổ chức lại Kiến trúc Điều hướng (Streamline Navigation)**:
   - Rút gọn menu chính còn 5 mục cốt lõi, đưa các công cụ phân tích sâu vào mục nâng cao.
5. **Đồng bộ hóa dữ liệu khảo sát và 3D Digital Twin**:
   - Viết API `POST /api/workflow/sync-scene` lưu trữ và khôi phục trạng thái hoàn chỉnh.

