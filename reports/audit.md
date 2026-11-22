# Audit dữ liệu — Giai đoạn 1

Thời điểm UTC: 2026-11-22T01:07:33.228312+00:00

Manifest SHA-256: `750ba47724261bd8cbb3b633c60032ea670d1d1709c9ca35db8bf0621d52c4ce`. Pillow `13.0.0`. Cấu hình: cạnh ngắn <384px, khoảng cách dHash ≤4.

## Kết quả chạy thật

| Chỉ số audit | Số lượng |
| --- | --- |
| images | 500 |
| decoded_ok | 500 |
| corrupt_or_missing | 0 |
| sha256_mismatches | 0 |
| dhash_mismatches | 31 |
| dimension_mismatches | 0 |
| small_images | 0 |
| possible_line_drawings | 1 |
| possible_sensitive_metadata | 1 |
| images_with_exif | 0 |
| exact_duplicate_groups | 0 |
| near_duplicate_pairs | 0 |
| near_duplicate_groups | 0 |
| license_metadata_needs_review | 106 |
| suggested_review | 179 |
| unlisted_files | 0 |
| width_min | 500 |
| width_max | 1280 |
| height_min | 390 |
| height_max | 1280 |

Các số trên là kiểm tra dữ liệu/heuristic, không phải precision/recall. Chất lượng ML: **chưa đánh giá được**.

## Phân bố metadata

### room

| room | Số ảnh |
| --- | --- |
| bedroom | 175 |
| bathroom | 175 |
| hallway | 150 |

### category_discovered

| category_discovered | Số ảnh |
| --- | --- |
| Category:Corridors | 80 |
| Category:Bathrooms | 47 |
| Search: bedroom interior | 46 |
| Search: bathroom interior | 40 |
| Search: bedroom house | 36 |
| Category:Bedrooms in art | 31 |
| Search: bathroom sink shower | 31 |
| Search: bathroom home | 30 |
| Search: bedroom bed nightstand | 28 |
| Category:Bedrooms | 23 |
| Category:Colonnades | 17 |
| Category:Abandoned corridors | 17 |
| Category:Corridor coaches | 16 |
| Category:Hospital corridors | 10 |
| Category:People in bedrooms | 4 |
| Category:Accessible bathrooms | 4 |
| Category:Bathrooms in art | 4 |
| Category:Bathrooms on ships | 4 |
| Category:Bathroom doors | 4 |
| Category:Bathrooms in residential buildings | 3 |
| Category:Duravit | 3 |
| Category:Connecting corridors | 3 |
| Category:Bathroom cleaning | 2 |
| Category:Bathrooms in showflats | 2 |
| Category:Exterior corridors | 2 |
| Category:Castle corridors | 2 |
| Category:Bedrooms with bathroom | 1 |
| Category:Bedrooms in residential buildings | 1 |
| Category:Bedrooms in showflats | 1 |
| Category:Blue Room of Longfellow House | 1 |
| Category:Bedroom furniture | 1 |
| Category:Derelict bedrooms | 1 |
| Category:Bedrooms at night | 1 |
| Category:Bathroom advertisements | 1 |
| Category:People in corridors | 1 |
| Category:Corridor ceilings | 1 |
| Category:Curved corridors | 1 |

### license_short

| license_short | Số ảnh |
| --- | --- |
| CC BY-SA 4.0 | 157 |
| Public domain | 101 |
| CC BY-SA 3.0 | 67 |
| CC BY-SA 2.0 | 66 |
| CC BY 2.0 | 45 |
| CC0 | 27 |
| CC BY 4.0 | 21 |
| CC BY 3.0 | 11 |
| CC BY-SA 2.5 | 2 |
| CC BY-SA 3.0 de | 2 |
| CC BY 2.5 | 1 |

### dataset_split

| dataset_split | Số ảnh |
| --- | --- |
| evaluation | 500 |

### human_scene_verified

| human_scene_verified | Số ảnh |
| --- | --- |
| (trống/unknown) | 500 |

### human_risk_verified

| human_risk_verified | Số ảnh |
| --- | --- |
| (trống/unknown) | 500 |

## Nhãn và duyệt thủ công

