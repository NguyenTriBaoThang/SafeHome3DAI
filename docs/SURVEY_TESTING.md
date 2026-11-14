# Kiểm Thử Tự Động Module Khảo Sát — Survey Automated Testing

Tài liệu này tổng hợp toàn bộ các bộ kiểm thử tự động, kịch bản E2E và lệnh kiểm tra cho SafeHome AI Guided Survey.

---

## 1. Cấu Trúc Các Tệp Kiểm Thử

Hệ sinh thái kiểm thử bao gồm 8 tệp kiểm thử với tổng cộng 46 ca kiểm thử tự động (Unit, Integration & E2E):

| Tệp Kiểm Thử | Mục Đích | Số Ca Kiểm Thử | Trạng Thái |
|---|---|---|---|
| `tests/surveyEngine.test.ts` | Kiểm thử tuần tự câu hỏi, nhánh điều kiện, hủy bỏ phụ thuộc, NLP tiếng Việt, tạo RoomProfile và 3D SceneDraft | 9 tests | **PASS (100%)** |
| `tests/surveyIntegration.test.ts` | Kiểm thử tích hợp E2E: Tạo khảo sát, lưu câu trả lời, sửa đổi câu trả lời, hủy phụ thuộc DB, xuất báo cáo JSON | 4 tests | **PASS (100%)** |
| `tests/copilotEngine.test.ts` | Động cơ phân tích ý định RAG & trích dẫn | 10 tests | **PASS (100%)** |
| `tests/copilotIntegration.test.ts` | Tích hợp RAG Copilot đa lượt | 4 tests | **PASS (100%)** |
| `tests/ragEngine.test.ts` | Động cơ truy xuất lai RAG | 4 tests | **PASS (100%)** |
| `tests/ragEvaluation.test.ts` | Bộ đánh giá Benchmark RAG 8 tiêu chuẩn | 1 test | **PASS (100%)** |
| `tests/riskEngine.test.ts` | Động cơ đánh giá rủi ro mô phỏng 3D | 11 tests | **PASS (100%)** |
| `tests/integration.test.ts` | Tích hợp hệ thống tổng thể | 3 tests | **PASS (100%)** |

---

## 2. Chi Tiết Các Kịch Bản E2E

### Kịch Bản E2E A — Phòng Ngủ (`tests/surveyIntegration.test.ts`)
1. Tạo khảo sát mới với đối tượng người cao tuổi.
2. Trả lời kích thước phòng ngủ (`BED_001` = 4.5m x 3.8m).
3. Ghi nhận người già dùng hàng ngày (`BED_002` = YES) và có cửa sổ (`BED_003` = YES).
4. Ghi nhận ban đêm thiếu sáng (`BED_004` = NO) và không có đèn ngủ (`BED_005` = NO).
5. Ghi nhận có thảm (`BED_006` = YES) và thảm chưa cố định (`BED_007` = NO).
6. Ghi nhận có dây điện vắt ngang lối đi (`BED_008` = YES).
7. Kiểm tra hệ thống kích hoạt đúng 3 mối nguy: `RULE_BED_001`, `RULE_BED_002`, `RULE_BED_004`.
8. Người dùng sửa lại câu hỏi `BED_006` thành `NO` (Không có thảm).
9. Kiểm tra hệ thống tự động xóa `BED_007` khỏi DB và hủy bỏ mối nguy `RULE_BED_001`.

### Kịch Bản E2E B — Nhà Vệ Sinh (`tests/surveyIntegration.test.ts`)
1. Ghi nhận sàn thường xuyên ướt (`BATH_003` = YES) và dễ trơn trượt (`BATH_004` = YES).
2. Ghi nhận chưa có thanh tay vịn (`BATH_005` = NO).
3. Ghi nhận có bậc thềm chênh cao tại lối vào (`BATH_010` = YES).
4. Kiểm tra hệ thống kích hoạt 3 mối nguy tương ứng: `RULE_BATH_001`, `RULE_BATH_002`, `RULE_BATH_004`.
5. Xuất dữ liệu báo cáo khảo sát thành công dưới dạng JSON chuẩn.

---

## 3. Lệnh Chạy Kiểm Thử

### Chạy toàn bộ kiểm thử:
```bash
npm test
```

### Chạy riêng kiểm thử khảo sát:
```bash
npx vitest run tests/surveyEngine.test.ts
npx vitest run tests/surveyIntegration.test.ts
```

### Kiểm tra kiểu dữ liệu TypeScript:
```bash
npx tsc --noEmit
```

### Kiểm tra Next.js Production Build:
```bash
npm run build
```

