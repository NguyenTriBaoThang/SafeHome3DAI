# Giai đoạn 3 — baseline Gemini hiện tại

Ngày: 22/11/2026 (Asia/Saigon). **Đã xây dựng công cụ đánh giá; chưa có baseline thực nghiệm vì thiếu dữ liệu được người dùng duyệt.** Không train, điều chỉnh prompt/hyperparameter hoặc chuyển Giai đoạn 4.

## 1. Đã làm gì

- Xây dựng `scripts/ml/eval_baseline.py` chạy Gemini room adapter hiện có, rồi gọi cùng hàm risk mà trang `/ai-vision` dùng. Không lấy tiền gán Giai đoạn 2 làm dự đoán baseline hoặc ground truth.
- Tách nguyên hàm `computeImageRiskAssessment` từ page sang module dùng chung. Thân hàm giữ nguyên; page import lại module. Không đổi ngưỡng, điều kiện của tám rule hoặc sửa các default để nâng điểm baseline.
- Nhập Label Studio JSON chỉ khi có annotation của người dùng, tên người duyệt, ID/thời gian annotation và xác nhận kiểm tra/sửa nhãn. Không dùng `predictions`, cờ `ground_truth` hoặc chuỗi `verified` tự khai làm bằng chứng duyệt.
- Bổ sung fingerprint snapshot/checksum ảnh vào task export và lựa chọn nguồn bằng chứng từng risk. Risk đòi hỏi đo/khảo sát phải giữ unknown nếu người duyệt chỉ có ảnh đơn. Các task cũ cần export lại theo cấu hình mới nếu thiếu trường này.
- Object detection: AP50 tại IoU 0.5, mAP trên lớp có GT dương, precision/recall từng lớp, số object/ảnh dương và CI.
- Risk: precision, recall, F1 từng RISK-001..008, số mẫu dương/âm, coverage, recall riêng cho mẫu HIGH; bỏ GT unknown/nonapplicable. Dự đoán unknown/lỗi không thành nhãn âm; ghi riêng abstention và tính bỏ sót dương trong recall.
- CI 95% percentile bootstrap theo **nhóm nguồn/căn nhà**, seed mặc định 20261122, 1.000 vòng. Cảnh báo lớp <20 mẫu dương, không biến mẫu số không xác định thành metric 0.
- Cache dự đoán gắn code/model/snapshot/nhãn, khóa cấu hình test, confusion và gallery ảnh local có khung GT/dự đoán. Fallback hoặc lỗi inference không được tính là AI thật; không loại ảnh lỗi ra để làm đẹp điểm.

## 2. File đã tạo/sửa

| File | Vai trò |
|---|---|
| [`scripts/ml/eval_baseline.py`](../scripts/ml/eval_baseline.py) | Điều kiện đầu vào, gọi pipeline, cache, khóa test, log và chạy metric theo val/test riêng. |
| [`baseline_bridge.cjs`](../scripts/ml/baseline_bridge.cjs) | Chạy đúng mã TypeScript repo qua TypeScript có sẵn; chặn nguồn fallback, không cần SDK/model mới. |
| [`baseline_metrics.py`](../scripts/ml/baseline_metrics.py) | IoU/AP50/precision/recall, tri-state risk, HIGH recall và bootstrap nhóm. |
| [`baseline_report.py`](../scripts/ml/baseline_report.py) | Markdown/JSON, confusion CSV và SVG overlay trên ảnh local trong HTML. |
| [`import_verified.py`](../scripts/ml/import_verified.py) | Nhập và kiểm lại annotation của con người, giữ source export/checksum và bundle riêng. |
| [`src/lib/vision/imageRiskAssessment.ts`](../src/lib/vision/imageRiskAssessment.ts), [`page.tsx`](../src/app/ai-vision/page.tsx) | Dùng chung nguyên hàm risk thay vì sao chép logic baseline. |
| [`annotation_contract.py`](../scripts/ml/annotation_contract.py), [`export_annotations.py`](../scripts/ml/export_annotations.py), [`annotation/`](../scripts/ml/annotation/) | Task provenance, lựa chọn nguồn bằng chứng và XML/guide sinh lại. |
| [`docs/ANNOTATION_GUIDE.md`](ANNOTATION_GUIDE.md) | Quy tắc nguồn đo/khảo sát cho nhãn binary của risk không đo được từ ảnh. |
| [`test_baseline.py`](../scripts/ml/test_baseline.py), [`test_baseline_bridge.cjs`](../scripts/ml/test_baseline_bridge.cjs) | Metric có đáp án tính trước, pipeline thật với network giả, quy trình human verification/cache/test lock. |
| [`reports/baseline.md`](../reports/baseline.md), [`baseline.json`](../reports/baseline.json) | Kết quả readiness thật hiện tại: blocked / chưa đánh giá được. |
| [`baseline_confusion.csv`](../reports/baseline_confusion.csv), [`baseline_errors.html`](../reports/baseline_errors.html) | Chưa có dữ liệu đánh giá: CSV chỉ header, HTML trạng thái trống; không có ví dụ sai giả. |
| [`reports/stage3_verification.json`](../reports/stage3_verification.json) | Kết quả kiểm thử và bảo toàn dữ liệu sau triển khai. |

