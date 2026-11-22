# Giai đoạn 4 — cải thiện không train và thăm dò với nhãn AI

## 1. Đã làm gì

Theo lựa chọn của người dùng, đã chạy thăm dò thật bằng nhãn AI. **Chưa phải độ chính xác chính thức và chưa chứng minh khả năng phát hiện nguy cơ HIGH.** Nhánh benchmark human-verified vẫn giữ nguyên điều kiện ban đầu, không được mở khóa bằng nhãn AI.

38 ảnh do AI giữ và đủ metadata giấy phép, thuộc 37 nhóm nguồn: train 27, val 6, test 5. Gom nhóm trên toàn bộ 500 ảnh trước khi chọn ứng viên; không có nhóm xuất hiện ở nhiều split. Split thăm dò được khóa riêng, không tạo snapshot/khóa test chính thức.

Codex đã xem ảnh đầy đủ và lập nhãn độc lập trước khi xem dự đoán Gemini/OWLv2: 3 exemplar train, toàn bộ 6 val và 5 test. 24 ảnh train còn lại không có nhãn bbox/risk và không bị coi là âm. Nhãn có nguồn `Codex_visual_review`, trạng thái `ai_reference_not_human_verified`, `human_verified=false`. Ảnh test chỉ được model đọc sau khi chọn winner từ val.

Đã chạy cả 8 cấu hình đã khai báo trên cùng 6 ảnh val, rồi đúng một lượt của cấu hình đã khóa trên 5 test. Model: `gemini-3.5-flash-lite`. Seed `20261122`, temperature `0.1`, group bootstrap `1000`; baseline giữ sampling mặc định, không seed, timeout 3,5 giây. Không gradient training, fine-tune hoặc đổi provider của ứng dụng.

## 2. File đã tạo/sửa

- [`prepare_stage4_candidates.py`](../scripts/ml/prepare_stage4_candidates.py): nhóm/chia ứng viên AI, giữ nguyên raw và trạng thái human.
- [`explore_stage4.py`](../scripts/ml/explore_stage4.py): protocol AI riêng, nhãn tri-state, few-shot từ train, cache, chọn trên val và khóa một lượt test.
- [`experiment_stage4.py`](../scripts/ml/experiment_stage4.py), [`experiment_bridge.cjs`](../scripts/ml/experiment_bridge.cjs): dùng lại runner; schema giữ các nguy cơ cần đo ở unknown và applicability đúng registry. Bỏ giới hạn array khỏi grammar API để tránh lỗi quá nhiều trạng thái, kiểm tra chặt lại tại local.
- [`run_stage4.cjs`](../scripts/ml/run_stage4.cjs): nạp cấu hình local qua environment, không ghi key vào argv/log; `--exploratory` chọn runner AI riêng.
- [`requirements-stage4-runtime.txt`](../scripts/ml/requirements-stage4-runtime.txt), [`requirements-stage4-resolved.txt`](../scripts/ml/requirements-stage4-resolved.txt), [`stage4_licenses.json`](../scripts/ml/stage4_licenses.json): môi trường CPU, dependency và nguồn giấy phép.
- [`summarize_stage4_exploration.py`](../scripts/ml/summarize_stage4_exploration.py), [`verify_stage4_exploration.py`](../scripts/ml/verify_stage4_exploration.py): CSV, support/CI, thông báo nhãn AI trên gallery, kiểm tra ZIP và artifact.
- [`comparison.md`](../reports/stage4_exploratory/comparison.md), [`winner_details.md`](../reports/stage4_exploratory/winner_details.md), [`object_metrics.csv`](../reports/stage4_exploratory/object_metrics.csv), [`risk_metrics.csv`](../reports/stage4_exploratory/risk_metrics.csv), [`operations.json`](../reports/stage4_exploratory/operations.json): kết quả thật, lỗi, usage và thời gian.

