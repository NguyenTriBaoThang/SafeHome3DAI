# SafeHome3DAI — AI Vision, RAG & Model Governance Evaluation

## 1. Kiến Trúc & Danh Sách Phân Lớp Thị Giác (`18` Classes)

Định nghĩa tại `src/lib/vision/taxonomy.ts` (`CATEGORY_TAXONOMY`) và hàm chuẩn hóa nhãn `normalizePredictedLabel()`:

- **Nhóm COCO chuẩn (`9` lớp):** `bed`, `chair`, `table`, `cabinet`, `toilet`, `sink`, `bathtub`, `sofa` *(ghi chú: `nightstand` & `door` đặt `isStandardCocoClass: false` trong code, gắn `requiresSpecializedReview: true`)*.
- **Nhóm an toàn người cao tuổi chuyên biệt (`10` lớp gắn `requiresSpecializedReview: true`):**
  `nightstand`, `door`, `rug` (RISK-001), `electrical_cable` (RISK-002), `grab_bar` (RISK-006), `obstacle_route` (RISK-003), `threshold_step` (RISK-007), `lamp` (RISK-004 — ghi chú cấm tự suy lux từ sự hiện diện đèn), `light_switch` (RISK-008 — ghi chú cấm tự suy tầm với từ giường), `other`.

---

## 2. Cơ Chế Chống Bịa Đặt & Vòng Đời Human-in-the-Loop (HITL)

Đã xác nhận qua code (`visionProvider.ts`, `visionState.test.ts`, `visionProviders.test.ts`, `browser.cjs`) và **đã vá BUG-01**:

1. **Ranh giới Production vs Demo:** Ảnh upload thật qua `/api/vision/images` yêu cầu luồng nhị phân & `consent=true`. Không dùng mô tả văn bản hoặc bố cục mẫu khi suy luận lỗi (`visionProviders.test.ts`: `never uses a caption or demo layout when uploaded inference fails` — PASS). Nhánh `simulateVision` giả lập trong `/api/surveys/[id]/rooms/[roomId]/photos` đã bị xóa (`BUG-01`).
2. **Bảo vệ dữ liệu phi thị giác:** Vật thể `lamp` không suy ra độ sáng `Lux`; `rug` không suy ra độ bám mặt dưới hay ma sát sàn ướt; dữ liệu chưa kiểm chứng giữ `NEEDS_VERIFICATION` / `chưa xác định` (`itemHazardAssessment.test.ts` 4/4 pass; `workflowB09.test.tsx` 19/19 pass).
3. **Thu hồi & Chỉnh sửa trạng thái (Retractable Evidence):** Sửa đáp án thành `unknown` hoặc xóa ảnh thực hiện thu hồi có kiểm chứng trên SQLite (`visionState.test.ts`: 17/17 pass; `rollback` nếu DB lỗi trước khi xóa file đĩa).

---

## 3. Hiện Trạng Huấn Luyện & Đánh Giá Mô Hình ML (Stage 1–6 / Task B05)

Dữ liệu trích xuất nguyên trạng từ `reports/audit.md`, `reports/stage4_exploratory/winner_details.md`, `reports/stage5/readiness.md`, `reports/stage6/gemini-live.json` và `reports/b05_comparison.json`:

1. **Stage 1 Data Audit (`reports/audit.md`):**
   - Kiểm tra `500` ảnh Wikimedia Commons (`decoded_ok: 500`, `bedroom: 175`, `bathroom: 175`, `hallway: 150`, `corrupt_or_missing: 0`, `sha256_mismatches: 0`, `images_with_exif: 0`, `license_metadata_needs_review: 106`).
