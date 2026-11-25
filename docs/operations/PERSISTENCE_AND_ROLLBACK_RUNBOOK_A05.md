# SafeHome 3D AI — Lưu trữ tin cậy, Phân vùng DEMO/THỰC & Runbook Khôi phục (Task A05)

**Author:** Thành viên 1 (Backend, Risk Core, RAG & Security)  
**Collaborator / Consumer:** Thành viên 2 (B09 — Trạng thái lưu API thật & Demo UI)  
**Branch:** `feature/a-05-reliable-persistence-demo-boundary`  
**Status:** Implemented & Verified  

---

## 1. Báo cáo Kiểm toán Hiện trạng Lưu trữ (Persistence Audit)

| Thành phần / File | Vấn đề phát hiện trước Task A05 | Giải pháp đã áp dụng ở Task A05 |
|---|---|---|
| `src/app/api/assessments/route.ts` | Nuốt lỗi ghi DB (`catch (dbErr) { console.warn("DB save skipped") }`) và trả HTTP `200` với `persisted: false` khiến UI dễ nhầm đã lưu. | Gọi `persistAssessmentTransaction`, trả `persistenceStatus: "saved"` (`201`/`200`) chỉ sau khi commit thật; lỗi DB trả `503` kèm `persistenceStatus: "failed"`. |
| `src/app/api/rooms/route.ts` | Khi truy vấn SQLite lỗi, `catch` trả về `INITIAL_ROOMS` trong bộ nhớ như thể đó là hồ sơ thật. | Loại bỏ fallback giả mạo; trả `503` (`persistenceStatus: "failed"`) khi mất kết nối DB. Tách riêng dữ liệu `REAL` khỏi `DEMO`. |
| `src/lib/risk/assessmentManager.ts` | Hàm `runAndPersistAssessment` bỏ qua lỗi không tìm thấy phòng và chỉ lưu tạm trên RAM; không có `idempotencyKey`. | Tích hợp `persistAssessmentTransaction`, kiểm tra trùng lặp, hỗ trợ replay tất định và trả `persistenceStatus` minh bạch. |
| `src/app/api/risk-assessment/[assessmentId]/report/route.ts` & `/api/surveys/[id]/export` | Không có cơ chế ngăn xuất dữ liệu mẫu (`room-bedroom-01`, `home-bac-nam`) thành báo cáo khảo sát thực địa. | Áp dụng `assertRealFieldEvidenceForReport`: chặn xuất báo cáo `DEMO` với mã `403 DEMO_EXPORT_BLOCKED` (trừ khi bật `?preview=demo` kèm watermark). |
| `prisma/seed.js` | Chạy `deleteMany()` không có kiểm tra môi trường; dữ liệu mẫu không gắn nhãn `DEMO`. | Thêm `ProductionGuard` chặn xóa ở `NODE_ENV=production`; gắn nhãn `dataPartition: "DEMO"` cho mọi bản ghi mẫu. |

---

## 2. Giao thức Trạng thái Lưu trữ & Hợp đồng API (`B09`)

Mọi API ghi/đọc quan trọng hiện tuân thủ hợp đồng trạng thái thống nhất:

```typescript
type PersistenceStatus = "saved" | "pending" | "failed";
type DataPartition = "REAL" | "DEMO";
```

### Quy tắc bất biến:
1. **`persistenceStatus: "saved"`** CHỈ được trả về sau khi `prisma.$transaction(...)` thực hiện commit thành công trên đĩa SQLite.
2. **`persistenceStatus: "failed"`** đi kèm HTTP `503` (mất kết nối/lỗi DB), `404` (không tìm thấy phòng), `409` (xung đột Idempotency-Key), hoặc `403` (chặn cross-tenant / chặn xuất demo).
3. **Hỗ trợ Idempotency-Key:** Client có thể gửi header `Idempotency-Key: <key>` (hoặc `body.idempotencyKey`) khi nhấn lưu nhiều lần hoặc retry mạng yếu. Backend đảm bảo chỉ tạo 1 bản ghi duy nhất và trả `idempotentReplay: true` cho các lần gửi lại hợp lệ.
4. **Banner DEMO bắt buộc:** Mọi dữ liệu trình diễn (`dataPartition === "DEMO"` hoặc ID tiền tố `demo-` / `room-bedroom-01`) luôn đi kèm object `demoBanner` để UI hiển thị cảnh báo *"DỮ LIỆU TRÌNH DIỄN (DEMO) — Không phải bằng chứng khảo sát thực địa"*.

---

## 3. Cấu hình Môi trường (Dev / Test / Prod)

Quản lý tập trung tại `src/lib/config/envConfig.ts`:
- **Development (`NODE_ENV=development`):** Cho phép dùng SQLite cục bộ (`prisma/dev.db`) và chạy `npm run db:seed` với dữ liệu thuộc vùng `DEMO`.
- **Test (`NODE_ENV=test`):** Cô lập tự động từng worker Vitest vào thư mục tạm `.scratch/vitest/<uuid>/suite.db` thông qua `tests/globalSetup.ts`. Mỗi bài test tài khoản sinh file `family.db` độc lập tại thư mục riêng tư.
- **Production (`NODE_ENV=production`):** Kích hoạt `ProductionGuardError` chặn mọi lệnh `seed` có tính chất `deleteMany()` / reset database.

---

## 4. Runbook Migration An toàn & Rollback (Không mất dữ liệu thật)

### 4.1. Quy trình nâng cấp schema trên SQLite hiện có
File migration cộng thêm (non-destructive): [migration.sql](file:///g:/GITHUB/SafeHome3DAI/prisma/migrations/20261125_a05_persistence_demo_boundary/migration.sql).

**Các bước thực thi an toàn:**
1. **Sao lưu nóng (Backup trước khi sửa):**
   ```powershell
   Copy-Item prisma/dev.db "prisma/dev.db.bak.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
   ```
   *(Với môi trường đa tài khoản gia đình, sao lưu toàn bộ thư mục chứa `accounts.db` và từng `family.db`).*
2. **Áp dụng câu lệnh `ALTER TABLE` cộng thêm (không bao giờ dùng `--force-reset`):**
   ```bash
   npx prisma db execute --file prisma/migrations/20261125_a05_persistence_demo_boundary/migration.sql --schema prisma/schema.prisma
   npx prisma generate
   ```
3. **Kiểm tra toàn vẹn sau migration:**
   ```bash
   npx vitest run tests/reliablePersistenceDemoBoundary.test.ts
   ```

### 4.2. Quy trình Rollback khẩn cấp khi có sự cố
1. Dừng tiến trình Next.js server đang chạy để giải phóng khóa file SQLite (`.db-wal` / `.db-shm`).
2. Khôi phục bản sao lưu `.bak` nguyên vẹn về đường dẫn database gốc:
   ```powershell
   Copy-Item prisma/dev.db.bak.<timestamp> prisma/dev.db -Force
   ```
3. Chuyển nhánh git về commit ổn định trước Task A05 (`50fa2f1`) và chạy lại `npx prisma generate`:
   ```bash
   git checkout 50fa2f1 -- prisma/schema.prisma
   npx prisma generate
   ```
4. Không bao giờ chạy `prisma migrate reset` hoặc `prisma db push --force-reset` trên cơ sở dữ liệu chứa hồ sơ gia đình thật.