```json
{
  "risk_annotations_TEMPLATE.csv": {
    "rows": 4000,
    "review_status": {
      "unlabeled": 4000
    },
    "risk_present_raw": {
      "": 4000
    },
    "verified_binary_rows": 0
  },
  "object_annotations_TEMPLATE.csv": {
    "rows": 0,
    "review_status": {}
  }
}
```

Unlabeled/ô trống vẫn là unknown. Không train, không đánh giá và không chia tập ở giai đoạn này.

## Thiếu ảnh theo phòng

| Phòng | Mục tiêu | Chưa duyệt | Giữ | Loại | Cần thay | Ứng viên đủ metadata | Thiếu đã xác nhận | Tối thiểu cần bù do quyết định |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bedroom | 175 | 175 | 0 | 0 | 0 | 0 | 175 | 0 |
| bathroom | 175 | 175 | 0 | 0 | 0 | 0 | 175 | 0 |
| hallway | 150 | 150 | 0 | 0 | 0 | 0 | 150 | 0 |

Thiếu đã xác nhận = mục tiêu − số ảnh đã Giữ và qua kiểm tra file/hash/license metadata. Khi chưa duyệt hết, đây không phải số ảnh phải thu thập mới. Tối thiểu cần bù do quyết định giả sử mọi ảnh còn chờ đều được giữ; chưa tính các vướng mắc giấy phép.

| Phòng | Đề xuất xem trước | Ước tính thiếu nếu loại mọi đề xuất |
| --- | --- | --- |
| bedroom | 69 | 69 |
| bathroom | 36 | 36 |
| hallway | 74 | 74 |

Bảng ước tính chỉ là kịch bản tiền lọc, chưa có người quyết định loại; nhiều ảnh bị gắn cờ chỉ vì thiếu URL giấy phép.

## Trùng và độ toàn vẹn

Trùng SHA-256 tính lại: 0 nhóm; SHA-256 manifest: 0 nhóm; dHash manifest trùng hẳn: 0 nhóm.

dHash tính lại dùng công thức được lưu trong audit.json; khác dHash manifest có thể do quy ước resize/so sánh khác nhau, không tự kết luận ảnh đã đổi. SHA-256 là kiểm tra byte gốc. Near-duplicate là ứng viên cần xem, không tự xóa/gộp và chưa phải nhóm split Giai đoạn 2.

Chi tiết từng ảnh, lỗi, hash và các cặp gần trùng nằm trong `data/review/audit.json` và `audit_images.csv` (được Git ignore).

## Cách tiền lọc và giới hạn

- So khớp category chứa art/colonnade/coach/ship; từ khóa ngữ cảnh về bệnh viện, hầm, bỏ hoang, bảo tàng, ngoài trời, nhà mẫu. So khớp chuỗi có thể báo nhầm.
- Ảnh nhỏ: cạnh ngắn dưới ngưỡng cấu hình. Nghi tranh nét đen trắng: nền trắng >60%, vùng tối 1–28%, trung gian <25%, tỷ lệ pixel có chênh màu >20 dưới 3%, tính trên ảnh thu nhỏ 128×128.
- Nghi nhạy cảm chỉ dựa từ khóa metadata; không phải bộ phân loại nội dung. Ảnh art/nghi nhạy cảm được che ban đầu trong UI, người duyệt bấm để xem.
- Chưa dùng Gemini/CLIP; chưa có kết luận tự động về người trong ảnh, cảnh nhà ở hoặc nội dung nhạy cảm từ pixel. Mọi ảnh đều cần con người duyệt.
- License gate chỉ kiểm metadata: tên CC đã biết khớp URL Creative Commons và author; thiếu/không khớp chờ xác minh, không vào ứng viên cuối. Public domain không có URL cũng bị giữ lại để kiểm tra, không tự đoán quyền.
- Metadata complete chưa phải phê duyệt pháp lý. Người duyệt cần kiểm trang nguồn, giấy phép, attribution và quyền riêng tư trước khi phân phối.

## Bổ sung dữ liệu

Xem `docs/ML_DATA_REVIEW.md`: hướng dẫn chạy UI, xuất working manifest và bổ sung ảnh. Khi thay đổi quyết định, chạy lại audit để cập nhật báo cáo này; UI và shortfalls.json cập nhật ngay khi lưu.

Giữ nguyên manifest/ảnh/nhãn raw; không đề xuất xóa file. **Dừng chờ người dùng duyệt cảnh.**
