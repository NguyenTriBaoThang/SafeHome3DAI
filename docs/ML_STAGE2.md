# Giai đoạn 2 — chia tập theo nhóm và tiền gán nhãn

Ngày triển khai: 22/11/2026 (Asia/Saigon). **Đã xây dựng công cụ; xử lý bộ ảnh thật còn chờ duyệt cảnh.** Không coi Giai đoạn 2 trên dữ liệu thật là đã hoàn tất.

## 1. Đã làm gì

- Theo lựa chọn mở rộng 18 lớp và ủy quyền đặt tên của người dùng, thêm `lamp` (Đèn chiếu sáng) và `light_switch` (Công tắc đèn). Cập nhật domain type, taxonomy, chuẩn hóa nhãn và danh sách category trong Gemini room adapter. Không thay ngưỡng y khoa hoặc hàm đánh giá rủi ro.
- Xây dựng group graph trên toàn bộ raw bằng SHA-256, dHash manifest và dHash tính lại (Hamming ≤4), source_page đã chuẩn hóa, tác giả đã chuẩn hóa; có file nhóm căn nhà thủ công. Ảnh bị loại vẫn được dùng làm cầu nối metadata, tránh tách hai ảnh liên quan chỉ vì ảnh trung gian bị loại.
- Chia train/val/test mục tiêu 70/15/15, phân tầng room, seed 20261122. Giữ nguyên nhóm, báo tỷ lệ thực tế khi ràng buộc nhóm không cho tỷ lệ chính xác. Nếu không thể có ba tập đủ phòng thì chặn thay vì bẻ nhóm.
- Đóng băng snapshot, manifest riêng có `dataset_split` và `group_id`, fingerprint của raw/review/taxonomy/định nghĩa/registry/cấu hình. Không ghi đè raw hoặc working manifest duyệt cảnh. Không có chức năng tự chia lại tập test.
- Tiền gán bằng SDK `@google/genai` với JSON Schema, temperature mặc định 0.1 và seed; có chế độ chung hoặc tách tám nguy cơ thành tám câu hỏi. Kiểm tra JSON/bbox/unknown/applicability trước khi lưu, không có fallback bố cục mẫu và không biến lỗi thành âm tính.
- Export COCO bbox, Label Studio tasks/XML tiếng Việt và CSV nguy cơ. Tiền gán luôn `prelabeled`, không tạo `verified`; thiếu tiền gán tạo task thủ công với risk unknown, không thêm ảnh đó vào COCO như mẫu không có vật.
- Tạo [ANNOTATION_GUIDE.md](ANNOTATION_GUIDE.md) với định nghĩa đầy đủ 18 lớp, tám nguy cơ từ CSV, quy tắc unknown, khác biệt phạm vi CSV/registry và hướng dẫn duyệt.

## 2. File đã tạo/sửa

| File | Vai trò |
|---|---|
| [`src/lib/vision/types.ts`](../src/lib/vision/types.ts), [`taxonomy.ts`](../src/lib/vision/taxonomy.ts) | Hai lớp mới và chuẩn hóa nhãn cụ thể trước các tên nội thất rộng. |
| [`geminiVisionAdapter.ts`](../src/lib/vision/geminiVisionAdapter.ts) | Giữ hai lớp mới khi parse; prompt danh sách đủ 18 lớp và cảnh báo không suy lux/tầm với. |
| [`scripts/ml/stage2_common.py`](../scripts/ml/stage2_common.py) | Gates ảnh đã duyệt/license/checksum, snapshot, schema validation, tri-state. |
| [`split_dataset.py`](../scripts/ml/split_dataset.py) | Group graph, phân tầng, plan và đóng băng test. |
| [`annotation_contract.py`](../scripts/ml/annotation_contract.py), [`prepare_annotations.py`](../scripts/ml/prepare_annotations.py) | Sinh schema, taxonomy, XML và guide từ định nghĩa repo. |
| [`prelabel_dataset.py`](../scripts/ml/prelabel_dataset.py), [`gemini_prelabel.cjs`](../scripts/ml/gemini_prelabel.cjs) | Chạy/resume Gemini, log số call/lỗi, provenance, khóa cấu hình tiền gán test. |
| [`export_annotations.py`](../scripts/ml/export_annotations.py) | COCO theo split, tasks Label Studio và risk CSV; không xác nhận nhãn. |
| [`scripts/ml/annotation/`](../scripts/ml/annotation/) | response_schema.json, taxonomy.json, risk_definitions.json, label_studio.xml và template nhóm căn nhà. Không có ảnh/nhãn giả dữ liệu thật. |
| [`test_stage2.py`](../scripts/ml/test_stage2.py), [`test_gemini_bridge.cjs`](../scripts/ml/test_gemini_bridge.cjs), [`tests/visionEngine.test.ts`](../tests/visionEngine.test.ts) | Kiểm thử pipeline bằng fixture, SDK giả và taxonomy trong app. |
| [`reports/stage2_readiness.json`](../reports/stage2_readiness.json) | Kết quả kiểm tra độ sẵn sàng trên dữ liệu thật; không phải metric ML. |
| `data/processed/stage2/` | groups.csv, group_edges.json, split_plan.json; toàn bộ là artifact local đã Git ignore. Chưa có frozen split hoặc prelabels thật. |

