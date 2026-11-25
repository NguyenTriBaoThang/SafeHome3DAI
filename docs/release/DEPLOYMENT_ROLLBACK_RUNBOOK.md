# SafeHome 3D AI — Deployment, Backup & Rollback Runbook (Task A12)

## 1. Kiến trúc triển khai & Yêu cầu môi trường
- **Runtime:** Node.js `>=22.12.0`, 1 instance Node.js có ổ đĩa bền vững (Persistent Disk / Volume) lưu SQLite từng gia đình và ảnh riêng tư trong `SAFEHOME_PRIVATE_DIR`.
- **Database chính / Dev:** SQLite (`prisma/schema.prisma`, thư mục `.private/<accountId>/family.db`).
- **Xác thực & Origin:** Đặt `SAFEHOME_APP_ORIGIN=https://<domain>` khi chạy sau reverse proxy HTTPS; giữ nguyên header `Origin` và Cookie `HttpOnly; SameSite=Strict`.

---

## 2. Biến môi trường & Feature Flags
| Biến môi trường / Flag | Mặc định | Tác dụng kiểm soát |
| :--- | :--- | :--- |
| `ENABLE_EXTERNAL_LLM` | `"false"` | `"true"` cho phép Copilot gọi Gemini API (cần `GEMINI_API_KEY`); `"false"` ép chạy chế độ **Offline Deterministic RAG** |
| `VISION_PROVIDER` | `"gemini"` | Chọn `"gemini"` (Cloud VLM qua server proxy) hoặc `"local"` (detector FastAPI nội bộ qua `LOCAL_DETECTOR_URL`) |
| `GEMINI_API_KEY` | *(rỗng)* | Chỉ đặt ở server-side env; tuyệt đối không đặt prefix công khai ra browser |
| `SAFEHOME_PRIVATE_DIR` | `.private` | Thư mục lưu `accounts.db`, `family.db` và ảnh upload riêng tư của từng hộ gia đình |
| `SAFEHOME_APP_ORIGIN` | request origin | Origin được phép gửi request ghi (`POST/PATCH/DELETE`) |
| `SAFEHOME_ISOLATED_TESTS` | `"0"` | Chỉ đặt `"1"` trong cấu hình test Vitest cô lập (`vitest.config.ts`) |

---

## 3. Quy trình khôi phục khi Gemini Downtime / Quá hạn mức (429/500/Timeout)
1. **Hành vi tự động của hệ thống (Circuit Breaker & Fallback):**
   - Với **Copilot Chat (`/api/ai/chat`)**: Nếu Gemini timeout, trả 429/500, hoặc câu trả lời không đạt kiểm chứng trích dẫn (`verifyAndFormatCitations`), hệ thống tự động hạ cấp sang `LOCAL_GROUNDED` (`modelProvider: "SafeHome-LocalRAG"`) có gắn nhãn `responseMode` rõ ràng.
   - Với **Vision Studio (`/api/vision/*`)**: Không âm thầm sinh vật thể giả. Khi provider lỗi, API trả HTTP `503` kèm thông báo chuyển sang gán nhãn/kiểm tra thủ công.
2. **Thao tác vận hành khi Gemini gián đoạn kéo dài:**
   - Đặt `ENABLE_EXTERNAL_LLM=false` trên server và restart tiến trình Node để Copilot phản hồi tức thì `< 5ms` bằng kho tài liệu đã phê duyệt (WHO, CDC, Bộ Y tế, NCOA).
   - Khi demo offline (không có Internet hoặc không cấu hình key), gắn nhãn rõ chế độ **"Offline Deterministic RAG Fallback"** trên kịch bản thuyết trình; không tự nhận đang chạy Live Gemini.

---

## 4. Quy trình Sao lưu (Backup) & Khôi phục (Restore / Rollback)
### 4.1. Sao lưu định kỳ (Dừng server để đồng bộ SQLite WAL)
```powershell
# 1. Dừng Node server đang chạy
# 2. Tạo bản sao kèm checksum manifest
node scripts/accounts/archive.cjs backup --source .private --destination G:/SafeHomeBackups/backup-YYYYMMDD --offline
```

### 4.2. Khôi phục khi gặp sự cố dữ liệu
```powershell
# 1. Dừng Node server
# 2. Khôi phục ra thư mục sạch mới và kiểm tra checksum
node scripts/accounts/archive.cjs restore --source G:/SafeHomeBackups/backup-YYYYMMDD --destination G:/SafeHomeRestored/private --offline
# 3. Trỏ SAFEHOME_PRIVATE_DIR tới G:/SafeHomeRestored/private và khởi động lại server
```

### 4.3. Rollback mã nguồn & DB
- **Mã nguồn:** `git revert <merge-commit-sha>` hoặc checkout tag ổn định trước đó, chạy `npm ci && npx prisma generate && npm run build`.
- **Snapshot nghiệp vụ Before–After:** Dùng `POST /api/v1/snapshots/rollback` để tạo `revision` mới từ phiên bản trước mà không xóa lịch sử hoặc ghi đè `BASELINE`.
- **Schema/Migration:** Các migration `a05`, `a06`, `a11` đều chỉ bổ sung bảng/chỉ mục mới (`CREATE TABLE IF NOT EXISTS`). Trước bất kỳ migration thay đổi cột hiện hữu nào, bắt buộc chạy `archive.cjs backup`.

