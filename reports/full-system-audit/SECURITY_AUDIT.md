# SafeHome3DAI — Security, Privacy & Multi-Tenant Audit

## 1. Bảng Kiểm Soát An Toàn Thông Tin (OWASP & HealthTech Privacy)

| Hạng mục | Cơ chế trong mã nguồn | Bằng chứng kiểm chứng | Trạng thái |
| :--- | :--- | :--- | :---: |
| **Xác thực & Phiên (AuthN)** | Băm mật khẩu có salt (`accounts.ts`), cookie phiên HTTP-only/HMAC, thu hồi phiên khi logout hoặc xóa tài khoản. | `accountIsolation.test.ts` (6/6 pass); `browser.cjs` (`logout_form_revokes_browser_session` PASS) | **PASS** |
| **Phân quyền API (AuthZ)** | `59/59` API route nghiệp vụ bọc bởi `withAccount()`; `4` route `/api/auth/{login,register,logout,me}` công khai theo thiết kế. | `npm run qa:gates` (`Protected API routes checked: 59`, `Gate Failures: 0`) | **PASS** |
| **Cô lập Multi-Tenant (IDOR)** | Tách database SQLite & thư mục lưu ảnh riêng từng hộ (`SAFEHOME_PRIVATE_DIR`), kiểm tra chéo tài khoản và ghi nhận audit log truy cập trái phép. | `accountIsolation.test.ts`, `authConsentPrivacy.test.ts` (7/7 pass), `reliablePersistenceDemoBoundary.test.ts` (9/9 pass), `beforeAfterSnapshotsA11.test.ts` (5/5 pass) | **PASS** |
| **Media Riêng Tư & HMAC URL** | Ảnh hộ gia đình phục vụ qua route API kiểm tra quyền & chữ ký HMAC ngắn hạn; từ chối ẩn danh / hộ khác / truy cập công khai (`images.unoptimized: true`). | `privateMediaPaths.test.ts` (5/5 pass), `authConsentPrivacy.test.ts`, `browser.cjs` (`private_media_rejects_anonymous_other_family_and_public_optimizer_access` PASS) | **PASS** |
| **Đồng Ý Dữ Liệu (Consent Gate)** | Chế độ mặc định từ chối (`default-deny`) gửi ảnh/nội dung ra bên thứ ba (Gemini) khi chưa có `ConsentRecord` `thirdPartyAI` còn hiệu lực hoặc đã thu hồi; đã bỏ mock URL ngoài ở `/ai-guided-survey`. | `authConsentPrivacy.test.ts` (`blocks Gemini processing when thirdPartyAI consent is missing or revoked`), sửa **BUG-01** | **PASS** |
| **Xóa Dữ Liệu Dây Chuyền (Cascade)** | Xóa ảnh thu hồi bằng chứng khảo sát & xóa file đĩa an toàn; xóa phòng/hộ xóa toàn bộ DB + thư mục riêng trên đĩa. | `visionState.test.ts` (17/17 pass), `authConsentPrivacy.test.ts`, `browser.cjs` | **PASS** |
| **Quét Lộ Secret & Migration Phá Hủy** | Quét 301 tệp nguồn/script/CI chống `AIza...`, `NEXT_PUBLIC_*` chứa key, private key; cấm `DROP TABLE` / `TRUNCATE TABLE` / `DELETE FROM` trong migrations. | `npm run qa:gates` (`301` files, `0` failures) | **PASS** |
| **Giới Hạn Kích Thước Request** | `next.config.mjs`: `experimental.middlewareClientMaxBodySize: "15mb"`; detector kiểm tra kích thước byte (tối đa `10 MB`). | `next.config.mjs`, `visionProviders.test.ts` (`Buffer.alloc(10 * 1024 * 1024 + 1)` bị từ chối `INVALID_IMAGE`) | **PASS** |
| **Bảo Vệ Lỗ Hổng Gói (`npm`)** | Kiểm toán dependency trên `node_modules` đồng bộ. | `npm ci`: `found 0 vulnerabilities`; `reports/completion/dependency-audit.json`: `total: 0` (`info/low/moderate/high/critical: 0`) | **PASS** |
| **Ẩn Chi Tiết Lỗi Nội Bộ (Error Hygiene)** | `buildSafeErrorPayload()` & `redactSecretsAndPII()` (`src/lib/security/resilience.ts`). | Đã vá **BUG-02** trên 5 route AI/RAG/Survey chính + `securityHardeningA07.test.ts` (13/13 pass); còn backlog ở tuyến phụ | **PARTIAL (Backlog P2)** |

