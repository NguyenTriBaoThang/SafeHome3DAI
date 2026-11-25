# SafeHome3DAI — Full System Audit Report

- **Branch kiểm toán:** `audit/full-system-verification` (đã hợp nhất `feature/b-12-novelty-demo-integration` tại `5eb3de3`)
- **Trạng thái nhánh `main`:** Bảo toàn nguyên vẹn, không sửa/push trực tiếp lên `main`
- **Môi trường chạy thực tế:** Windows, Node `v24.20.0`, npm `11.19.0`, `prisma/dev.db` SHA-256 trước & sau toàn bộ sweep trình duyệt không đổi (`628A5FB1F1C29983203D7DBD381DF111B4DE1BBA0FA90E9DE2D4F5538DFFD6CA`)

---

## 1. Đối Chiếu Công Nghệ Thực Tế (`package.json` vs `README.md`)

| Thành phần | Trước audit (`README.md` / `node_modules` cục bộ) | Thực tế trong `package.json` & sau `npm ci` | Trạng thái |
| :--- | :--- | :--- | :--- |
| **Next.js** | `README.md` ghi `15.3.0` | `15.5.29` (App Router) | **FIXED** (`README.md` đã đồng bộ lên `15.5.29`) |
| **React / React DOM** | `node_modules` cục bộ lệch ở `18.3.1` | `^19.1.0` (`19.1.0` sau `npm ci`) | **FIXED** (Sửa crash R3F `ReactCurrentBatchConfig`) |
| **@react-three/fiber** | `node_modules` cục bộ ở `8.18.0` | `^9.8.2` | **FIXED** (Đồng bộ qua `npm ci`) |
| **@react-three/drei** | `node_modules` cục bộ lệch peer React 19 | `^10.7.9` | **FIXED** |
| **Three.js** | `^0.165.0` | `^0.165.0` (`three-stdlib` `^2.30.4`) | **VERIFIED** |
| **Prisma / SQLite** | `@prisma/client` / `prisma` `^5.22.0` | `^5.22.0` (`prisma/schema.prisma`, `31` models) | **VERIFIED** |
| **Zustand / Zod** | `zustand` `^4.5.2`, `zod` `^4.6.7` | `zustand` `^4.5.2`, `zod` `^4.6.7` | **VERIFIED** |
| **Node Engine** | `README.md` yêu cầu Node `>= 18.x` | `package.json` `engines.node`: `>=22.12.0` (chạy trên `v24.20.0`) | **FIXED** (`README.md` đã cập nhật) |
| **TypeScript / Vitest** | `typescript` `^5.4.5`, `vitest` `^5.1.1` | `vite` `^8.3.8`, `tsc --noEmit` exit `0` | **VERIFIED** |
| **ESLint (`npm run lint`)** | Chưa cài gói `eslint` trong `devDependencies` | `next lint` báo cần cài `eslint` | **OPEN (P2)** (Xem `REMAINING_ISSUES.md`) |

---

## 2. Kiểm Kê Hệ Thống (Inventory)

- **App Router Pages (`17` routes):**
  - Công khai / Điều hướng chính: `/sign-in` (`src/app/sign-in/page.tsx`), `/` (`src/app/page.tsx`), `/dashboard` (`src/app/dashboard/page.tsx`).
  - Luồng khảo sát & thị giác: `/workflow` (`src/app/workflow/page.tsx`), `/ai-guided-survey` (`src/app/ai-guided-survey/page.tsx`), `/ai-vision` (`src/app/ai-vision/page.tsx`), `/vision` (`src/app/vision/page.tsx`).
  - Mô phỏng 3D & Tương tác không gian: `/digital-twin` (`src/app/digital-twin/page.tsx`), `/experience` (`src/app/experience/page.tsx`), `/scenario-simulator` (`src/app/scenario-simulator/page.tsx`), `/simulations` (`src/app/simulations/page.tsx`).
  - Đánh giá nguy cơ, Giải trình & Báo cáo: `/risk-assessment` (`src/app/risk-assessment/page.tsx`), `/risk-assessment/traceability` (`src/app/risk-assessment/traceability/page.tsx`), `/explainability` (`src/app/explainability/page.tsx`), `/analytics` (`src/app/analytics/page.tsx`), `/reports` (`src/app/reports/page.tsx`), `/ai-assistant` (`src/app/ai-assistant/page.tsx`).
