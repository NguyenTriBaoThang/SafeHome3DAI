# B09 — Luồng 7 bước /workflow, snapshot A11 và báo cáo Before–After

## 1. Nguồn sự thật
| Dữ liệu | Nguồn sự thật | Ghi chú |
|---|---|---|
| Đánh giá nguy cơ (bước 5-7, header) | Snapshot `RoomSnapshotRecord` qua `/api/v1/snapshots*` (A11) | Điểm/nguy cơ do bộ quy tắc chuẩn tính ở máy chủ; UI không tự tính. |
| Dữ liệu nhập bước 1-2 | Chỉ nằm trong bộ nhớ trình duyệt cho tới khi lưu BASELINE | Sau đó khôi phục từ `roomState.workflowMeta` của BASELINE (cấu hình, checklist, số đo, cảnh 3D). Không lưu mô tả sức khỏe tự do của cư dân. |
| Ảnh và nhận diện bước 3 | API vision (B04) | Không được khôi phục sau reload (chỉ cảnh 3D đã lưu được khôi phục). |
| `/api/workflow/save-state` | Không dùng. Route trả 410 (A giữ) | Có thể xóa; UI không còn gọi. |
| Phòng đang làm việc (cho header) | `localStorage["safehome:active-room"]` + GET snapshots | Bị xóa khi đăng xuất (tiền tố `safehome:`). Máy chủ vẫn kiểm tra chủ sở hữu. |

## 2. Dữ liệu theo từng bước
1. Hồ sơ: không gọi API. Bắt đầu rỗng (không có hồ sơ cư dân mẫu).
2. Thu thập: checklist 3 trạng thái (Có/Không/Chưa biết, mặc định Chưa biết) + số đo tùy chọn (lối đi, lux đêm, gờ cửa) kèm nguồn `measured` hoặc `user_confirmed`. Trường chưa biết bị bỏ khỏi đầu vào, engine trả `NEEDS_VERIFICATION`.
3. Thị giác AI: `/api/vision/*` như B04. Bỏ qua được.
4. Mô hình phòng: dựng cục bộ; photo-draft dùng id ổn định `photo-draft-workflow-<loại phòng>` nên dựng lại thì thay thế (không thêm phòng mới vào store).
5. Đánh giá: khi bấm Tiếp tục từ bước 4 gọi `POST /api/v1/snapshots` (BASELINE, `expectedRevision:0`, `Idempotency-Key: baseline-<room>`). Chỉ vào bước 5 khi máy chủ trả `success && persisted && persistenceStatus:"saved"`. Bước 5 hiển thị `canonicalAssessment` của snapshot.
6. Mô phỏng: chọn hành động (chỉ hiện khi áp dụng được với dữ liệu hiện trạng), `POST /api/v1/snapshots/simulate` với `roomPatches`, `expectedRevision` = revision PROPOSED mới nhất (hoặc 0). Danh sách hành động đã lưu nằm trong `notes` dạng `[ID,ID]`.
7. Báo cáo: `POST /api/v1/snapshots/compare` cho (Hiện trạng, Mô phỏng) và (Hiện trạng, Đã xác minh). Ba thẻ trạng thái luôn tách riêng. Form "Tôi đã sửa ngoài thực tế" (ai, ngày, đã làm gì, số đo nhập lại, xác nhận) tạo `VERIFIED_POST_INTERVENTION` qua `POST /api/v1/snapshots` với `parentSnapshotId`. Độ rộng lối đi và lux của hiện trạng không được mang sang: bỏ trống thì ghi "chưa đo".

## 3. Máy trạng thái
`chưa lưu (1-4)` -> [Tiếp tục 4->5, lưu BASELINE ok] -> `BASELINE đã lưu (5)` -> [lưu mô phỏng ok] -> `PROPOSED đã lưu (6)` -> [khai báo đã sửa ok] -> `VERIFIED đã lưu (7)`.
- Có BASELINE thì bước 1-2 bị khóa chỉ xem (BASELINE bất biến); muốn nhập lại: "Đánh giá phòng mới" (roomId mới `wf-<loại>-<10 ký tự>`).
- URL: `/workflow?step=N&room=<roomId>`. `room` chỉ có sau khi lưu BASELINE. Reload: đọc `?room`, GET danh sách snapshot, khôi phục step (bị kẹp về 1 nếu chưa có BASELINE; `resolveRestoreStep`). Prev/Next dùng `history.pushState`, popstate được xử lý.

