# Báo cáo Giai đoạn 1 — audit và công cụ duyệt cảnh

Ngày: 22/11/2026, Asia/Saigon. Hoàn tất phần triển khai; **dừng chờ người dùng duyệt ảnh**, chưa chuyển Giai đoạn 2.

## 1. Đã làm gì

- Thêm `data/`, `models/`, môi trường Python và cache Python vào Git ignore trước khi giải nén.
- Nhập bộ ZIP an toàn vào `data/raw/`, từ chối ghi đè bản nguồn; đối chiếu byte của toàn bộ file với ZIP sau triển khai.
- Audit giải mã ảnh, kích thước, EXIF, SHA-256/dHash, trùng/gần trùng, room/category/license, tình trạng nhãn; sinh attribution từ manifest.
- Tiền lọc bằng metadata và đặc trưng ảnh để đề xuất xem xét: art/colonnade/coach/ship, ngữ cảnh ngoài phạm vi nhà ở, ảnh nhỏ, nét đen trắng, dấu hiệu nhạy cảm và metadata giấy phép. Không xóa/loại tự động.
- Tạo giao diện local Giữ/Loại/Cần thay, ảnh có cảnh báo ở trước; lưu người duyệt, thời gian, ghi chú và lịch sử. Hỗ trợ bộ lọc, phím tắt, khôi phục tiến độ, xuất manifest và thống kê thiếu ảnh theo phòng.
- Không gọi Gemini, tải model, gán nhãn risk, chia tập, train hoặc thay đổi luật/ngưỡng y khoa.

## 2. File đã tạo/sửa

| File/nhóm | Mục đích |
|---|---|
| [`.gitignore`](../.gitignore) | Chặn dữ liệu/model/env Python/cache khỏi Git. |
| [`scripts/ml/import_dataset.py`](../scripts/ml/import_dataset.py) | Giải nén có kiểm tra traversal, symlink, tên trùng, giới hạn dung lượng; không overwrite raw. |
| [`scripts/ml/audit_dataset.py`](../scripts/ml/audit_dataset.py) | Audit, tiền lọc đề xuất, báo cáo và attribution. |
| [`scripts/ml/dataset_common.py`](../scripts/ml/dataset_common.py) | Đọc manifest, kiểm path/license metadata, ghi atomic, thống kê review và working manifest. |
| [`scripts/ml/review_dataset.py`](../scripts/ml/review_dataset.py), [`review_ui/`](../scripts/ml/review_ui/) | Server loopback và giao diện duyệt; quyết định chỉ lưu sau thao tác rõ ràng của người dùng. |
| [`scripts/ml/requirements.txt`](../scripts/ml/requirements.txt) | Pin Pillow 13.0.0; không thêm dependency Node/model. |
| [`scripts/ml/test_dataset.py`](../scripts/ml/test_dataset.py), [`verify_review_browser.cjs`](../scripts/ml/verify_review_browser.cjs) | Kiểm tra quy trình/sự toàn vẹn bằng fixture và smoke check trình duyệt chỉ đọc. |
| [`reports/audit.md`](../reports/audit.md) | Kết quả audit thật, thống kê, giới hạn và bảng thiếu ảnh. |
| [`reports/ml_stage1_verification.json`](../reports/ml_stage1_verification.json) | Đối chiếu ZIP/raw, cột manifest, attribution và số kiểm tra trình duyệt. |
| [`ATTRIBUTION.md`](../ATTRIBUTION.md) | 500 mục credit nguồn, giữ giá trị metadata và ghi rõ chỗ trống. |
| [`docs/ML_DATA_REVIEW.md`](ML_DATA_REVIEW.md), báo cáo này | Hướng dẫn duyệt, chạy lại, sao lưu, bổ sung ảnh và kết quả giai đoạn. |
| `data/raw/`, `data/review/`, `.venv-ml/` | Artifact local được ignore; không commit ảnh, quyết định hoặc môi trường. |

`docs/ML_STATE.md` của Giai đoạn 0 được giữ nguyên. Không sửa mã app, Prisma, package-lock, README hoặc file luật.

## 3. Kết quả số liệu thật

| Chỉ số | Kết quả |
|---|---|
| Manifest/ảnh | 500; bedroom 175, bathroom 175, hallway 150 |
| Giải mã thành công | 500/500 |
| Ảnh lỗi/thiếu, sai SHA-256, sai kích thước, EXIF còn sót | Đều 0 |
| Ảnh cạnh ngắn <384 px | 0 |
| Dải chiều rộng / chiều cao | 500–1280 px / 390–1280 px |
| Nhóm trùng SHA-256 / cặp gần trùng dHash ≤4 | 0 / 0 |
| dHash tính lại khác manifest | 31; SHA-256 vẫn khớp |
| Đề xuất xem trước | 179: bedroom 69, bathroom 36, hallway 74 |
| Nghi bản vẽ nét đen trắng / nhạy cảm qua metadata | 1 / 1; không phải xác nhận nội dung |
| Metadata giấy phép cần xem xét | 106: 101 Public domain không có URL; 5 ảnh CC thiếu author |
| Nhãn risk | 4.000 dòng `unlabeled`, risk_present trống; không đổi thành 0 |
| Nhãn object | 0 dòng |
| human_scene_verified / human_risk_verified nguồn | 500/500 ô trống ở mỗi cột |
| dataset_split | 500 ảnh vẫn là `evaluation` |
| Attribution | 500 mục sinh từ manifest |
| Bảo toàn raw | 506/506 tệp khớp byte với ZIP; mọi cột nguồn ở working manifest ban đầu khớp bản raw |
| Kiểm thử Python | 12/12 đạt, hoàn toàn dùng fixture tạm |
| Kiểm tra browser | 7/7 đạt ở desktop 1440 px và mobile 390 px; 0 exception, 0 HTTP resource lỗi |
| Quyết định duyệt trên dữ liệu thật sau QA | 0; 500 ảnh vẫn chờ người dùng |

