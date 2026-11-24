# Các task hoàn thiện dự án

Phạm vi: sửa các khoảng trống sau Giai đoạn 6 và hỗ trợ nhiều tài khoản, mỗi gia đình có dữ liệu riêng. Không thay ngưỡng nguy cơ, đổi nhãn AI thành verified hoặc dùng lại test ML để chỉnh cấu hình.

| Task | Tiêu chí hoàn thành | Trạng thái |
| --- | --- | --- |
| T1 — Cách ly kiểm thử | `npm test` dùng SQLite tạm, không chấp nhận mất dữ liệu, không ghi database người dùng; dọn sau chạy | Đạt: suite 294 ca đạt, 1 bỏ qua |
| T2 — Ảnh → 3D | Chỉ chuyển vật thể đã xác nhận; đánh dấu ước lượng; không đánh giá thực trạng từ bản dựng ảnh chưa đo | Đạt: browser kiểm tra 3D → analytics → JSON; phép đo và điểm chưa xác minh giữ null |
| T3 — Upload | Không thành công giả; kiểm tra đầu vào; metadata đúng hoặc chưa xác định; dọn file khi database lỗi | Đạt: lỗi database trả 503 và thu hồi file; consent bắt buộc |
| T4 — Xóa và thu hồi | Xóa qua API, thu hồi dữ kiện theo nguồn, đồng bộ hồ sơ; tải lại không khôi phục ảnh đã xóa | Đạt: SQLite thật kiểm tra rollback; browser kiểm tra xóa/tải lại |
| T5 — Nhiều tài khoản | Đăng ký/đăng nhập; cô lập dữ liệu giữa tài khoản; ảnh riêng tư; giới hạn gọi AI; không tự nhận dữ liệu cũ | Đạt kiểm thử server/browser; giới hạn triển khai xem ACCOUNTS_OPERATIONS |
| T6 — Dữ liệu ML | Kiểm tra cổng dữ liệu và bàn giao; không train/benchmark chính thức khi chưa đủ nhãn người xác nhận | Đã kiểm tra cổng; chất lượng ML chưa hoàn thành vì train/val verified đều 0 |
| T7 — Nghiệm thu/vận hành | Kiểm thử hồi quy, quyền truy cập, trình duyệt, build; sao lưu/khôi phục và báo cáo mới | Đạt: 294 ca, 1 bỏ qua; 10 HTTP, 22 browser, backup/restore, build và TypeScript |

Không commit/deploy hoặc xóa dữ liệu hiện có. Luồng xóa mới chỉ chạy khi người dùng bấm xóa. Dữ liệu cũ không được tự gán cho tài khoản đăng ký mới. Báo cáo ML_COMPLETION cũ là bằng chứng lịch sử, không chứng nhận toàn bộ sản phẩm.

## Bằng chứng nghiệm thu ngày 22/11/2026

Trạng thái: **software_acceptance_passed_ml_quality_pending**. Build được kiểm tra: `R2tdyZb9GCFFl7TUv-R3r`.

| Kiểm tra | Kết quả | Báo cáo |
| --- | --- | --- |
| Toàn bộ Vitest | 36 file; 294 ca đạt, 1 ca live API bỏ qua | [full-tests.json](../reports/completion/full-tests.json) |
| Next production HTTP | 10 kiểm tra đạt; file public mẫu có thật bị chặn cả khi mã hóa URL | [http-smoke.json](../reports/completion/http-smoke.json) |
| Chromium/Edge thật | 22 kiểm tra đạt; 0 lỗi runtime; 3 lượt detector fixture | [browser.json](../reports/completion/browser.json) |
| Sao lưu/khôi phục offline | Đạt trên database tài khoản/gia đình tạm; kiểm tra checksum và đọc SQLite sau khôi phục | [restore.json](../reports/completion/restore.json) |
| Toàn vẹn | Database cũ không đổi trong suite cuối và browser QA; 21 nguồn Giai đoạn 4, manifest và quyết định người duyệt giữ đúng checksum | [verification.json](../reports/completion/verification.json) |
| Cổng ML | Chưa cho train: 0 ảnh train/val có nhãn verified; chưa có split chính thức và baseline người xác nhận | [readiness.json](../reports/completion/ml-readiness/readiness.json) |