## 4. Lỗi, đồng ý, chặn dữ liệu
- "Đã lưu" chỉ hiện khi máy chủ xác nhận. 5xx/mạng: banner lỗi "Chưa có gì được lưu" + nút Thử lại, ở nguyên bước.
- 409: tải lại danh sách snapshot rồi báo người dùng xem lại và thử lại (BASELINE đã tồn tại -> trạng thái được nạp lại).
- 403/404: "Chưa đánh giá", quay về bước 1 kèm thông báo.
- Cảnh báo rời trang: `beforeunload` + chặn bấm liên kết nội bộ (confirm) khi có dữ liệu bước 1-2 chưa lưu hoặc mô phỏng chưa lưu.
- Đồng ý ảnh/AI: giữ nguyên B04 (checkbox đồng ý trước khi gửi).
- Chốt chặn ngôn từ (`reportGuard.ts`): chỉ dùng cách nói "đã xác minh cải thiện yếu tố môi trường" khi snapshot sau là VERIFIED, API trả `VERIFIED_IMPROVEMENT`, `canClaimVerifiedIntervention`, không thiếu dữ liệu và lối đi + lux là `measured`/`user_confirmed`. Mô phỏng thì luôn "Mô phỏng đề xuất, chưa xác minh ngoài thực tế"; thiếu dữ liệu thì "Chưa thể đánh giá". Cụm "đã an toàn" bị thay khi không được phép.
- Header: chỉ snapshot mới nhất của phòng đang làm việc; chưa có thì "Chưa đánh giá". Điểm bị ẩn khi còn quy tắc thiếu dữ liệu. Lux luôn kèm nhãn nguồn (không có hồ sơ nguồn = "mô phỏng").
- Chi phí: luôn "ước tính", lấy từ khuyến nghị của engine; không báo giá.

## 5. Còn lại / giới hạn
- Cảnh 3D chỉnh sửa ở bước 6 không được lưu (chỉ patch dữ liệu được lưu); reload khôi phục cảnh của BASELINE.
- Ảnh/nhận diện bước 3 không khôi phục sau reload.
- Khi camera focus vào vật thể ở bước 5, nhãn 3D có thể che khung nhìn (hành vi focus của B07).
- Header chật ở màn hình hẹp. Các trang khác vẫn còn chữ "Digital Twin" (ngoài phạm vi B09).
- Chưa kiểm thử trình duyệt: hộp thoại beforeunload/confirm, nhánh 409 và 503 (có unit test cho client).
- Thay đổi hạ tầng test: `vitest.config.ts` thêm `oxc.jsx.runtime = automatic` để test render component .tsx.

## 6. Yêu cầu cho A
1. `GET /api/v1/snapshots?latest=1` theo tài khoản (header hiện cần `localStorage` để biết phòng đang làm việc).
2. Để UI chưa có xác minh vẫn tạo được `VERIFIED` mà không cần BASELINE nhập lại: hiện `roomId` là khóa toàn cục, cần xác nhận roomId sinh phía client (`wf-...`) không đụng giữa tài khoản (mỗi tài khoản có DB riêng nên hiện an toàn).
3. Cho `simulate` nhận thêm `sceneState` tùy chọn (hoặc lưu cảnh 3D) để khôi phục cảnh mô phỏng.
4. Xóa hoặc thay route 410 `/api/workflow/save-state`.
5. `normalizeRoomStateToAssessmentInput` gán `USER_MEASURED`, lối đi 0.65m, lux = `lightingLevel` cho cảnh 3D: B09 không dùng, nhưng các trang khác còn dùng.
