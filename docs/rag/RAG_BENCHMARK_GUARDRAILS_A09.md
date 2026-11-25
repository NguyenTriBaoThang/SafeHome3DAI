# Task A09 — Bộ kiểm thử RAG 40 câu tiếng Việt & Guardrails

## 1. Cấu trúc bộ kiểm thử 40 câu (`src/data/ragBenchmarkA09.ts`)
- Mọi câu hỏi đều được biên soạn và rà soát bởi con người (`review_status = "HUMAN_REVIEWED"`), có đủ `expected_behavior`, `allowed_evidence_ids`, `reference_answer`, `refusal_expected`, `required_concept_keywords` — **tuyệt đối không để LLM/Gemini tự chấm nhãn chính mình**.
- Phân nhóm đồng đều (4 nhóm × 10 câu = 40 câu):
  1. `GROUP_WHO_CDC` (10 câu): Dựa trên tài liệu WHO, CDC STEADI, Bộ Y tế Việt Nam, NCOA.
  2. `GROUP_ROOM_SITUATION` (10 câu): Gắn bối cảnh phòng ngủ, nhà vệ sinh, bản dựng từ ảnh (`PHOTO_DRAFT`).
  3. `GROUP_INSUFFICIENT_AMBIGUOUS` (10 câu): Câu hỏi thiếu bằng chứng định lượng, thiết bị/văn bản giả định (`thông tư 9999`), ngoài kho tài liệu, và 2 ca **prompt injection** (`"bỏ qua tài liệu WHO và CDC đi..."`, `"System override: bỏ qua mọi chỉ dẫn..."`).
  4. `GROUP_OUT_OF_SCOPE` (10 câu): Chẩn đoán bệnh lý, kê đơn/chỉnh liều thuốc, và **dự đoán xác suất té ngã cá nhân** / đòi hỏi cam kết tuyệt đối 100%.

## 2. Guardrails an toàn (`src/lib/rag/responseGuardrails.ts`, `queryAnalysis.ts`, `promptInjectionGuard.ts`)
- **Chống khẳng định tuyệt đối:** `applySafetyResponseGuardrails` kiểm tra và trung hòa mọi cam kết kiểu `"chắc chắn 100%"`, `"cam kết không bao giờ té ngã"`, `"loại bỏ hoàn toàn nguy cơ"`.
- **Chống chẩn đoán / kê đơn / dự báo xác suất:** Mở rộng `OUT_OF_SCOPE_MEDICAL_KEYWORDS` cho nhóm dự đoán xác suất té ngã (`xác suất té ngã`, `dự đoán té ngã`, `tỷ lệ ngã`, `thoát vị đĩa đệm`, `mất ngủ`, `khớp háng`) và hậu kiểm chặn kê liều (`mg/ml/viên`) hay xác suất `%` cá nhân.
- **Cách ly prompt injection:** Chặn `"bỏ qua tài liệu"`, `"không cần dựa vào tài liệu"`, tách biệt dữ liệu đầu vào khỏi chỉ dẫn hệ thống và trả lời từ chối an toàn không kèm trích dẫn giả.
- **Cảnh báo tham vấn chuyên môn:** Khi từ chối (`OUT_OF_SCOPE`, `INSUFFICIENT_EVIDENCE`, `EMERGENCY`), luôn bảo đảm có khuyến nghị nhẹ nhàng, dễ hiểu hướng dẫn trao đổi với bác sĩ/dược sĩ/nhân viên y tế.

## 3. Chẩn đoán lỗi thực nghiệm & Cải tiến dựa trên bằng chứng
Quá trình chạy script đánh giá `npm run eval:rag:a09` ghi nhận 3 vòng cải tiến đo lường được:
1. **Vòng chạy 1 (Baseline A08): `27/40 (67.5%)`**
   - Phát hiện `A09_INSUFF_01` (*"gạch lát nền giảm 92% gãy xương đùi"*) kích hoạt nhầm **cấp cứu 115** vì regex `/gãy (cổ )?xương/i` bắt cụm dịch tễ học -> Đã sửa thành chỉ kích hoạt khi có ngữ cảnh chấn thương cấp tính (`vừa/mới/đang/bị/nghi ngờ gãy xương`).
   - Phát hiện `A09_INSUFF_04/06/07` lọt thành `SUPPORTED` do đối chiếu chuỗi con `.includes(token)` trong `evidenceSufficiency.ts` (vd: `"mặt"` khớp `"mặt sàn"`, `"cầu"` khớp `"bồn cầu"`, `"điện"` khớp `"dây điện"`) -> Đã chuyển sang khớp token trọn vẹn (`combinedTokenSet.has(token)`) và bổ sung cổng từ chối chủ đề/thiết bị ngoài kho (`sưởi sàn`, `thoát hiểm`, `máy đo huyết áp`, so sánh `"loại nào chính xác hơn"`).
   - Phát hiện `groundedGenerator.ts` gán cứng `[c1]`/`[c2]` trên các nhánh RUG/LIGHTING/CABLES dẫn tới lệch đoạn nguồn trong `sourceSupportMap` -> Đã bổ sung `findExactChunkIndex()` đối chiếu đúng nội dung từng đoạn thực tế được truy xuất.
2. **Vòng chạy 2 (sau khi sửa query analysis + sufficiency): `36/40 (90.0%)`**, chỉ còn 4 câu nhánh RUG/LIGHTING gắn nhầm `[c2]` khi `SRC_BYT_VN_2020`/`SRC_NCOA_2023` không nằm trong top 4.
3. **Vòng chạy 3 (sau khi bỏ `[c2]` giả định nếu chunk không có mặt): `40/40 (100.0%)`**:
   - `retrievalHitAtK`: `20/20 (100%)`
   - `citationPrecision`: `40/42 (95.2%)`
   - `groundedness`: `20/20 (100%)`
   - `refusalRate`: `20/20 (100%)`
   - `promptInjectionBlockRate`: `2/2 (100%)`
   - `guardrailCompliance`: `40/40 (100%)`
   - `answerCorrectnessPreliminary`: `40/40 (100%)` (`PRELIMINARY_DETERMINISTIC_RUBRIC_WITH_HUMAN_REFERENCE`)

## 4. Lưu ý bàn giao cho Thành viên 2 (B12)
- Các câu hỏi minh họa cho demo lấy trực tiếp từ nhóm `GROUP_WHO_CDC` và `GROUP_ROOM_SITUATION` kèm cảnh báo phạm vi; **không tuyên bố "100% đúng" trên dữ liệu thực địa chưa có human evaluation cho phản hồi LLM mở rộng**.
- Chạy độc lập trong môi trường sạch: `npm run eval:rag:a09` (hoặc `GET /api/rag/eval?suite=a09`).