Giữ nguyên các thay đổi Giai đoạn 0–1 chưa commit. Không thêm dependency Python/Node vào package files, không đọc/in API key, không sửa file `.env`, không cài Label Studio hay tải model.

## 3. Kết quả số liệu thật

Lần chạy chuẩn bị trên 500 ảnh thật tạo **366 nhóm ứng viên**, **134 liên kết nhóm** theo cấu hình trên. Đây là nhóm metadata, chưa phải xác nhận cùng/khác căn nhà.

Tại thời điểm kiểm tra: **500 ảnh pending, 0 quyết định Keep, 0 ảnh đủ điều kiện**, train/val/test chưa tạo, API Gemini gọi **0 lần**, ảnh tiền gán thật **0**, nhãn verified mới **0**. Cả script chia tập và dry-run tiền gán trả trạng thái blocked kèm lý do thay vì tự duyệt ảnh.

Các file schema có **18 lớp, tám nguy cơ**. Kiểm thử bằng fixture tạm và client SDK giả tách biệt hoàn toàn dữ liệu người dùng; số call của fixture không phải API call thật. Kiểm tra TypeScript và các test có kết quả được ghi trong reports/stage2_readiness.json sau lần chạy cuối. Không sử dụng Vitest global setup có thao tác DB.

**mAP/precision/recall/F1: chưa đánh giá được.** Không đánh giá hoặc train trên 500 ảnh chưa duyệt.

## 4. Rủi ro/giả định

