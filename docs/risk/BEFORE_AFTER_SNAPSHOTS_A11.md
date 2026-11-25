# Task A11 — API lưu Snapshot & So sánh Before–After có thể tái lập

## 1. Mô hình dữ liệu & Bất biến (Prisma `RoomSnapshotRecord`)
- **Bảng dữ liệu:** `RoomSnapshotRecord` (`prisma/schema.prisma` + migration `prisma/migrations/20261125_a11_before_after_snapshots/migration.sql`).
- **Tách biệt 3 loại snapshot:**
  1. `BASELINE`: Hiện trạng ban đầu — **bất biến**, không bị ghi đè bởi các kịch bản mô phỏng hay lần kiểm tra lại (`IMMUTABLE_BASELINE_EXISTS` / HTTP `409`).
  2. `PROPOSED_SCENARIO`: Đề xuất thay đổi trên mô hình 3D (`simulateScenarioSnapshot`), tự động gắn provenance `"simulated"` và `canClaimVerifiedIntervention = false`.
  3. `VERIFIED_POST_INTERVENTION`: Xác minh sau khi đã cải tạo ngoài đời thật (`measured` / `user_confirmed`), mỗi lần cập nhật tạo một `revision` mới đơn điệu tăng dần kèm `snapshotHash` SHA-256 và `assessmentVersion = "2026.1"`.

## 2. Cơ chế đồng bộ lạc quan, Rollback, Lỗi lưu trữ & Phân quyền
- **Optimistic Concurrency:** Truyền `expectedRevision` khi tạo / mô phỏng / rollback; nếu sai lệch với `revision` mới nhất trong DB sẽ trả HTTP `409 Conflict` (`OPTIMISTIC_CONCURRENCY_CONFLICT`, `persistenceStatus: "failed"`).
- **Rollback không phá hủy lịch sử:** `POST /api/v1/snapshots/rollback` không xóa/sửa bản ghi cũ mà sinh `revision` mới kế tiếp tham chiếu `parentSnapshotId` và ghi `PersistenceAuditEvent` (`SNAPSHOT_ROLLED_BACK`).
- **Không giả lưu thành công:** Lỗi SQLite/transaction trả về HTTP `503` kèm `persisted: false, persistenceStatus: "failed"`.
- **Phân quyền chủ sở hữu:** `assertSnapshotOwnership` + `authorizeObjectAccess` chặn đọc/mô phỏng/đối chiếu/rollback chéo tài khoản (`403 Forbidden`).

## 3. Hợp đồng đối chiếu Before–After (`POST /api/v1/snapshots/compare`)
- Đánh giá lại bằng lõi chuẩn duy nhất `evaluateRoomHazardsCanonical`.
- Phân loại từng quy tắc thành: `RESOLVED`, `INCREASED`, `NEW`, `UNCHANGED`, `NEEDS_VERIFICATION`.
- Kèm `reason`, `beforeMeasuredValue`, `afterMeasuredValue`, `missingDataFields`, và `notMeasuredWarning` (*"Cảnh báo chưa đo thực tế (if not measured)"* nếu dữ liệu sau can thiệp chưa đo trực tiếp).
- **Khi dữ liệu thiếu (`unknown` / `NEEDS_VERIFICATION`):** `evaluationVerdict = "CHUA_THE_DANH_GIA"` và `verdictLabel` nêu rõ **"Chưa thể đánh giá đầy đủ (không được coi là đã an toàn)"** — tuyệt đối không báo `"đã an toàn"`.
- **Không dùng điểm tổng làm bằng chứng giảm tai nạn:** luôn trả `aggregateScoreDisclaimer` rõ ràng.

## 4. Điểm giao phối hợp với Thành viên 2 (B09)
- OpenAPI v1 spec: `docs/api/before-after-snapshots-openapi-v1.yaml`.
- Fixtures đồng bộ: `src/data/beforeAfterFixturesB09.ts`.

