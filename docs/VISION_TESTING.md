# Kế Hoạch Và Ma Trận Kiểm Thử Thị Giác (Vision Testing Guide)

Tài liệu này cung cấp hướng dẫn kiểm thử tự động và thủ công cho phân hệ **SafeHome Vision Intelligence**.

---

## 1. Ma Trận Ca Kiểm Thử Tự Động (Automated Test Suites)

Hệ thống bao gồm hai bộ kiểm thử tự động chính sử dụng Vitest:

### 1.1 Kiểm Thử Đơn Vị Động Cơ Thị Giác (`tests/visionEngine.test.ts`)
Bao gồm 14 ca kiểm thử chi tiết:
1. `should validate valid JPEG magic bytes` — Kiểm tra nhận diện đúng header nhị phân ảnh JPEG.
2. `should validate valid PNG magic bytes` — Kiểm tra nhận diện đúng header PNG.
3. `should reject file with invalid magic bytes` — Từ chối tệp tin giả mạo đuôi ảnh.
4. `should strip EXIF APP1 segment safely from JPEG buffer` — Kiểm tra thuật toán bóc tách đoạn metadata EXIF.
5. `should generate safe UUID filename` — Sinh tên tệp an toàn không chứa ký tự lạ.
6. `should correctly normalize pixel coordinates to 0..1 range` — Kiểm tra công thức chuẩn hóa tọa độ.
7. `should denormalize 0..1 coordinates back to target image size` — Kiểm tra giải chuẩn hóa tọa độ về pixel gốc.
8. `should clamp out-of-bounds coordinates safely` — Giữ chặt tọa độ trong ngưỡng an toàn `[0.0, 1.0]`.
9. `should normalize predicted labels correctly` — Chuẩn hóa các tên nhãn tiếng Anh / tiếng Việt sang 15 nhóm taxonomy.
10. `should identify specialized categories requiring extra review` — Xác định đúng các nhóm đối tượng cần chuyên viên xem xét (`grab_bar`, `electrical_cable`, `rug`).
11. `should run bedroom heuristic vision analysis with detections & observations` — Kiểm tra phân tích phòng ngủ với các quan sát thảm trượt và dây điện.
12. `should run bathroom heuristic vision analysis with detections & observations` — Kiểm tra phân tích phòng tắm và phát hiện thiếu thanh tay vịn.
13. `should generate correct clarification questions for Bedroom` — Tạo đúng câu hỏi `BED_006`, `BED_007`, `BED_008`.
14. `should generate correct clarification questions for Bathroom` — Tạo đúng câu hỏi `BATH_005`, `BATH_003`.

### 1.2 Kiểm Thử Tích Hợp Đa Phân Hệ (`tests/visionIntegration.test.ts`)
Bao gồm 2 kịch bản tích hợp trọn vẹn:
1. **Scenario A (Phòng ngủ - Bedroom)**:
   - Tải ảnh phòng ngủ -> Kích hoạt phân tích AI -> Trả lời câu hỏi làm rõ (`BED_006` có thảm, `BED_007` thảm không cố định, `BED_008` có dây điện).
   - Kiểm tra lưu `VisionRoomFact`.
   - Kiểm tra đồng bộ vào `SurveyAnswer`.
   - Kiểm tra tái đánh giá qua `evaluateRoomHazards`: kích hoạt `RUG_TRIP_HAZARD` và `ELECTRICAL_CABLE_TRIP`.
   - Tạo bản thảo 3D `createSceneDraftFromVision` với các vị trí ước lượng `isEstimate: true`.
2. **Scenario B (Phòng tắm - Bathroom)**:
   - Tải ảnh phòng tắm -> Trả lời làm rõ `BATH_005=NO` (không có tay vịn bồn cầu).
   - Kích hoạt tái đánh giá rủi ro -> Phát hiện `BATHROOM_NO_GRAB_BAR` ở mức độ nguy hiểm nghiêm trọng (`CRITICAL`).

---

## 2. Cách Thực Hiện Kiểm Thử

Chạy toàn bộ bộ kiểm thử trong terminal:
```bash
npm test -- --run
```
Chỉ chạy riêng các bài test thị giác AI:
```bash
npx vitest run tests/visionEngine.test.ts tests/visionIntegration.test.ts
```
Kiểm tra tĩnh kiểu dữ liệu TypeScript:
```bash
npx tsc --noEmit
```
Kiểm tra đóng gói sản phẩm hoàn chỉnh:
```bash
npm run build
```