- Cùng tác giả không chắc cùng nhà: gom conservatively có thể tạo nhóm lớn, làm lệch tỷ lệ mục tiêu. Ngược lại, cùng nhà khác tác giả/trang nguồn/hash có thể chưa được nhận ra; cần kiểm nhóm và bổ sung household_groups.csv trước khi freeze. Không tuyên bố metadata chứng minh được mọi căn nhà độc lập.
- Tác giả generic như unknown/anonymous không được gom toàn bộ thành một nhóm giả. Tên nhiều tác giả/alias vẫn cần người xem xét. dHash gần nhau có thể báo nhầm; không xóa/gộp file.
- Chỉ `Keep` có tên người duyệt/thời gian, license metadata đủ và checksum đúng mới được đưa vào chia tập. Còn bất kỳ ảnh pending nào thì không freeze. Ảnh đã Keep nhưng vướng license bị loại khỏi tập đủ điều kiện, không tự sửa metadata raw.
- Snapshot khóa review và cấu hình. Thay review, raw, taxonomy, luật hoặc nhóm thủ công sau freeze sẽ chặn xử lý tiếp. Không xóa snapshot để thử seed khác; nếu cần sửa dataset phải thiết kế phiên bản benchmark mới và quyết định riêng về test.
- Mặc định chỉ tiền gán train/val. Test xuất task gán mù để giảm thiên lệch khi đánh giá Gemini. Có tùy chọn tiền gán test theo yêu cầu ban đầu, nhưng phải khóa cấu hình trước call test đầu tiên và không dùng test để so prompt/model.
- Risk-003/004/005/007/008 được giữ unknown trong tiền gán ảnh đơn chưa hiệu chuẩn: thiếu bằng chứng về mét/cm, lux ban đêm, ma sát hoặc tầm với. Vẫn mô tả dấu hiệu nhìn thấy. Human có thêm đo/khảo sát phải ghi nguồn bằng chứng trước khi xác nhận binary.
- CSV định nghĩa và registry khác phạm vi phòng ở một số nguy cơ, ví dụ RISK-002/bathroom. Giữ nguyên cả hai; applicable dùng registry hiện có, không biến nonapplicable thành nhãn âm. Chưa thay luật hoặc giải quyết khác biệt bằng sửa nhãn.
- 18 lớp taxonomy không đồng nghĩa mọi detector đã phủ đủ 18 lớp: OWL-ViT fallback và tái dựng 3D hiện hữu chưa được huấn luyện/kiểm chứng lại. Tách provider/tích hợp detector sâu vẫn thuộc Giai đoạn 6.
- SDK Google được khai báo sẵn phiên bản 3.4.0, [Apache-2.0](https://github.com/googleapis/js-genai/blob/main/LICENSE); metadata npm và type responseJsonSchema của gói phát hành được kiểm tra. Hiện thư mục node_modules chưa có SDK này; script chặn trước call thật và yêu cầu cài dependency dự án. Chưa kiểm chứng model/API trên tài khoản. Không chọn model dự phòng ngầm.
- File XML/tasks được kiểm tra cấu trúc và quy ước từ [tài liệu Label Studio](https://labelstud.io/guide/predictions); chưa kiểm thử import qua một server Label Studio thật. Community có [Apache-2.0](https://github.com/HumanSignal/label-studio/blob/develop/LICENSE), chưa được tự cài thêm.

## 5. Việc người dùng cần làm thủ công và lệnh chạy

### A. Hoàn tất duyệt cảnh trước

Mở **http://127.0.0.1:8765** để chọn Giữ/Loại/Cần thay cho cả 500 ảnh. Nếu server dừng:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/review_dataset.py
```

Nhóm sơ bộ nằm trong `data/processed/stage2/groups.csv` và `group_edges.json`. Nếu biết nhiều ảnh chung nhà, copy `scripts/ml/annotation/household_groups_TEMPLATE.csv` thành `data/review/household_groups.csv`; ghi image_id, household_group, reviewer, evidence cho từng ảnh. Không nhập định danh cá nhân vào household_group, chỉ dùng mã nội bộ như `house_001`.

### B. Chạy lại plan rồi freeze khi dữ liệu đủ

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/audit_dataset.py
.\.venv-ml\Scripts\python.exe scripts/ml/split_dataset.py
.\.venv-ml\Scripts\python.exe scripts/ml/split_dataset.py --freeze
```

Plan không tạo dataset_split thật. Freeze tạo `data/processed/stage2/frozen/manifest.csv` cùng snapshot/taxonomy/định nghĩa. `dataset_split` trong manifest raw vẫn giữ nguyên. Không freeze khi chưa xem xét nhóm tác giả/nhà; nếu thiếu nhóm độc lập, cần thêm dữ liệu thay vì tách ảnh cùng nhóm.

### C. Chuẩn bị cấu hình và tiền gán

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/prepare_annotations.py
.\.venv-ml\Scripts\python.exe scripts/ml/prelabel_dataset.py --dry-run
```

Chỉ khi đã có snapshot và môi trường SDK/API hợp lệ mới chạy lệnh thật. Cài dependency theo package-lock của repo nếu SDK chưa có (`npm ci`; lệnh này cài các dependency dự án, không cần cho audit/duyệt cảnh). Cung cấp `GEMINI_API_KEY` và `GEMINI_MODEL` qua môi trường tiến trình an toàn, không đặt giá trị key trong command history, file guide hoặc Git. Chọn model hỗ trợ vision + structured output trên tài khoản, không lấy chuỗi model trong README làm bằng chứng model đang khả dụng.

```powershell
# GEMINI_API_KEY và GEMINI_MODEL đã được cung cấp qua môi trường
.\.venv-ml\Scripts\python.exe scripts/ml/prelabel_dataset.py --limit 5
```

Không có `--limit` thì chạy toàn bộ train/val. Mỗi ảnh một request ở mode mặc định; `--mode per-risk` dùng chín request/ảnh (một bbox + tám nguy cơ), chỉ thử trên val khi cần xem độ ổn định. Xem lại chi phí theo dry-run trước khi chạy nhiều ảnh. Kết quả nằm trong `data/processed/stage2/prelabels/<run_id>/`; chạy lại cùng cấu hình sẽ đọc cache đã kiểm tra provenance.

Nếu chủ động cần tiền gán cả test, dùng `--include-test` với cấu hình cuối cùng đã khóa trên val. Tùy chọn này tạo `test_prelabel_lock.json` trước call test; cấu hình khác sẽ bị từ chối. Không xóa file khóa để đổi prompt/model. Test prelabel không phải chạy đánh giá baseline, không dùng làm ground truth chưa duyệt.

### D. Export và duyệt nhãn

Không cần Gemini để xuất task thủ công sau khi có frozen split:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/export_annotations.py
```

Hoặc điền đường dẫn run đã tạo để kèm tiền gán:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/export_annotations.py --run 'data/processed/stage2/prelabels/<run_id>'
```

Thay `<run_id>` bằng giá trị thực trong log; không chạy nguyên chuỗi minh họa. Output ở `data/processed/stage2/exports/`: COCO theo split, tasks Label Studio, risk_annotations.csv, XML và export_report.json. COCO chỉ chứa ảnh có tiền gán thành công; task còn thiếu không bị biến thành ảnh âm. Test mặc định không hiện predictions; `--show-test-prelabels` chỉ dùng khi thực sự cần xem tiền gán test đã khóa.

Cấu hình local-files và các bước duyệt ở [ANNOTATION_GUIDE.md](ANNOTATION_GUIDE.md). Chỉ annotations có người xác nhận mới được chuyển verified ở bước nhập/kiểm nhãn sau; chương trình hiện không tự thăng trạng thái hay đặt human_risk_verified=true. Giữ risk unknown nếu chưa có bằng chứng.

### E. Kiểm thử lại công cụ

```powershell
.\.venv-ml\Scripts\python.exe -m unittest discover -s scripts/ml -p 'test_*.py' -v
node --test scripts/ml/test_gemini_bridge.cjs
node node_modules/vitest/vitest.mjs run --config vitest.experience.config.ts tests/visionEngine.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

## 6. Quyết định còn chờ

Hai lớp mới đã được đặt tên/định nghĩa theo ủy quyền, không còn câu hỏi taxonomy. Cần người dùng hoàn tất duyệt cảnh và xem xét nhóm nguồn/nhà trước khi chạy thật. Sau tiền gán cần người dùng gán/sửa/xác nhận nhãn; **chưa chuyển Giai đoạn 3 khi chưa có nhãn verified**.