Ảnh, nhãn tham chiếu, protocol, cache, model weights và cấu hình bí mật đều ở vùng local bị gitignore. Không sửa luật/ngưỡng y khoa, raw, `.env`, package.json/lockfile hoặc quyết định duyệt của người dùng.

## 3. Kết quả số liệu thật

**Các số sau là mức khớp với nhãn AI, không phải độ chính xác xác nhận bởi con người.**

| Cấu hình val | Lỗi/6 | mAP50 so nhãn AI | Đủ điều kiện chọn |
| --- | --- | --- | --- |
| baseline | 6 | 0.0000 | Không |
| structured | 0 | 0.7822 | Có |
| few_shot | 0 | 0.6417 | Có |
| per_risk | 1 | 0.8210 | Không |
| self_verify | 1 | 0.8591 | Không |
| structured_recall | 0 | 0.7822 | Có |
| owlv2 | 0 | 0.4614 | Có |
| owlv2_recall | 0 | 0.5642 | Có |

Chọn `structured`: val mAP50 **0.7822**, CI95 [0.5000, 0.9626] (B=1000); test thăm dò mAP50 **0.7092**, CI95 [0.4673, 1.0000] (B=1000).

Val có 22 đối tượng AI thuộc 13 lớp; test có 12 đối tượng AI thuộc 8 lớp. Chỉ chấm 17 lớp cụ thể; lớp mở `other` không gán hết nên loại khỏi chấm, không coi là âm. Lớp không có support giữ AP=null.

Val và test đều **0 nhãn HIGH dương tính đủ bằng chứng**. HIGH recall, risk recall và risk F1 chưa xác định; không thay bằng 0 hoặc 100%. RISK-003/004/005/007/008 giữ unknown vì ảnh không cung cấp phép đo/khảo sát. Unknown và N/A không biến thành nhãn âm.

Quy tắc đã khóa trước inference: chỉ cấu hình không lỗi mới đủ điều kiện; nếu có HIGH dương tính thì ưu tiên HIGH recall → risk recall → risk F1 → mAP50 → risk precision. Nếu không có HIGH dương tính, chỉ chọn theo mAP50 và ghi chưa đánh giá hiệu quả risk. Hòa tuyệt đối chọn ID đầu theo thứ tự chữ cái. `structured` và `structured_recall` bằng điểm không chứng minh ngưỡng thấp cải thiện recall nguy cơ.

Gemini invocations trong thí nghiệm: **98**; OWLv2 invocations đã ghi cache: **12**. Ngoài ra có 5 lời gọi thử Gemini trên train và 1 lần preprocessing OWLv2 dừng vì thiếu SciPy trước khi có model output. Các số này không đếm retry HTTP nội bộ SDK. Lỗi val đã lưu không được chạy lại để thay điểm; sau khi cài SciPy chỉ đọc lại cache Gemini cũ.

Kiểm thử: **60/60 Python**, **14/14 Node bridge**, **16/16 Vitest vision**; TypeScript noemit đạt. Kiểm tra artifact và ZIP: **506/506 file raw không đổi**, không tạo human flags, không rò nhóm. Lệnh gọi lại test sau hoàn tất trả `api_calls=0`. [Biên bản kiểm tra](../reports/stage4_exploratory_verification.json).

## 4. Rủi ro và giả định

Mẫu rất nhỏ và nhiều ảnh cận cảnh, ảnh cũ hoặc không đại diện nhà ở người cao tuổi tại Việt Nam. Khoảng tin cậy rộng; bbox AI chỉ được ước lượng bằng thị giác, có thể sai lớp, thiếu vật và sai hình học. Đây là mức đồng thuận giữa dự đoán và nhãn AI, không phải GT độc lập do con người kiểm tra. Cấu hình chọn theo bbox chưa được chọn/kiểm chứng theo HIGH recall.

