# B03 — Runbook gán nhãn (cho người gán 1 và người gán 2)

Đọc trước: `B03_ANNOTATION_GUIDELINE.md`. Lệnh chạy từ gốc repo. Chỉ cần Python 3 (stdlib).

## Nơi lưu file (tất cả trong `.private/`, bị gitignore)

```
.private/b03/images/            ảnh (đã xóa EXIF, đã kiểm không có người/giấy tờ — theo B02)
.private/b03/manifest.csv       header = data_schemas/manifest_template.csv (12 cột, có sha256)
.private/b03/labels_<ID>.json   nhãn của MỖI người (annotator_id riêng, ví dụ B_MEMBER, PERSON_A)
.private/b03/disagreements.csv  danh sách bất đồng + cột final_state, resolution_note
.private/b03/hazard_ground_truth.json   nhãn tham chiếu cuối
.private/b03/predictions_<provider>.json   dự đoán provider (chỉ dùng ở bước 6)
```

`sha256` điền bằng `shasum -a 256 <ảnh>`. `approved_for_third_party` điền `yes`/`no` (script cũng nhận `true`/`false` theo B02). `split` luôn là `test`.

## Các bước

1. **Kiểm manifest:** `python3 scripts/ml/b03_labels.py validate --manifest .private/b03/manifest.csv`
2. **Gán độc lập** (mỗi người một máy/một file, không trao đổi, không xem nhãn nhau, **không xem dự đoán AI**). Mẫu bản ghi: `data_schemas/fixture_synthetic_b03/annotator_FAKE_A1.json`; schema: `data_schemas/hazard_labels.schema.json`. Chỉ ghi các RISK áp dụng cho phòng.
3. **Kiểm nhãn:** `python3 scripts/ml/b03_labels.py validate --manifest .private/b03/manifest.csv --labels .private/b03/labels_B_MEMBER.json` (và file người 2). Sửa đến khi báo `OK`.
4. **Độ đồng thuận + bất đồng** (chỉ sau khi cả hai đã nộp):
   `python3 scripts/ml/b03_labels.py agreement --a1 .private/b03/labels_B_MEMBER.json --a2 .private/b03/labels_PERSON_A.json --out .private/b03/disagreements.csv --json-out .private/b03/agreement.json`
5. **Họp chốt:** điền `final_state` (present/absent/uncertain/not_assessable) và `resolution_note` cho mọi dòng trong `disagreements.csv`, rồi:
   `python3 scripts/ml/b03_labels.py finalize --a1 ... --a2 ... --resolutions .private/b03/disagreements.csv --out .private/b03/hazard_ground_truth.json`
   Kiểm: `... validate --final .private/b03/hazard_ground_truth.json`
6. **Chấm điểm provider** (sau khi nhãn tham chiếu đã khóa): `python3 scripts/ml/b03_labels.py score --reference .private/b03/hazard_ground_truth.json --predictions .private/b03/predictions_<provider>.json --json-out .private/b03/score_<provider>.json`
   Predictions: mảng `{"image_id", "hazards": {"RISK-00x": {"state": "present|absent|unknown"}}}`.
7. **Self-check công cụ:** `cd scripts/ml && python3 -m unittest -v test_b03_labels`

## Được commit và không được commit

| Được commit | KHÔNG commit |
| :--- | :--- |
| Mã script, schema, fixture `fixture_synthetic_*`, tài liệu | Ảnh, `.private/`, `manifest.csv` thật, `consent_id` thật |
| Chỉ số **tổng hợp, ẩn danh**: κ theo RISK, số ô theo loại, P/R/F1 + Wilson (kèm cờ "mẫu nhỏ, thăm dò"), không `image_id`/`household_id` thật | Nhãn thô từng ảnh, `disagreements.csv`, `hazard_ground_truth.json` thật (chứa `image_id`/hộ) |
| | `.env*`, `.remember/`, `*.docx` |

Trước khi commit số liệu: mở file, bảo đảm không còn `image_id`, `household_id`, đường dẫn ảnh hay evidence_note chứa chi tiết nhà. `--json-out` của `agreement` và `score` chỉ chứa số đếm/chỉ số theo RISK (không có id ảnh/hộ).

## Lưu ý

- Không đưa kết quả dưới dạng một "accuracy" duy nhất; báo từng RISK, kèm n.
- Gặp ảnh có người/khuôn mặt/giấy tờ: không gán, báo người giữ manifest xóa (B02).
- Đổi hướng dẫn = tăng `guideline_version` và gán lại ảnh bị ảnh hưởng.
