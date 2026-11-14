# CHIẾN LƯỢC KIỂM THỬ TỰ ĐỘNG (RISK INTELLIGENCE TESTING)
## SafeHome Risk Intelligence — Báo Cáo & Hướng Dẫn Kiểm Thử

### 1. Tổng Quan Kết Quả Kiểm Thử

Hệ thống SafeHome Risk Intelligence được bảo vệ bởi bộ kiểm thử tự động toàn diện trên nền **Vitest**:
- **Tổng số tệp kiểm thử**: 10/10 test suites đạt **PASS 100%**.
- **Tổng số ca kiểm thử**: 59/59 unit & integration tests đạt **PASS 100%**.
- **Kiểm tra kiểu dữ liệu TypeScript**: `npx tsc --noEmit` đạt mã thoát `0` (Zero type errors).
- **Kiểm tra đóng gói sản xuất Next.js**: `npm run build` thành công toàn diện với 29 trang & API routes.

---

### 2. Danh Sách Các Bộ Kiểm Thử Chính

1. **`tests/riskIntelligence.test.ts`** (10 ca kiểm thử đơn vị):
   - Đảm bảo đủ 8 quy tắc đăng ký với định danh chuẩn (`RISK-001` .. `RISK-008`).
   - Kiểm tra quy tắc `RISK-001` (Thảm trải sàn) với các trạng thái `DETECTED`, `NOT_DETECTED`, `NEEDS_VERIFICATION`.
   - Kiểm tra quy tắc `RISK-002` (Dây điện ngang lối đi) với mức ưu tiên `HIGH`.
   - Kiểm tra tính độc lập và trạng thái `NOT_APPLICABLE` của quy tắc phòng tắm (`RISK-005`, `RISK-006`) khi áp dụng cho phòng ngủ.
   - Kiểm thử chính sách ưu tiên và giải thích lý do tiếng Việt.
   - Kiểm thử động cơ giải thích AI RAG, đảm bảo trích xuất đầy đủ dẫn chứng và cơ sở y học lão khoa.
   - Kiểm thử động cơ so sánh Trước / Sau can thiệp (`compareAssessments`), xác minh tăng điểm an toàn và phân loại `RESOLVED_IN_MODEL`.

2. **`tests/riskIntegration.test.ts`** (3 ca kiểm thử tích hợp luồng):
   - Kiểm thử tích hợp trọn vẹn từ hồ sơ khảo sát `RoomProfile` sang `AssessmentSnapshot` và xuất báo cáo `AssessmentReport`.
   - Kiểm thử tích hợp với mô hình 3D Digital Twin `RoomState` (Phòng ngủ và Phòng tắm).
   - Kiểm tra tính toàn vẹn của bằng chứng không gian và dẫn chiếu tài liệu y tế chuẩn hóa.

---

### 3. Lệnh Thực Thi Kiểm Thử

- **Chạy toàn bộ kiểm thử đơn vị & tích hợp**:
  ```bash
  npm test -- --run
  ```
- **Kiểm tra kiểu dữ liệu TypeScript**:
  ```bash
  npx tsc --noEmit
  ```
- **Kiểm tra biên dịch đóng gói sản xuất**:
  ```bash
  npm run build
  ```