Baseline lỗi cả 6 ảnh; điểm 0 là cách giữ lỗi trong mẫu số, không phải kết luận rằng model có năng lực nhận diện bằng 0. Adapter giữ timeout 3,5 giây và từ chối fallback. Các cấu hình API/JSON lỗi cũng giữ trong bảng, không loại ảnh khó. Chưa chẩn đoán nguyên nhân cụ thể của từng lỗi bằng báo cáo an toàn đã lưu, nên không gán mọi lỗi baseline cho timeout.

[OWLv2 model card](https://huggingface.co/google/owlv2-base-patch16-ensemble/blob/cfd3195ba4ea9592eec887ded089f4c08eff231d/README.md) khai báo Apache-2.0, revision `cfd3195ba4ea9592eec887ded089f4c08eff231d`. Chỉ dùng safetensors, SHA-256 `e1e130b9e404cf91a75ad45644c1da9d7fa5284085eecc864266a6923efb99e7`, 619.918.824 bytes. Transformers 4.57.1 Apache-2.0; torch 2.9.0 BSD-style. [SciPy 1.18.1](https://github.com/scipy/scipy/blob/v1.18.1/LICENSE.txt) dùng BSD-3-Clause ở source; giữ thêm notice của thư viện được đóng gói trong wheel. Không phân phối lại weights/venv trong repo.

Runtime được khóa bổ sung trong `data/processed/stage4/exploratory/runtime_addendum.json`: SciPy bắt buộc cho resize nhưng không được transformers cài mặc định. Bổ sung backend trước forward OWLv2 đầu tiên, không thay thuật toán/prompt/threshold. OWLv2 chạy CPU 2 threads; số giây trong cache gồm cold load/preprocessing, chưa phải benchmark latency có kiểm soát.

Schema ép unknown cho risk cần đo là biện pháp bảo toàn dữ liệu, không phải bằng chứng model tự nhận biết được giới hạn. Confidence threshold chỉ lọc bbox, không thay luật an toàn. Cache checksum phát hiện thay đổi ngoài ý muốn, không phải chữ ký chống giả mạo.

## 5. Việc cần làm thủ công

Không cần phê duyệt thêm cho lượt thăm dò đã được người dùng cho phép. Có thể xem bảng/CSV và gallery nhãn AI ở `reports/stage4_exploratory/val/`, `test/`.

Để có benchmark chính thức sau này: xử lý ảnh sai bối cảnh/giấy phép, bổ sung ảnh và nhãn HIGH dương tính, duyệt bbox/cả 8 risk bằng con người; cung cấp phép đo cho các risk không quan sát được. Sau đó dùng nhánh human-verified riêng. Không tái dùng test thăm dò này để vừa chỉnh prompt vừa báo một kết quả test mới như độc lập.

Đọc kết quả hiện tại hoặc kiểm tra lại (không gọi thêm test):

```powershell
node scripts/ml/run_stage4.cjs --exploratory final-test
.\.venv-ml\Scripts\python.exe scripts/ml/verify_stage4_exploration.py
```

Tái lập môi trường dùng `pip install -r scripts/ml/requirements-stage4-resolved.txt`. Lần thiết lập mới dùng `requirements-stage4-runtime.txt`; giữ dữ liệu/protocol local để đối chiếu. Không xóa winner, lock, ledger hoặc cache để chạy lại test. Khi đã có winner, lệnh `val` chỉ trả selection đã khóa, không retune.

Benchmark chính thức vẫn dùng `node scripts/ml/run_stage4.cjs val --dry-run`; nó còn yêu cầu split đóng băng và bundle nhãn human-verified. `reports/experiments.md` là readiness của nhánh chính thức; báo cáo kết quả AI nằm riêng trong thư mục trên.

## 6. Quyết định tiếp theo

**Dừng ở Giai đoạn 4 theo yêu cầu.** Chưa đủ bằng chứng đánh giá HIGH recall hay quyết định fine-tune Giai đoạn 5. Không tự tạo xác nhận human hoặc công bố các số thăm dò như độ chính xác chính thức.
