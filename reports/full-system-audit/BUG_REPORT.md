# SafeHome3DAI — Bug & Risk Report

Báo cáo phân loại lỗi đã phát hiện & xử lý dứt điểm trong đợt kiểm toán (**BUG-01..BUG-06**), cùng các hạng mục tồn đọng/bị chặn có kiểm soát (**OPEN**).

---

## 1. Các Lỗi Đã Phát Hiện & Khắc Phục Hoàn Toàn (FIXED)

| Mã lỗi | Mức độ | Mô tả nguyên nhân gốc & Hiện tượng | Vị trí mã nguồn | Trạng thái |
| :--- | :---: | :--- | :--- | :---: |
| **BUG-05** | **P0** | Lệch phiên bản `node_modules` cục bộ (`react@18.3.1` + `@react-three/fiber@8.18.0`) so với `package-lock.json` (`react@19.1.0` + `@react-three/fiber@9.8.2`), gây crash client trên `/experience` (`ReactCurrentBatchConfig`) và cảnh báo/lỗi runtime trên `/digital-twin` & `/scenario-simulator`. | `node_modules/`, `.next/` | **FIXED** (`npm ci`, `prisma generate`, clean `npx next build`) |
| **BUG-01** | **P1** | `/ai-guided-survey` cung cấp input URL ngoài giả lập kèm cờ `simulateVision: true`; endpoint `POST /api/surveys/[id]/rooms/[roomId]/photos` trả về mảng `detectedObjects` bịa đặt cố định khi bật `simulateVision`. | `src/app/api/surveys/[id]/rooms/[roomId]/photos/route.ts`, `src/app/ai-guided-survey/page.tsx` | **FIXED** (Bỏ nhánh `simulateVision`, đọc `ObjectDetection` thật qua `VisionAnalysis`, UI dùng `<input type="file">` + `consent` upload tới `/api/vision/images`) |
| **BUG-06** | **P2** | Khi mới mở `/ai-assistant`, component gọi `GET /api/ai/conversations/default-session` gây lỗi HTTP `404` trên console trình duyệt. | `src/app/ai-assistant/page.tsx` | **FIXED** (Bỏ qua fetch DB đối với ID phiên khởi tạo `"default-session"`) |
| **BUG-02** | **P2** | Nhiều API route chính trong nhóm AI/RAG/Survey trả thẳng `error.message` thô trong JSON 500, tiềm ẩn rò rỉ đường dẫn hệ thống/chi tiết Prisma/secret. | `src/app/api/ai/chat/route.ts`, `src/app/api/ai/chat/stream/route.ts`, `src/app/api/rag/route.ts`, `src/app/api/surveys/route.ts`, `src/app/api/surveys/interpret-nlp/route.ts` | **FIXED** (Áp dụng `buildSafeErrorPayload` / `redactSecretsAndPII`) |
| **BUG-03** | **P2** | `README.md` ghi sai phiên bản Next.js (`15.3.0` thay vì `15.5.29`), React cũ, Node `>=18.x` thay vì `>=22.12.0`, và mô tả `/digital-twin` là `"tỉ lệ 1:1"` gây hiểu lầm hình học mô phỏng ảnh. | `README.md` | **FIXED** (Đã đồng bộ toàn bộ thông số và phạm vi) |

*(Mọi lỗi BUG-01..BUG-06 đều đã có bài test hồi quy trong `tests/fullAuditRegressions.test.ts` — `5/5 PASS` — và được tái xác nhận trên Edge Headless 17/17 route.)*

---

## 2. Lỗi & Hạng Mục Tồn Đọng Đang Mở (OPEN / BLOCKED)