---

## 2. Chi Tiết Backlog Chưa Che Giấu `error.message` (OPEN-05 — P2)

Quét tĩnh toàn bộ `src/app/api/**/route.ts` ghi nhận **5 route chính đã xử lý qua `buildSafeErrorPayload`** (`ai/chat`, `ai/chat/stream`, `rag`, `surveys`, `surveys/interpret-nlp`, `surveys/[id]/rooms/[roomId]/photos`), đồng thời vẫn còn các handler ở tuyến con trả `error.message` hoặc `details: error.message` trong khối `catch`:
- Nhóm AI Conversations: `src/app/api/ai/conversations/route.ts`, `src/app/api/ai/conversations/[id]/route.ts`.
- Nhóm RAG phụ: `src/app/api/rag/documents/route.ts`, `src/app/api/rag/documents/[id]/reindex/route.ts`, `src/app/api/rag/eval/route.ts`, `src/app/api/rag/search/route.ts`, `src/app/api/rag/sources/route.ts`, `src/app/api/rag/sources/[id]/route.ts`.
- Nhóm Risk / Assessments / Simulations / Workflow: `src/app/api/assessments/route.ts`, `src/app/api/risk-assessment/compare/route.ts`, `src/app/api/risk-assessment/evaluate/route.ts`, `src/app/api/risk-assessment/findings/[findingId]/explain/route.ts`, `src/app/api/risk-assessment/rooms/[roomId]/latest/route.ts`, `src/app/api/risk-assessment/traceability/route.ts`, `src/app/api/risk-assessment/[assessmentId]/route.ts`, `src/app/api/risk-assessment/[assessmentId]/report/route.ts`, `src/app/api/simulations/[id]/route.ts`, `src/app/api/workflow/state/[id]/route.ts`.
- Nhóm Auth Consent / Survey con / Vision: `src/app/api/auth/consent/route.ts`, `src/app/api/auth/consent/revoke/route.ts`, `src/app/api/surveys/[id]/route.ts`, `src/app/api/surveys/[id]/export/route.ts`, `src/app/api/surveys/[id]/rooms/route.ts`, `src/app/api/surveys/[id]/rooms/[roomId]/route.ts`, `src/app/api/surveys/[id]/rooms/[roomId]/answers/route.ts`, `src/app/api/surveys/[id]/rooms/[roomId]/answers/[answerId]/route.ts`, `src/app/api/surveys/[id]/rooms/[roomId]/complete/route.ts`, `src/app/api/surveys/[id]/rooms/[roomId]/findings/route.ts`, `src/app/api/surveys/[id]/rooms/[roomId]/next-question/route.ts`, `src/app/api/surveys/[id]/rooms/[roomId]/profile/route.ts`, và các route `src/app/api/vision/**` (`analyses/*`, `assess-item`, `clarifications/*`, `detections/*`, `images/*`, `rooms/*`, `scan-photo`).

**Khuyến nghị:** Rà soát từng route phụ có mã lỗi nghiệp vụ (`ResourceNotFoundError`, `PersistenceWriteError`, `CrossTenantAccessError`, `VisionProviderError`) để chỉ trả message nghiệp vụ an toàn và bọc các lỗi không xác định (`Error` hệ thống/Prisma) bằng `buildSafeErrorPayload()` trong đợt bảo trì tiếp theo.

---

## 3. Giới Hạn Triển Khai Đã Xác Nhận

Theo mô hình kiến trúc hiện tại (`reports/completion/verification.json` & `RISK_REGISTER_AND_LIMITATIONS.md`):
- Yêu cầu **1 Node server + ổ đĩa bền vững** (`SAFEHOME_PRIVATE_DIR`) cho cơ sở dữ liệu SQLite phân lập theo hộ.
- Mỗi tài khoản tương ứng **1 hộ gia đình**; chưa hỗ trợ mời thành viên, xác minh email, khôi phục mật khẩu qua email hay MFA.