Những con số này được chạy và in log thật trong phiên triển khai. Log browser và ảnh chụp UI ở `data/review/qa/`; log server ở `data/review/server*.log` (local/ignored). Kiểm tra cú pháp JavaScript và whitespace cũng đạt.

**Chất lượng ML — mAP, precision, recall, F1: chưa đánh giá được.** Không chạy suy luận/benchmark trên ảnh chưa duyệt.

Hiện chưa có ảnh bị người dùng loại, nên chưa có con số thu thập bù cuối cùng. Số ảnh đã được xác nhận đủ điều kiện hiện là 0/175, 0/175, 0/150; đó là tiến độ chưa duyệt, không có nghĩa cần thu thập mới 500 ảnh. Tối thiểu phải bù theo các quyết định đã có hiện là 0 ở cả ba phòng. Kịch bản loại mọi đề xuất tương ứng thiếu 69/36/74, chỉ là ước tính tiền lọc và có cả ảnh chỉ vướng metadata giấy phép.

## 4. Rủi ro/giả định

- Tiền lọc có thể báo nhầm hoặc bỏ sót, nhất là nội dung nhạy cảm, người trong ảnh và cảnh không phải nhà ở. Toàn bộ 500 ảnh đều cần xem; không chỉ duyệt 179 ảnh có cảnh báo.
- 31 dHash khác không chứng minh ảnh bị sửa: SHA-256 khớp byte gốc. Công thức hash được ghi trong audit.json; khác quy ước/ảnh dùng lúc tạo hash là các khả năng chưa xác nhận. Không dùng kết quả này để tự xóa/gộp ảnh.
- License gate kiểm sự đầy đủ/khớp metadata, không xác nhận quyền pháp lý từng ảnh. Public domain thiếu URL được giữ lại để kiểm chứng, không tự coi không hợp lệ hoặc tự bổ sung URL. Ảnh có license chưa rõ không vào ứng viên đủ điều kiện.
- Bấm Giữ xác nhận cảnh, chưa xác nhận nhãn object/risk hoặc giấy phép. Unknown ở các nhãn nguy cơ vẫn giữ nguyên. Working manifest dùng `true/false/ô trống`; lọc phải so sánh giá trị chính xác, không dùng truthiness chuỗi.
- Dữ liệu raw được coi là bản nguồn bất biến; công cụ kiểm fingerprint manifest, và kiểm lại SHA ảnh khi bấm Giữ. Trước các giai đoạn tiếp theo cần chạy audit lại nếu có thay đổi file. Chưa có pipeline train/test.
- Quyết định nằm trong `data/review/decisions.json`, working CSV là file sinh lại được. Chạy một review server cho một thư mục; sao lưu dữ liệu review ngoài Git. Xuất lại có thể khôi phục file dẫn xuất nếu bị gián đoạn ghi.
- Dependency mới là Pillow 13.0.0, lõi [MIT-CMU](https://github.com/python-pillow/Pillow/blob/13.0.0/LICENSE), có điều kiện giữ notice; thông báo codec nằm trong wheel. Không đề xuất/cài model cần rà soát giấy phép riêng ở bước này.

## 5. Người dùng cần làm thủ công

1. Mở **http://127.0.0.1:8765**, nhập tên và xem từng ảnh, chọn Giữ/Loại/Cần thay; ghi lý do cho ảnh cần loại/thay. Nếu server đã dừng, chạy lệnh trong [hướng dẫn](ML_DATA_REVIEW.md).
2. Kiểm tra trang nguồn, author/attribution và điều kiện sử dụng; đặc biệt 106 ảnh đang thiếu metadata. Ghi bằng chứng sửa metadata riêng theo image_id, giữ nguyên raw. Công cụ này chưa có UI phê duyệt sửa license.
3. Xem `shortfalls.json` hoặc bảng trong UI để biết số tối thiểu cần bù theo quyết định. Sau khi duyệt, chạy lại audit để cập nhật báo cáo tổng hợp.
4. Bổ sung ảnh từ Wikimedia/Openverse sau khi kiểm quyền ở nguồn, hoặc ảnh tự chụp có đồng ý; ưu tiên nhà ở Việt Nam. Lưu ảnh bổ sung riêng, ID mới, chưa ghi đè raw. Chi tiết quy trình trong hướng dẫn.

## 6. Quyết định còn chờ

Không cần quyết định kỹ thuật nào để bắt đầu duyệt. Chờ người dùng hoàn thành/cho ý kiến về duyệt cảnh trước khi tiếp tục. Trước Giai đoạn 2 vẫn cần chốt taxonomy 16 lớp hiện có hay định nghĩa hai lớp mới để đạt 18; chưa tự thêm lớp.

**Dừng tại Giai đoạn 1 theo yêu cầu.**