- **API Routes (`63` routes):**
  - `4` endpoint xác thực công khai: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`.
  - `59` endpoint nghiệp vụ được bảo vệ bắt buộc bởi `withAccount()` (kiểm chứng qua `scripts/ci/quality-gates.cjs`: `Protected API routes checked: 59`, `Gate Failures: 0`).
  - Lưu ý `POST /api/workflow/save-state`: Trả HTTP `410` (`DEMO_WORKFLOW`) theo thiết kế tách ranh giới `DEMO` vs `REAL`.
- **Database Models (`31` Prisma models trong `prisma/schema.prisma`):**
  `Project`, `Home`, `Room`, `SceneObject`, `SimulationScenario`, `SceneSnapshot`, `Assessment`, `HazardFinding`, `Recommendation`, `KnowledgeSource`, `KnowledgePassage`, `Conversation`, `ConversationMessage`, `AnswerCitation`, `HomeSurvey`, `SurveyRoom`, `SurveyAnswer`, `SurveyRoomProfile`, `SurveyFinding`, `SurveyRoomPhoto`, `SurveyAuditEvent`, `RoomImage`, `VisionAnalysis`, `ObjectDetection`, `VisionObservation`, `VisionClarification`, `VisionRoomFact`, `VisionAuditEvent`, `PersistenceAuditEvent`, `ConsentRecord`, `RoomSnapshotRecord`.
- **Thư viện miền (`src/lib/`):** `ai`, `assets`, `auth`, `config`, `contracts`, `database`, `experience`, `http`, `persistence`, `privacy`, `provenance`, `rag`, `reconstruction`, `risk`, `security`, `simulations`, `survey`, `three`, `vision`.
- **State Store:** `src/stores/useSimulationStore.ts` (`1` Zustand store).

---

## 3. Ma Trận Trạng Thái Tính Năng (Phase 0–13)

| Phân hệ / Tính năng | Trạng thái kiểm chứng | Bằng chứng mã nguồn & kiểm thử thực tế |
| :--- | :--- | :--- |
| **1. Build & TypeScript & Lockfile** | **IMPLEMENTED** | `npm ci` + `npx prisma generate` + `npm run typecheck` (`0` lỗi) + clean `npx next build` (`23/23` trang tĩnh). |
| **2. Auth, Multi-tenant SQLite & Consent** | **IMPLEMENTED** | `withAccount.ts`, `accounts.ts`, `authConsentPrivacy.test.ts` (7/7 pass), `accountIsolation.test.ts` (6/6 pass), `browser.cjs` (`25/25` pass), HMAC URLs & cascade deletion. |
| **3. Guided Survey & NLP Interpreter** | **IMPLEMENTED** (đã vá BUG-01/BUG-02) | `/ai-guided-survey` bỏ `simulateVision: true`, tải ảnh qua `/api/vision/images`; `surveyIntegration.test.ts` (4/4 pass), `surveyEngine.test.ts` (9/9 pass). |
| **4. AI Vision Pipeline (18 lớp, HITL)** | **PARTIALLY_IMPLEMENTED** (`BLOCKED` huấn luyện ML) | Phần mềm upload, HITL confirm/edit/retract, `visionState.test.ts` (17/17 pass), `visionProviders.test.ts` (47/47 pass). Stage 5 RT-DETR `not_ready` (`0` ảnh train/val verified). |
| **5. 3D Digital Twin & Spatial Reconstructor** | **IMPLEMENTED** | `spatialReconstructor.ts`, `scenePlacement.ts`, `lightingModel.ts`, `RoomCanvas.tsx`, `WebGLBoundary.tsx`; `/digital-twin`, `/scenario-simulator`, `/experience` render cleanly (`0` consoleErrors/pageErrors). |
| **6. Canonical Risk Engine (`RISK-001..008`)** | **PARTIALLY_IMPLEMENTED** (chờ duyệt lâm sàng) | `riskRuleRegistry.ts`, `thresholdConfig.ts` (`2026.1`), `canonicalRiskEngine.test.ts` (10/10 pass), `clinicalThresholdReview.test.ts` (31/31 pass). Ngưỡng giữ nhãn `PENDING_CLINICAL_REVIEW` (`R-01`). |
| **7. Before/After Immutable Snapshots (`v1`)** | **IMPLEMENTED** | `snapshotManager.ts`, `/api/v1/snapshots*`, `beforeAfterSnapshotsA11.test.ts` (5/5 pass), rollback nguyên tử, giữ `"chưa thể đánh giá"` khi thiếu hậu kiểm. |
| **8. RAG Copilot & Curated Sources** | **PARTIALLY_IMPLEMENTED** (chưa human-grade live LLM) | `eval:rag:a09`: `40/40 (100%)` chế độ `OFFLINE_DETERMINISTIC` (`PRELIMINARY`); `/ai-assistant` vá lỗi 404 khởi tạo (`BUG-06`); live Gemini grading chưa thực hiện (`R-02`). |
| **9. Explainability & Decision Provenance** | **IMPLEMENTED** | `/explainability`, `/risk-assessment/traceability`, `decisionTraceabilityA10.test.ts` (5/5 pass); không ghi nhận overclaim `XAI`. |
| **10. Reports, Analytics & DEMO/REAL Guard** | **IMPLEMENTED** | `reliablePersistenceDemoBoundary.test.ts` (9/9 pass), `workflowB09.test.tsx` (19/19 pass), tách riêng số đo ảnh (`PHOTO_DRAFT`) khỏi điểm an toàn. |
| **11. Offline Backup / Restore SQLite** | **IMPLEMENTED** | `http-smoke.cjs` PASS `offline_backup_restore_real_sqlite`; `archive.test.ts` (1/1 pass). |
| **12. Security & Quality Gates** | **IMPLEMENTED** (còn backlog `error.message` tuyến phụ) | `npm run qa:gates` (`301` files scanned, `59` protected routes, `0` failures), `securityHardeningA07.test.ts` (13/13 pass); đã chuẩn hóa `buildSafeErrorPayload` trên các route AI/RAG/Survey chính (`BUG-02`). |
| **13. Clinical & Field Study Validation (B11)** | **NOT_VERIFIED / BLOCKED** | `reports/b11_evaluation_summary.json`: `status: "blocked_awaiting_field_data"`, `0` bản ghi hiện trường, `0` SUS, `maeCm: null`. |