Không thêm thư viện, không sửa API key/.env, Prisma, file luật rủi ro hoặc ảnh/manifest/nhãn raw. Không commit ảnh hoặc model.

## 3. Kết quả số liệu thật

Lệnh `eval_baseline.py` đã chạy trên trạng thái dataset thật và in log:

- 500 ảnh raw, cả 500 còn chờ duyệt; 0 ảnh scene-verified đủ điều kiện.
- Chưa có `data/processed/stage2/frozen/snapshot.json`.
- Chưa có bundle nhãn human-verified; 4.000 dòng risk template vẫn `unlabeled`, object template vẫn 0 dòng.
- Gemini inference gọi 0 lần. Không tạo train/val/test hoặc suy luận trên ảnh chưa duyệt.
- **mAP@0.5, precision, recall, F1, HIGH recall và CI: chưa đánh giá được.** Không có dữ liệu để kết luận nguy cơ nào Gemini yếu.

Kiểm thử dùng ảnh/nhãn **synthetic trong thư mục tạm**, xác nhận người duyệt **giả lập**, network/client giả; không ghi quyết định hoặc nhãn vào 500 ảnh người dùng. Các số precision/AP trong test chỉ là đáp án kiểm tra công thức, không phải kết quả Gemini. Kết quả số test và typecheck sau lần chạy cuối nằm trong `reports/stage3_verification.json`.

## 4. Rủi ro, quy ước và giới hạn

### Ground truth và unknown

Chỉ chấp nhận nhãn thuộc snapshot đóng băng và ảnh checksum đúng, scene được Keep. Mỗi split phải có nhãn verified đủ cho **mọi ảnh trong split đó** trước khi inference; không chọn riêng ảnh có kết quả thuận lợi. Import nhiều annotation hoàn tất cho cùng task bị chặn để yêu cầu phân xử, không tự chọn annotation cuối hoặc gộp nhãn bất đồng.

Người dùng phải xem toàn bộ vùng ảnh và xác nhận nhãn; khi không có vật sau rà soát thì danh sách object rỗng mới có thể là GT âm. Task chưa annotate, prediction rỗng hoặc file template rỗng không phải mẫu âm. Không thay raw `human_risk_verified`; bundle riêng chỉ chứa nhãn đã qua kiểm tra provenance.

RISK-003/004/005/007/008 chỉ nhận 1/0 khi người duyệt chọn nguồn `Đo/khảo sát thực tế`, có evidence ghi nguồn, đơn vị, người đo/ngày. Công cụ kiểm lựa chọn và ghi chú, không xác minh được ngoài đời rằng số đo là đúng; vẫn cần người duyệt chịu trách nhiệm về bằng chứng. Không áp dụng được lưu applicable=false/present=unknown, không tính như âm tính.

### Metric

