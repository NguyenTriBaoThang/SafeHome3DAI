## SafeHome 3D AI — Pull Request

### 1. Task Metadata
- **Task ID**: [e.g. A01, A02, B01...]
- **Sprint**: [S0 | S1 | S2 | S3]
- **Branch**: `feature/a-<task>` | `feature/b-<task>`
- **Member / Owner**: [Thành viên 1 - Backend/Security/RAG | Thành viên 2 - Frontend/3D/Vision]
- **Shared Contract V1 Version**: `1.0.0`

---

### 2. Mô Tả Thay Đổi (Changes Summary)
- [Tóm tắt ngắn gọn các file sửa đổi và mục đích kỹ thuật]

---

### 3. Hợp Đồng Dữ Liệu & Nguồn Gốc Số Đo (Provenance & Contract Check)
- [ ] Tuân thủ chặt chẽ `docs/collaboration/SHARED_CONTRACT_V1.md`.
- [ ] Mọi số đo vật lý (kích thước, lux, chiều rộng lối đi) đều có `sourceType` rõ ràng:
  - `measured` | `user_confirmed` | `vision_estimated` | `simulated` | `unknown`
- [ ] Tuyệt đối **KHÔNG** biến giá trị `unknown` hoặc giả định thành số đo an toàn mặc định.
- [ ] Không biến giá trị dựng hình Three.js (light intensity) hay bounding box AI thành "kết quả đo đạc thực địa".
- [ ] Không đưa ra kết luận chẩn đoán y khoa, không dự báo xác suất té ngã, không khẳng định giảm tai nạn khi chưa kiểm chứng thực tế.

---

### 4. Kiểm Thử Thực Tế (Verification Evidence)
*Bắt buộc chạy script kiểm thử thực tế trên repo và đính kèm lệnh + log tóm tắt. Không chấp nhận đánh dấu PASS mà không có log.*

- **Typecheck**: `npx tsc --noEmit` -> [PASS / FAIL]
- **Unit / Contract Tests**: `npm test -- --run` -> [Số tests passed / failed]
- **Build**: `npm run build` -> [PASS / FAIL]

```bash
# Dán log tóm tắt kết quả chạy kiểm thử tại đây:

```

---

### 5. Danh Sách Kiểm Tra Điều Kiện Dừng (Release Blockers Checklist)
- [ ] Không có endpoint nào bỏ qua xác thực quyền sở hữu hồ sơ phía server (chống IDOR).
- [ ] Không để lộ API key, secrets trong mã nguồn, git history hay client bundle.
- [ ] Thao tác ghi database thất bại phải báo lỗi cho UI, không có hành vi "báo thành công giả".
- [ ] Không có sự mâu thuẫn mức độ nguy cơ giữa các màn hình (Digital Twin, Risk Assessment, AI Vision).
- [ ] Dữ liệu người dùng thực tế không bị trộn lẫn với dữ liệu DEMO/fixtures.