| Mã | Mức độ | Mô tả vấn đề quan sát được | Vị trí / Dẫn chứng | Trạng thái |
| :--- | :---: | :--- | :--- | :--- |
| **OPEN-01** (`R-01`) | **P1 (Clinical Gate)** | Toàn bộ ngưỡng định lượng trong `thresholdConfig.ts` (`2026.1`) đang gán trạng thái `PENDING_CLINICAL_REVIEW`; hệ thống chưa được hội đồng y tế thẩm định chính thức. | `src/lib/risk/thresholdConfig.ts`, `docs/release/RISK_REGISTER_AND_LIMITATIONS.md` | **BLOCKED (Chờ chuyên gia y tế)** |
| **OPEN-02** (`R-03`) | **P1 (ML Gate)** | `0` ảnh xác thực người dùng cho tập train/val; mô hình local RT-DETR R18 (`PekingU/rtdetr_r18vd`) ở trạng thái `not_ready`, chưa có file trọng số ONNX thực tế. | `reports/b05_comparison.json`, `reports/stage5/readiness.md` | **BLOCKED (Thiếu dữ liệu thực địa)** |
| **OPEN-03** | **P1 (Study Gate)** | Nghiên cứu hiện trường B11 có `0` mẫu đánh giá thực tế (`hazardRecords: 0`, `validSusCount: 0`, `maeCm: null`). | `reports/b11_evaluation_summary.json` | **BLOCKED (Chờ thực địa B11)** |
| **OPEN-04** (`R-02`) | **P1 (AI Eval Gate)** | Đánh giá RAG 40 câu (`eval:rag:a09`) mới đạt chuẩn `PRELIMINARY` ở chế độ `OFFLINE_DETERMINISTIC`; chưa chạy human-grading trên Gemini LLM trực tiếp (`ENABLE_EXTERNAL_LLM=true`). | `scripts/run-rag-benchmark-a09.cjs` | **OPEN** |
| **OPEN-05** | **P2 (Security Hygiene)** | Dù các route AI/RAG/Survey chính đã chuẩn hóa `buildSafeErrorPayload` (`BUG-02`), vẫn còn các API route phụ (nhóm `ai/conversations/*`, `rag/*` con, `risk-assessment/*`, `surveys/[id]/*`, `vision/*`) sử dụng `error.message` trong khối `catch` (được giữ nguyên trong đợt này để không phá vỡ thông báo lỗi cụ thể mà test hiện hữu đang kỳ vọng). | Quét trực tiếp tại `src/app/api/**` (xem chi tiết tại `SECURITY_AUDIT.md`) | **OPEN (Backlog)** |
| **OPEN-06** (`R-05`) | **P2 (Tooling)** | `npm run lint` không chạy được do thiếu `eslint` trong `devDependencies`; dùng `npm run typecheck` + `npm run qa:gates` thay thế. | `package.json` | **OPEN** |
| **OPEN-07** | **P3 (Mobile UX)** | Trong Sweep 17 route trên viewport `375x844`, dù `mobileOverflowPx = 0` trên cả 17 trang, một số nút điều khiển nhỏ trên toolbar/inspector vẫn có kích thước `< 36px`: `/ai-vision` (`30`), `/digital-twin` (`26`), `/ai-assistant` (`14`), `/risk-assessment` (`9`), `/experience` (`8`), `/explainability` (`7`), `/ai-guided-survey` (`6`), `/simulations` (`5`), `/scenario-simulator` (`3`), `/`, `/dashboard`, `/reports`, `/risk-assessment/traceability` (`2`), `/analytics` (`1`). | Output Sweep Edge 17-route (`audit-browser-sweep.cjs`) | **OPEN (UX Improvement)** |
| **OPEN-08** | **P3 (Tooling)** | `npm run test:experience:browser` (`scripts/verify_cinematic_experience.cjs`) yêu cầu gói `playwright` (`node_modules/playwright` không được cài mặc định). | `scripts/verify_cinematic_experience.cjs` | **SKIPPED / BLOCKED** |
| **OPEN-09** (`R-06`) | **P3 (Architecture)** | Trạng thái duyệt nguồn tri thức runtime của `documentRegistry.ts` lưu trên bộ nhớ tiến trình ngoài SQLite khi khởi động lại server (4 nguồn gốc mặc định vẫn khóa trong mã). | `docs/release/RISK_REGISTER_AND_LIMITATIONS.md` | **ACCEPTED P2/P3** |
