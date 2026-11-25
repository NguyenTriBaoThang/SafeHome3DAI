# SafeHome3DAI — Fix Changelog & Regression Proof

Tất cả chỉnh sửa mã nguồn trong đợt kiểm toán được thực hiện cô lập trên nhánh **`audit/full-system-verification`**.

---

## 1. Danh Sách Thay Đổi Theo Tệp

### A. Đồng bộ Dependencies & Build Sạch (**BUG-05** — `P0`)
- **Hành động:** Chấm dứt tiến trình server cũ khóa file engine (`task-8106`), chạy `npm ci --onnxruntime-node-install-cuda=skip` (`added 291 packages`, `0 vulnerabilities`), `npx prisma generate` (`v5.22.0`), xóa sạch `.next` và rebuild bằng `npx next build`.
- **Kết quả trước -> sau:**
  - Trước: `/experience` crash client (`ReactCurrentBatchConfig`, `textLen=127`, `hasClientError=true`); `/digital-twin` và `/scenario-simulator` báo lỗi runtime React/R3F.
  - Sau: `react@19.1.0`, `react-dom@19.1.0`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`; `/experience` render khỏe (`textLen=2413`, `errors=[]`, `hasClientError=false`); `/digital-twin` & `/scenario-simulator` `errors=[]`.

### B. Loại Bỏ Fake Vision & URL Mock Trong Khảo Sát Có Hướng Dẫn (**BUG-01** — `P1`)
1. `src/app/api/surveys/[id]/rooms/[roomId]/photos/route.ts`
   - **Thay đổi:** Gỡ bỏ hoàn toàn nhánh `if (simulateVision) { detectedObjects = ["Phát hiện thảm...", "Phát hiện ổ cắm..."]; }` vốn tự bịa kết quả thị giác.
   - **Hành vi mới:** Khi ảnh gắn `visionAnalysisId` hoặc khớp `VisionAnalysis` của phòng (`orderBy: { startedAt: "desc" }`), chỉ trích xuất danh sách `ObjectDetection` thật ở trạng thái `CONFIRMED` hoặc `CORRECTED`; nếu chưa liên kết/chưa xác nhận thì lưu `detectedObjects: []`. Mọi lỗi phát sinh trả về qua `buildSafeErrorPayload`.
2. `src/app/ai-guided-survey/page.tsx`
   - **Thay đổi:** Thay thế ô nhập URL ảnh ngoài + payload `simulateVision: true` bằng trình tải tệp thực `<input type="file" accept="image/jpeg,image/png,image/webp">`, checkbox xác nhận đồng ý gửi ảnh cho phân tích (`photoConsent`), và banner lỗi tường minh (`photoError`).
   - **Hành vi mới:** Upload ảnh nhị phân thật tới `POST /api/vision/images` (`consent=true`) trước khi gắn kết quả vào `POST /api/surveys/[id]/rooms/[roomId]/photos`.

### C. Che Giấu Lỗi Hệ Thống Thô Trên API Chính (**BUG-02** — `P2`)
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/chat/stream/route.ts`
- `src/app/api/rag/route.ts`
- `src/app/api/surveys/route.ts`
- `src/app/api/surveys/interpret-nlp/route.ts`
- **Thay đổi:** Thay thế trả về `error.message` thô trong phản hồi lỗi JSON HTTP 4xx/5xx bằng `buildSafeErrorPayload` (ứng dụng `redactSecretsAndPII` từ `src/lib/security/resilience.ts`).

### D. Sửa Lỗi Khởi Tạo Session Giả Trên `/ai-assistant` (**BUG-06** — `P2`)
- `src/app/ai-assistant/page.tsx`
- **Thay đổi:** Bổ sung điều kiện chặn gọi `GET /api/ai/conversations/default-session` trong `useEffect` và `loadMessages` khi mã phiên là `"default-session"`.
- **Kết quả:** Số lỗi `httpErrors` trên `/ai-assistant` giảm từ `1` (HTTP 404) về `0`.

### E. Đồng Bộ Tài Liệu & Phạm Vi Kỹ Thuật (**BUG-03** — `P2`)
- `README.md`
- **Thay đổi:** Cập nhật thông số thực tế (`Next.js 15.5.29`, `React 19.1.0`, `Node.js >= 22.12.0`), bỏ cụm từ dễ gây hiểu nhầm `"tỉ lệ 1:1"` ở phân hệ `/digital-twin`, giữ nguyên tuyên bố phạm vi kiểm soát cho `npm run qa:gates`.

### F. Bộ Kiểm Thử Hồi Quy Audit Mới
- `tests/fullAuditRegressions.test.ts` (mới tạo)
- **Nội dung:** `5` test kiểm chứng BUG-01 (không trả fake detections), BUG-02 (chỉ số bảo mật `buildSafeErrorPayload` trên 5 route chính), BUG-03 (đồng bộ version & không còn `1:1` trong `README.md`), BUG-05 (ràng buộc version React 19 + R3F 9), BUG-06 (`default-session` guard trên `ai-assistant/page.tsx`).

---

## 2. Xác Nhận Kiểm Thử Hậu Chỉnh Sửa

| Lệnh xác minh (chạy **sau** lần sửa code cuối) | Kết quả |
| :--- | :--- |
| `npm run typecheck` | **PASS** (exit `0`) |
| `npm run qa:gates` | **PASS** (`Gate Failures: 0`) |
| `npx vitest run --config vitest.experience.config.ts tests/fullAuditRegressions.test.ts` | **PASS** (`5/5`) |
| `npm test -- --run --no-file-parallelism` (`BypassSandbox: true`) | **PASS** (`57/57` files, `486 passed`, `1 skipped`) |
| `npm run eval:rag:a09` | **PASS** (`40/40`, `OFFLINE_DETERMINISTIC`, `PRELIMINARY`) |
| `npm run test:experience` | **PASS** (`9/9` files, `64/64 passed`) |
| Clean `npx next build` | **PASS** (`23/23` static routes) |
| `node scripts/completion/http-smoke.cjs` | **PASS** (`10/10` + backup/restore) |
| `node scripts/completion/browser.cjs` | **PASS** (`25/25`, `fixture_detector_calls: 3`) |
| Edge Headless Sweep `17` routes (`1440x900` & `375x844`) | **PASS** (`17/17`, `0` console/page/HTTP/overflow errors) |

