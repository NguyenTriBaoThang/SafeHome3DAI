# SafeHome3DAI — Remaining Issues & Blockers

Danh sách các hạng mục còn mở hoặc đang bị chặn (**không tự ý giả lập hoặc che đậy**) sau khi hoàn tất sửa lỗi kỹ thuật trên nhánh `audit/full-system-verification`.

---

## 1. Hạng Mục Bị Chặn Ngoài Phạm Vi Code (Clinical, ML & Field Study — P1)

1. **`BLOCKED` — Thẩm định lâm sàng cho `THRESHOLD_CONFIG_V2026_1` (`R-01`):**
   - Toàn bộ ngưỡng `RISK-001..RISK-008` trong `src/lib/risk/thresholdConfig.ts` mang trạng thái `PENDING_CLINICAL_REVIEW`.
   - Cần hội đồng/chuyên gia y tế rà soát và ký duyệt trước khi sử dụng trong môi trường lâm sàng thật.

2. **`BLOCKED` — Thiếu tập ảnh nhà ở thực tế có nhãn verified cho Stage 5 Detector (`R-03`):**
   - `reports/b05_comparison.json` & `reports/stage5/readiness.md`: `verifiedTrainImages: 0`, `verifiedValImages: 0`, `verifiedTestImages: 0`, `onnxArtifactPresent: false`.
   - Mọi lớp (`18` lớp trong `CATEGORY_TAXONOMY`) cần tối thiểu `50` bbox & `20` ảnh dương trong tập train do người kiểm duyệt xác nhận để mở khóa fine-tune `PekingU/rtdetr_r18vd` ONNX.

3. **`BLOCKED` — Thiếu dữ liệu nghiên cứu thực địa Task B11 (`reports/b11_evaluation_summary.json`):**
   - `status: "blocked_awaiting_field_data"`; `hazardRecords: 0`, `pairedComparisons: 0`, `measuredDistancePairs: 0`, `participantsWithSus: 0`, `maeCm: null`, `susMean: null`.
   - Cần tổ chức thu thập dữ liệu đo thước/laser thực địa và khảo sát SUS người dùng thật.

4. **`OPEN` — Đánh giá RAG trên Gemini Live bằng chấm tay (`R-02`):**
   - Benchmark 40 câu `npm run eval:rag:a09` hiện đạt `40/40 (100%)` ở chế độ `OFFLINE_DETERMINISTIC` (`PRELIMINARY`). Cần chạy và chấm tay thêm trên luồng `ENABLE_EXTERNAL_LLM=true` để xác nhận chất lượng Gemini ngoài đời thực.

---

## 2. Hạng Mục Tồn Đọng Kỹ Thuật / UX / Tooling (P2–P3)

5. **`OPEN (P2)` — Bảo mật phản hồi lỗi trên các route API phụ (`OPEN-05`):**
   - Đã áp dụng `buildSafeErrorPayload()` cho 6 route trọng tâm (AI Chat, Chat Stream, RAG, Surveys, NLP Interpret, Survey Photos), nhưng khoảng ~35 file route con (`ai/conversations/*`, `rag/*` con, `risk-assessment/*`, `surveys/[id]/*`, `vision/*`, `assessments`, `simulations/[id]`, `auth/consent/*`, `workflow/state/[id]`) vẫn trả thẳng `error.message` / `details: error.message`. Cần chuẩn hóa từng route đi kèm rà soát assertion test liên quan.

6. **`DONE (P2)` — Thiếu `eslint` trong `devDependencies` (`R-05`):**
   - Đã cài `eslint@9` + `eslint-config-next@15.5.29`, thêm `eslint.config.mjs` (flat config), script `"lint": "eslint ."`. `npm run lint` exit 0: 0 error, ~790 warning (các rule nhiễu như `no-explicit-any`, `no-unused-vars` được hạ xuống `warn`, chưa dọn).

7. **`DONE (P3)` — `npm run test:experience:browser`:**
   - Đã cài `playwright` + chromium, script tự đăng ký/đăng nhập tài khoản fixture qua API auth (cùng tài khoản mặc định với `scripts/completion/browser.cjs`, ghi đè bằng `SAFEHOME_BROWSER_EMAIL`/`SAFEHOME_BROWSER_PASSWORD`) và có hard timeout (`SAFEHOME_BROWSER_TIMEOUT_MS`, mặc định 15 phút, thoát mã 2). Kết quả trên `next start`: 15/15 PASS. Lưu ý: trên `next dev` check "Keyboard chapter navigation" FAIL do overlay dev của Next chặn click, nên chạy với bản build production.

8. **`OPEN (P3)` — Kích thước vùng chạm nút nhỏ trên Mobile (`< 36px`):**
   - Tuy cả 17/17 route đạt `mobileOverflowPx = 0`, một số màn hình phụ có mật độ điều khiển dày chứa nút nhỏ `< 36px` trên màn `375x844` (đặc biệt `/ai-vision`: `30` nút, `/digital-twin`: `26` nút, `/ai-assistant`: `14` nút, `/risk-assessment`: `9` nút, `/experience`: `8` nút). Nên mở rộng hit-area / padding đạt chuẩn `>= 36–44px`.

9. **`ACCEPTED (P3)` — Runtime state của `documentRegistry.ts` nằm trên bộ nhớ (`R-06`):**
   - Phê duyệt/từ chối nguồn tri thức runtime không ghi xuống SQLite (sẽ reset về 4 nguồn mặc định khóa cứng khi khởi động lại server).

