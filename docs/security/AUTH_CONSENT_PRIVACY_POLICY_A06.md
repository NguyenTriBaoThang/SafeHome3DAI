# SafeHome 3D AI — Chính sách Bảo mật, Phân quyền & Sự đồng ý của Người dùng (Task A06)

**Author:** Thành viên 1 (Backend, Risk Core, RAG & Security)  
**Collaborator / Consumer:** Thành viên 2 (`B02`, `B04`, `B09` — Màn hình đồng ý & luồng Vision)  
**Branch:** `feature/a-06-auth-consent-privacy`  
**Status:** Implemented & Verified  

---

## 1. Kiểm kê API Endpoints & Hàng rào Bảo mật (`Route Inventory`)

Toàn bộ 56 route trong `src/app/api/**` đều đã được kiểm toán:
- **Public Auth Routes (CSRF Same-Origin + Bounded Body + Rate Limit):**
  - `POST /api/auth/register` — Mật khẩu $\ge 12$ ký tự (scrypt salt ngẫu nhiên), rate limit `5 req/phút`, bắt buộc `consent: true` và lưu `ConsentRecord` phiên bản `2026.1`.
  - `POST /api/auth/login` — Constant-time `timingSafeEqual`, rate limit toàn cục & theo email (`10 req/15 phút`).
  - `POST /api/auth/logout` — Thu hồi session token SHA-256 trong `accounts.db` và xóa cookie `HttpOnly; SameSite=Strict`.
- **Authenticated Protected Routes (`withAccount` + Per-Family SQLite `family.db` + Object Auth):**
  - Toàn bộ `/api/surveys/**`, `/api/simulations/**`, `/api/risk-assessment/**`, `/api/vision/**`, `/api/ai/**`, `/api/rag/**`, `/api/rooms`, `/api/assessments`.
  - Middleware [middleware.ts](file:///g:/GITHUB/SafeHome3DAI/src/middleware.ts) chặn 100% truy cập tĩnh tới `/uploads/vision/*` (`404`) ngay cả khi có session cookie.

---

## 2. Hợp đồng Quản trị Sự đồng ý (`Consent API Contract`)

### 2.1. Schema `ConsentRecord` (Version `2026.1`)
Lưu vết bất biến tại `family.db`:
- `allowImageStorage`: Quyền lưu giữ ảnh hiện trường trong thư mục riêng tư (`.private/families/<accountId>/images`).
- `allowThirdPartyAI`: Quyền gửi byte ảnh hoặc nội dung tới mô hình AI bên thứ ba (**Gemini VLM / LLM**). **Mặc định từ chối (`false`).**
- `allowResearchUse`: Quyền sử dụng dữ liệu đã ẩn danh cho thống kê nghiên cứu.
- `retainOriginalImage` & `retentionDays`: Chính sách lưu giữ ảnh gốc (nếu `false`, hệ thống tự động xóa file ảnh gốc ngay sau khi trích xuất xong kết quả AI).
- `status`: `"GRANTED"` | `"REVOKED"`.

### 2.2. API Endpoints mới cho B02 / B04 / B09
- `GET /api/auth/consent`: Trả về trạng thái đồng ý hiện hành (hoặc `"NONE"` — từ chối mặc định).
- `POST /api/auth/consent`: Cấp / cập nhật đồng ý theo từng phạm vi chi tiết.
- `POST /api/auth/consent/revoke`: Thu hồi quyền xử lý (`REVOKED`); hỗ trợ `purgeStoredImages: true` để xóa toàn bộ ảnh đã lưu và trả về `purgedImagesCount` + `cleanupPendingIds`.
- `DELETE /api/auth/me`: Thực thi quyền được lãng quên (Right to Erasure) — thu hồi mọi session, xóa account, ngắt kết nối SQLite và xóa sạch thư mục `.private/families/<accountId>`.

---

## 3. Chính sách Chặn AI & Ảnh Riêng tư (`Private Media & Gemini Gate`)

1. **Default-Deny trước khi gọi Gemini:**
   - Các route `POST /api/vision/scan-photo`, `POST /api/vision/assess-item`, và `POST /api/vision/images/[imageId]/analyze` bắt buộc kiểm tra `assertConsentForAction({ requiredScope: "third_party_ai" })` **trước** khi bất kỳ byte ảnh nào rời máy chủ tới Gemini.
   - Nếu người dùng đã thu hồi đồng ý (`REVOKED`), mọi yêu cầu xử lý trong tương lai đều bị chặn với mã `403 CONSENT_REVOKED`, kể cả khi client gửi cờ cũ.
2. **Signed URLs ngắn hạn (`TTL <= 300s`):**
   - `signPrivateMediaUrl(imageId, accountId)` ký HMAC-SHA256 ràng buộc `imageId + accountId + expires`.
   - `GET /api/vision/images/[imageId]/file` kiểm tra chữ ký `timingSafeEqual`, thời hạn và chủ sở hữu tài khoản, trả về header `Cache-Control: private, no-store` và `X-Privacy-Policy: PRIVATE_HOUSEHOLD_MEDIA`.
3. **Che mờ & Đánh dấu Ảnh Demo (`Demo Image Masking`):**
   - Hàm `getImageMaskingPolicy(true)` và `buildDemoMaskingSvgOverlay()` áp dụng lớp phủ cảnh báo và `feGaussianBlur` cho ảnh trình diễn, gắn nhãn `DEMO_MASKED_NO_PII`.
4. **Xóa theo chuỗi minh bạch (`Cascade Deletion`):**
   - `deleteRoomCascade(roomId)` trong `DELETE /api/simulations/[id]` xóa đồng bộ `Room`, `Assessment`, `HazardFinding`, `RoomImage`, `VisionClarification`, `VisionRoomFact` trong SQLite transaction, xóa cache RAM, và xóa file ảnh thực tế trên đĩa (báo cáo rõ `deletedFiles` và `cleanupPendingFiles`).

---

## 4. Hướng dẫn tích hợp cho Thành viên 2 (`B02`, `B04`, `B09`)

1. Trước khi mở luồng upload hoặc gọi Gemini Vision, B09 gọi `GET /api/auth/consent` để kiểm tra `allowImageStorage` và `allowThirdPartyAI`. Nếu chưa đồng ý, hiển thị hộp thoại xin đồng ý theo từng mục đích và gửi `POST /api/auth/consent`.
2. Khi hiển thị ảnh phòng từ API upload/analyze, ưu tiên dùng `signedUrl` (hết hạn sau 5 phút) thay vì đường dẫn tĩnh công khai.
3. Cung cấp nút *"Thu hồi đồng ý & Xóa ảnh"* gọi `POST /api/auth/consent/revoke` với `{ purgeStoredImages: true }`.