TypeScript, build production và `git diff --check` đạt. Build dùng `--no-lint`, không coi đây là kết quả ESLint. CI đã được cập nhật để chạy acceptance trên tài khoản tạm; chưa có lần chạy CI từ xa trong đợt sửa này. Không gọi API AI trả phí hoặc chạy lại test ML đóng băng.

Browser QA kiểm tra đăng nhập/đăng xuất, truy cập chéo gia đình, consent, lưu ảnh, sửa nhãn, unknown thu hồi dữ kiện, 3D không suy phép đo, analytics/report không thay null bằng 70, JSON không bịa thông tin người được khảo sát, xóa/tải lại và giao diện mobile. Detector là fixture hợp đồng; các số kiểm thử không phải độ chính xác AI hoặc benchmark ONNX.

## File chính theo task

- T1: [vitest.config.ts](../vitest.config.ts), [globalSetup.ts](../tests/globalSetup.ts).
- T2: [photoSceneDraft.ts](../src/lib/vision/photoSceneDraft.ts), [useSimulationStore.ts](../src/stores/useSimulationStore.ts), các trang AI Vision, analytics, workflow và reports; [photoSceneDraft.test.ts](../tests/photoSceneDraft.test.ts).
- T3: [API upload](../src/app/api/vision/images/route.ts), [visionPersistence.ts](../src/lib/vision/visionPersistence.ts), [imageMetadata.ts](../src/lib/vision/imageMetadata.ts), [imageUploadFailure.test.ts](../tests/imageUploadFailure.test.ts).
- T4: [deleteVisionImage.ts](../src/lib/vision/deleteVisionImage.ts), [visionState.test.ts](../tests/visionState.test.ts).
- T5: [accounts.ts](../src/lib/auth/accounts.ts), [withAccount.ts](../src/lib/auth/withAccount.ts), [scope.ts](../src/lib/database/scope.ts), [middleware.ts](../src/middleware.ts), [AccountShell.tsx](../src/components/layout/AccountShell.tsx), [accountIsolation.test.ts](../tests/accountIsolation.test.ts). Có 52 file route nghiệp vụ được bảo vệ; các endpoint xác thực kiểm tra đầu vào/Origin riêng.
- T7: [archive.cjs](../scripts/accounts/archive.cjs), [browser.cjs](../scripts/completion/browser.cjs), [http-smoke.cjs](../scripts/completion/http-smoke.cjs), [verify.py](../scripts/completion/verify.py), [CI](../.github/workflows/ci.yml).

Một file lịch sử `imageRiskAssessment.ts` từng được Git chuyển CRLF thành LF. Chỉ khôi phục xuống dòng khi SHA-256 của kết quả khớp chính xác bản đóng băng; `.gitattributes` giữ CRLF cho file đó trên các hệ điều hành. Không sửa logic, recipe, test ML hoặc ngưỡng y khoa để làm cho kiểm tra vượt qua.

## Giới hạn và việc cần người thực hiện

T1–T5 và T7 đạt trong phạm vi trên. T6 đã có công cụ, kiểm tra cổng và báo cáo thiếu dữ liệu; **chưa hoàn thành đánh giá chất lượng ML/fine-tune**. Cần người duyệt cảnh và bbox/nhãn nguy cơ, bổ sung nhà Việt Nam và nguy cơ HIGH cùng số đo thực địa. Unknown/unlabeled không phải nhãn âm. Chỉ chạy benchmark chính thức và xem xét fine-tune sau khi đủ nhãn, chia nhóm và khóa tập đánh giá.

Mỗi tài khoản hiện là một gia đình, không có cơ chế mời thành viên. Bản này dùng một Node server với volume bền vững; chưa kiểm thử tải, chưa có email verification, khôi phục mật khẩu qua email hoặc MFA. Cách cấu hình HTTPS, volume, khởi động, sao lưu và khôi phục nằm trong [ACCOUNTS_OPERATIONS.md](ACCOUNTS_OPERATIONS.md).

Người dùng cần tự tạo tài khoản/mật khẩu của mình qua `/sign-in`. Dữ liệu `dev.db` cũ vẫn giữ nguyên và chưa được nhận vào tài khoản nào vì chưa có thông tin chủ sở hữu. Không còn quyết định kiến trúc đang chờ: phạm vi nhiều tài khoản đã được người dùng chọn.