AP50 triển khai 101 điểm recall nội suy, maxDets 100 mỗi ảnh/lớp, bbox all-area không crowd/ignore; đây không phải toàn bộ pycocotools/COCO evaluation nhiều IoU/area. Đã đối chiếu quy ước từ [COCOeval chính thức](https://github.com/cocodataset/cocoapi/blob/master/PythonAPI/pycocotools/cocoeval.py), không thêm dependency. Lớp không có GT dương có AP undefined và không được đưa vào mAP; vẫn báo FP/precision khi có prediction.

Risk recall = TP / toàn bộ GT dương binary hợp lệ. Dự đoán unknown trên GT dương là bỏ sót cho recall, nhưng vẫn nằm ở cột abstain_positive chứ không bị đổi thành 0. Precision chỉ tính dự đoán dương; F1 = 2TP/(2TP+FP+FN+abstain_positive). GT unknown luôn bị loại khỏi mẫu số. HIGH recall chỉ xét GT dương severity HIGH. Confusion có TN/FP/FN/TP và hai cột abstention để không che sự không xác định.

Bootstrap lấy lại toàn bộ nhóm để giữ tương quan nguồn/nhà; CI có số replicate hữu hạn hợp lệ riêng cho từng metric. Ít hơn hai nhóm thì không công bố CI. Mẫu dương ít hoặc support không đủ chỉ cho kết quả thăm dò; không coi CI điểm hoặc test pass là chứng cứ lâm sàng.

### Đặc tính pipeline hiện tại

Hàm risk UI chỉ hỗ trợ BEDROOM/BATHROOM. Với hallway, detector Gemini vẫn được gọi nhưng risk là unsupported/unknown, không ép ảnh hành lang thành bedroom. Khi có GT binary, phần abstention sẽ phản ánh trong coverage/recall.

Gemini adapter hiện chưa có response schema đầy đủ, timeout 3.5 giây và clamp confidence 0.5–0.99. Baseline giữ nguyên các hành vi này; không thêm prompt/temperature mới của Giai đoạn 2. Lỗi/timeout/fallback được ghi riêng. Nếu không có output AI thật thì object GT được tính là miss, risk là abstention; báo cáo incomplete chứ không bỏ ảnh lỗi khỏi benchmark.

Risk helper/normalization hiện dùng nhiều default về ánh sáng, sàn, độ chênh, tầm với và có thể bỏ qua các trường nested ở đường normalize object tối thiểu. Đây là hạn chế cấu trúc có thể tạo kết luận không được ảnh chứng minh, chưa phải kết luận empirical rằng một risk cụ thể có recall/precision thấp. Không sửa logic/ngưỡng trong giai đoạn này để làm đẹp baseline.

Chưa chạy API/model trên tài khoản và chưa kiểm thử import qua server Label Studio thật. Loader dùng TypeScript đã có trong devDependencies, không cần thư viện hoặc model mới. Không có suy luận train/eval trên ảnh chưa được con người duyệt.

## 5. Việc người dùng cần làm thủ công và cách chạy

### Hoàn tất các điều kiện trước đánh giá

1. Duyệt cảnh tại **http://127.0.0.1:8765**, kiểm nhóm nguồn/căn nhà và xử lý ảnh/license chưa phù hợp. Xem [hướng dẫn duyệt](ML_DATA_REVIEW.md).
2. Hoàn tất Giai đoạn 2: snapshot group train/val/test đóng băng, export tasks mới và gán/sửa nhãn theo [ANNOTATION_GUIDE.md](ANNOTATION_GUIDE.md). Test nên gán mù độc lập, không dùng kết quả để chỉnh prompt hoặc ngưỡng.
3. Với từng nguy cơ trong Label Studio, chọn nguồn bằng chứng; điền người duyệt và xác nhận đã kiểm/sửa nhãn. Export **JSON đầy đủ có data + annotations**, giữ file gốc ở `data/annotations/`, không dùng COCO/predictions chưa duyệt làm GT risk. Hướng dẫn định dạng: [Label Studio export](https://labelstud.io/guide/export).

### Nhập nhãn đã duyệt

Ví dụ sau khi đã lưu file export thật tại đường dẫn này:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/import_verified.py 'data/annotations/label_studio_human.json'
```

Tạo `data/annotations/verified/bundle.json` riêng và in số ảnh verified. Giữ nguyên file source export: mỗi lần đánh giá sẽ kiểm hash và parse lại xác nhận của người duyệt. Nếu có annotation bị hủy, thiếu xác nhận, chưa chọn nguồn bằng chứng, lệch snapshot/ảnh hoặc nhiều annotation bất đồng, script chặn; sửa trong công cụ gán nhãn rồi export lại, không tự điền verified trong JSON.

### Chạy baseline

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/eval_baseline.py --dry-run
```

Cung cấp `GEMINI_MODEL` và `GEMINI_API_KEY` qua môi trường tiến trình, không đặt key vào command history hoặc Git. Khi các điều kiện đã đạt:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/eval_baseline.py --split val
.\.venv-ml\Scripts\python.exe scripts/ml/eval_baseline.py --split test
```

Hoặc `--split both` để báo cáo hai tập trong cùng file, vẫn tính metric riêng. Mặc định chỉ val. Tham số thống kê: `--bootstrap 1000 --seed 20261122 --confidence-threshold 0.5`. Không chỉnh threshold/model/code dựa trên test.

Khi chạm test lần đầu, `baseline_test_lock.json` khóa model/code/threshold/snapshot/GT. Chạy lại cùng cấu hình dùng cache; thay cấu hình bị từ chối. Không xóa snapshot/lock để thử cấu hình khác. Dự đoán cache nằm trong `data/processed/stage3/predictions/<run_id>/`, có checksum chống thay đổi nhầm.

API lỗi được cache và báo incomplete. Có thể dùng `--retry-errors` để thử lại chỉ các call thất bại với cùng cấu hình đã khóa; không đổi model/prompt để xử lý test. Kết quả thành công không bị gọi lại.

Khi chưa đủ dữ liệu, exit code 2 và `status=blocked` là trạng thái dự kiến; `baseline.md` ghi rõ chưa đánh giá được. Nếu completed/incomplete, xem bảng từng lớp/risk, warning support <20, CI và `baseline_errors.html` để so ảnh/khung/nhãn. File HTML tham chiếu ảnh local, không copy ảnh ra Git hoặc upload.

### Kiểm thử công cụ

```powershell
.\.venv-ml\Scripts\python.exe -m unittest discover -s scripts/ml -p 'test_*.py' -v
node --test scripts/ml/test_baseline_bridge.cjs scripts/ml/test_gemini_bridge.cjs
node node_modules/vitest/vitest.mjs run --config vitest.experience.config.ts tests/visionEngine.test.ts tests/visionIntegration.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

Vitest dùng config không chạy DB setup. Không chạy test live Gemini với ảnh chưa được duyệt.

## 6. Quyết định còn chờ

Chưa cần quyết định model/fine-tune hoặc chọn cải tiến khi không có metric thật. Cần người dùng hoàn tất duyệt cảnh, gán/sửa/xác nhận nhãn và cung cấp export hợp lệ. Sau đó mới chạy baseline thật và rút kết luận nguy cơ yếu; **dừng, chưa chuyển Giai đoạn 4**.
