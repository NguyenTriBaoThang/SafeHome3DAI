# BÁO CÁO KIỂM TOÁN FRONTEND & BACKEND (ENGINEERING AUDIT)
### SafeHome 3D AI

---

## 1. Kiểm Toán Frontend Architecture

### 1.1 Khảo sát các thành phần React & Quản lý trạng thái
- **Framework**: Next.js 14.2.5 với App Router, React 18, TypeScript 5.5.
- **Quản lý trạng thái**: Zustand (`useSimulationStore.ts`) được dùng làm kho lưu trữ in-memory cho 3D scenes và kịch bản can thiệp.
- **Ưu điểm**:
  - Không có lỗi type checking (`tsc --noEmit` đạt 0 lỗi).
  - Component hóa tốt với Tailwind CSS và Lucide Icons.
- **Tồn tại kỹ thuật**:
  - `useSimulationStore` phụ thuộc vào dữ liệu khởi tạo tĩnh từ `@/data/mockRooms`. Khi người dùng tạo khảo sát hoặc chụp ảnh ở trang khác, trạng thái trong store chưa tự động đọc dữ liệu từ DB để cập nhật phòng 3D tương ứng.
  - Các trang `/digital-twin` và `/scenario-simulator` có nhiều thành phần UI trùng lặp (top toolbar, selection bar, side panels).

---

## 2. Kiểm Toán Backend, API & Cơ Sở Dữ Liệu

### 2.1 Hệ Thống API Endpoints
- Tổng số API routes hiện có: 45 endpoints.
- Kiểm tra hợp lệ dữ liệu (Validation): Sử dụng Zod cho các API quan trọng (`surveys`, `risk-assessment`, `vision`).
- Xử lý lỗi (Error Handling): Chuẩn hóa response JSON dạng `{ success: boolean, data?: any, error?: string }`.

### 2.2 Cơ Sở Dữ Liệu Prisma ORM
- Đã có 16 models Prisma quản lý trọn vẹn:
  - Dự án & Bản sao 3D: `Project`, `Home`, `Room`, `SceneObject`, `SimulationScenario`, `SceneSnapshot`, `Assessment`, `HazardFinding`, `Recommendation`.
  - Khảo sát thông minh: `HomeSurvey`, `SurveyRoom`, `SurveyAnswer`, `SurveyRoomProfile`, `SurveyFinding`, `SurveyRoomPhoto`, `SurveyAuditEvent`.
  - Thị giác AI: `RoomImage`, `VisionAnalysis`, `ObjectDetection`, `VisionObservation`, `VisionClarification`, `VisionRoomFact`, `VisionAuditEvent`.
  - Tri thức y khoa RAG: `KnowledgeSource`, `KnowledgePassage`, `Conversation`, `ConversationMessage`, `AnswerCitation`.
- **Điểm cần đồng bộ hóa (Persistence Synchronization)**:
  - Cần một API trung gian `POST /api/workflow/sync-scene` để chuyển đổi dữ liệu từ `SurveyRoomProfile` / `VisionRoomFact` thành các bản ghi `Room` và `SceneObject` trong cơ sở dữ liệu, cho phép người dùng mở lại đúng không gian thực tế sau khi tải lại trang (reload).

---

## 3. Kiểm Toán Động Cơ Đánh Giá Rủi Ro (Risk Engine Audit)

- Hiện tại hệ thống có 2 bộ quy tắc:
  1. `src/lib/risk/ruleEngine.ts` & `src/lib/risk/riskRuleRegistry.ts`: 8 quy tắc chuẩn y khoa (WHO / CDC STEADI) có khả năng sinh giải thích bằng chứng khoa học, truy xuất nguồn gốc.
  2. `src/features/risk-engine/rules.ts`: Bộ quy tắc in-memory phục vụ riêng cho `useSimulationStore.ts`.
- **Hành động tái cấu trúc**: Kết nối `useSimulationStore.ts` để sử dụng trực tiếp bộ 8 quy tắc của `src/lib/risk/ruleEngine.ts` thông qua adapter `normalizeRoomStateToAssessmentInput`, loại bỏ hoàn toàn sự không nhất quán giữa kết quả tính toán trên giao diện 3D và kết quả trong cơ sở dữ liệu.