2. **Stage 4 Exploratory Check (`winner_details.md` — CHỈ đối chiếu nhãn AI, KHÔNG phải độ chính xác lâm sàng/thật):**
   - Tập thăm dò Wikimedia Commons nhỏ (`val: 6 ảnh / 13 lớp`, `test: 5 ảnh / 8 lớp`, tổng cụm nguồn 38 ảnh tham chiếu theo risk register).
   - mAP50 so với nhãn AI trên cấu hình `structured`: `0.7822` (val, CI95 `[0.5000, 0.9626]`) và `0.7092` (test, CI95 `[0.4673, 1.0000]`). Một số lớp có AP50 = `0.0000` (`bathtub`, `grab_bar` trên val; `sink` trên test) hoặc chưa đủ mẫu. Báo cáo ghi rõ: **"Chưa phải độ chính xác chính thức."**
3. **Stage 5 Local Detector Readiness (`reports/b05_comparison.json` & `reports/stage5/readiness.md`):**
   - Mô hình mục tiêu: `PekingU/rtdetr_r18vd` (Apache-2.0).
   - Trạng thái: **`not_ready` / `blocked`**.
   - Số ảnh có nhãn do người xác nhận: `verifiedTrainImages: 0`, `verifiedValImages: 0`, `verifiedTestImages: 0`, `onnxArtifactPresent: false`.
   - Tất cả `18` lớp thiếu tối thiểu `50` bbox & `20` ảnh dương trong tập train; mọi chỉ số ablation `1_object_only`, `2_plus_survey_confirmation`, `3_canonical_risk_rules` giữ `null`.
4. **Stage 6 Live Gemini Smoke Check (`reports/stage6/gemini-live.json`):**
   - Kiểm tra kết nối 1 lượt với `gemini-3.5-flash-lite` trên `hallway_0001`: `status: "passed"`, `latency_ms_single_request: 18852`, `schema_valid: true`, `quality_metrics: null`, `limitations: "Single network/schema check, not detection accuracy, risk recall, latency benchmark or a new test evaluation."`
   - Trong đợt test Vitest `task-8642`, bài live API test của `tests/geminiVision.test.ts` ở trạng thái **`skipped`** vì `SAFEHOME_RUN_LIVE_VISION_TESTS !== "true"`.

---

## 4. Đánh Giá RAG & AI Copilot (Task A08–A09)

Kết quả thực thi `npm run eval:rag:a09` sau chỉnh sửa (`task-8642`):
- **Chế độ chạy:** `OFFLINE_DETERMINISTIC` (`SafeHome-LocalRAG / curated-evidence-engine-v2+guardrails-a09`)
- **Phương pháp chấm:** `PRELIMINARY_DETERMINISTIC_RUBRIC_WITH_HUMAN_REFERENCE` (KHÔNG tự chấm bằng LLM và chưa chấm tay trên Gemini trực tiếp)
- **Kết quả (`40` câu hỏi tiếng Việt):**
  - `overallPass`: **`40/40 (100%)`**
  - `retrievalHitAtK`: **`20/20 (100%)`**
  - `citationPrecision`: **`40/42 (95.2%)`**
  - `groundedness`: **`20/20 (100%)`**
  - `refusalRate` (câu ngoài phạm vi / thiếu ngữ cảnh): **`20/20 (100%)`**
  - `promptInjectionBlockRate`: **`2/2 (100%)`**
  - `guardrailCompliance`: **`40/40 (100%)`**
  - Độ trễ: `avg = 1.55ms`, `p95 = 5.5ms`, `cost = $0`

---

## 5. Kết Luận Đánh Giá AI

- **Độ sẵn sàng phần mềm tích hợp AI:** Đạt chuẩn kỹ thuật (**không bịa số liệu, có fallback/abstain an toàn, có kiểm thử hợp đồng provider**).
- **Độ sẵn sàng đánh giá AI (`AI EVALUATION READY`):** **`BLOCKED`** — thiếu tập test nhãn người thật (`0` ảnh verified) để đo mAP50 thật, chưa có ONNX RT-DETR, và chưa có kết quả human-grading cho Gemini Vision / Live RAG.
