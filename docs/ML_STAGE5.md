# Giai đoạn 5 — chuẩn bị fine-tune có điều kiện

## 1. Đã làm gì

Đã triển khai phần chuẩn bị của Giai đoạn 5: kiểm tra điều kiện dữ liệu, thống kê thiếu nhãn, xuất bundle train/val verified, notebook Colab/Kaggle, huấn luyện detector với early stopping, xuất ONNX có kiểm tra parity, đo độ trễ trên ảnh val thật, và FastAPI demo chạy local.

**Chưa fine-tune trên dữ liệu của người dùng. Chưa có model fine-tune, file ONNX, metric sau fine-tune hoặc số đo độ trễ thật của model đó.** Yêu cầu ban đầu quy định chỉ fine-tune khi Giai đoạn 4 chưa đạt và dữ liệu đủ. Lựa chọn chạy thăm dò với nhãn AI ở Giai đoạn 4 không biến các nhãn đó thành human-verified, cũng không làm 3 ảnh train có nhãn trở thành bộ dữ liệu đủ cho detector.

Lệnh kiểm tra đã chạy trên dữ liệu thật và trả `training_permitted=false`. Nó không tải trọng số, gọi Gemini hoặc tự ghi xác nhận human. Không tạo classifier nguy cơ; mọi risk từ API detector giữ `unknown`.

Model dự kiến là **RT-DETR R18**, checkpoint `PekingU/rtdetr_r18vd`, revision `ac77a11ff0170a41b771c03264987f8ce2b0d753`. [Model card của checkpoint](https://huggingface.co/PekingU/rtdetr_r18vd/blob/ac77a11ff0170a41b771c03264987f8ce2b0d753/README.md) khai báo Apache-2.0. Chọn checkpoint nhỏ và chỉ dùng safetensors. Chưa tải trọng số của checkpoint này.

## 2. File đã tạo/sửa

| File | Vai trò |
| --- | --- |
| [`stage5_plan.json`](../scripts/ml/stage5_plan.json) | Checkpoint, seed, minimum support, mục tiêu detector, augmentation, early stopping |
| [`stage5_common.py`](../scripts/ml/stage5_common.py), [`prepare_stage5.py`](../scripts/ml/prepare_stage5.py) | Human-only gates, bảo vệ test cũ, thống kê thiếu nhãn, bundle/COCO train-val |
| [`train_detector.py`](../scripts/ml/train_detector.py) | AdamW, augmentation đồng bộ bbox, loss/backward, val mỗi epoch, lưu best safetensors |
| [`detector_stage5.py`](../scripts/ml/detector_stage5.py) | Decoder sigmoid RT-DETR, bbox chuẩn hóa, inference ONNX CPU, risk unknown |
| [`export_stage5_onnx.py`](../scripts/ml/export_stage5_onnx.py) | ONNX opset 17, parity với PyTorch trên val, kiểm tra preprocessing, đo p50/p95 |
| [`final_test_stage5.py`](../scripts/ml/final_test_stage5.py) | Test một lượt sau khi chọn checkpoint; ledger/cache, lỗi vẫn giữ trong mẫu số |
| [`serve_stage5.py`](../scripts/ml/serve_stage5.py) | FastAPI loopback nhận bytes ảnh, trả bbox và unknown; không lưu ảnh upload |
| [`requirements-stage5.txt`](../scripts/ml/requirements-stage5.txt), [`stage5_licenses.json`](../scripts/ml/stage5_licenses.json) | Dependency tùy chọn và nguồn giấy phép |
| [`stage5_detector_finetune.ipynb`](../notebooks/stage5_detector_finetune.ipynb) | Notebook có kiểm tra dữ liệu trước cài dependency/tải model/train |
| [`test_stage5.py`](../scripts/ml/test_stage5.py) | Chặn nhãn AI/test leakage, kiểm tra decoder/augmentation/notebook và một epoch tổng hợp |
| [`readiness.md`](../reports/stage5/readiness.md), [`object_data_gaps.csv`](../reports/stage5/object_data_gaps.csv), [`risk_data_gaps.csv`](../reports/stage5/risk_data_gaps.csv) | Kết quả dữ liệu thật và số nhãn còn thiếu |

Đã thêm ignore cho `.venv-stage5/` và notebook checkpoint. Giữ nguyên dữ liệu raw, license/attribution, `.env`, package.json/lockfile, quyết định duyệt của người dùng và các artifact Giai đoạn 4. Không tích hợp provider vào Next.js ở bước này.

## 3. Kết quả số liệu thật

| Chỉ số kiểm tra | Hiện có |
| --- | --- |
| Ảnh raw | 500 |
| Ảnh scene được người duyệt, đủ điều kiện metadata | 1 |
| Ảnh train có bbox/risk verified trong split chính thức hợp lệ | 0 |
| Ảnh val verified trong split chính thức hợp lệ | 0 |
| Lớp detector đủ điều kiện fine-tune | 0/18 |
| Nhãn train AI của lần thăm dò trước | 25 bbox trên 3 ảnh; không tính là verified |
| Dòng risk raw chưa có nhãn | 4.000; không tính là nhãn âm |
| Nhãn dương train verified cho từng RISK-001..008 | 0 |
| Thiếu để đạt 50 ảnh dương train verified cho từng nguy cơ | 50/nguy cơ |
| Lượt fine-tune trên dữ liệu của người dùng | 0 |
| Model fine-tune/ONNX được tạo | 0/0 |
| mAP/recall sau fine-tune, parity model thật, độ trễ | Chưa đánh giá được |

Số thiếu là số nhãn cần bổ sung hoặc duyệt, không nhất thiết là số ảnh mới phải chụp: một ảnh có thể có nhiều vật thể hoặc nhiều nguy cơ. Không cộng cơ học 8 × 50 thành số ảnh duy nhất phải thu thập. Với nguy cơ cần đo, phải có bằng chứng đo/khảo sát; không thể tạo 50 nhãn dương bằng suy đoán từ pixel.

Lượt kiểm thử có một model RT-DETR rất nhỏ khởi tạo ngẫu nhiên, một epoch trên ảnh/nhãn **tổng hợp trong thư mục tạm**. Nó kiểm tra processor, loss/backward, optimizer, validation và lưu safetensors, không đo năng lực nhận diện của checkpoint dự kiến trên dữ liệu người dùng. Metric của fixture không được đưa vào báo cáo chất lượng ML.

Kết quả kiểm thử và kiểm tra toàn vẹn cuối cùng nằm trong [`reports/stage5/verification.json`](../reports/stage5/verification.json).

## 4. Rủi ro và giả định

Các mức tối thiểu cho detector trong plan là tiêu chí chuẩn bị kỹ thuật: mỗi lớp cần ít nhất 50 bbox train, 20 ảnh train có lớp đó thuộc ít nhất 10 nhóm, cùng 5 ảnh val thuộc ít nhất 5 nhóm. Đây không phải một định luật về đủ dữ liệu hay bảo đảm độ tổng quát. Val có dưới 20 ảnh dương vẫn cần cảnh báo sai số lớn. Có thể thay plan trước một run mới; không hạ chuẩn chỉ để chạy được trên 3 ảnh AI hiện tại.

Ngưỡng 50 ảnh dương cho classifier nguy cơ là yêu cầu gốc của người dùng. Nhánh này không có mã huấn luyện classifier nguy cơ. Các mức mAP50 0,80 và recall từng lớp 0,85 là mục tiêu kỹ thuật mặc định cho detector, không phải ngưỡng y khoa hoặc tiêu chí người dùng đã đặt về an toàn. Fine-tune chỉ được đề xuất bằng kết quả **val human-verified**, trên đúng các lớp có đủ dữ liệu; lớp yếu không được train không làm lý do huấn luyện lại một lớp đã đạt. Không dùng điểm test để kích hoạt fine-tune.

Chỉ các lớp đủ support được đưa vào head. Chưa gộp lớp hiếm hay thay taxonomy 18 lớp. Các lớp không train được liệt kê trong metadata; không phát hiện chúng không có nghĩa chúng vắng mặt. Khi so sánh model mới với Giai đoạn 4, phải dùng cùng ảnh và cùng lớp được chấm, không so mAP của một tập lớp nhỏ với mAP của toàn bộ taxonomy rồi gọi là cải thiện.

Các nhóm chứa 5 ảnh test thăm dò Giai đoạn 4 tiếp tục bị cấm vào train/val, kể cả khi group ID thay đổi sau bổ sung dữ liệu: công cụ tính lại component trên toàn bộ raw theo source/author/dhash. Bundle huấn luyện chỉ chứa ảnh và nhãn train/val; test chỉ có ID/checksum/group. Đánh giá test cần snapshot và export human gốc, được khóa sau khi chọn best checkpoint. Test từng dùng ở Giai đoạn 4 không được mô tả như holdout hoàn toàn mới.

Notebook và mã export là **phần chuẩn bị đã kiểm tra bằng fixture**, chưa được chạy end-to-end trên checkpoint fine-tune thật hoặc GPU Colab/Kaggle. Đặc biệt chưa kiểm chứng ONNX RT-DETR thật: lệnh export sẽ chặn nếu sai parity hoặc preprocessing không khớp. Chỉ metadata export đã vượt kiểm tra parity mới được service chấp nhận. Không có file ONNX/độ trễ giả để lấp chỗ trống.

Torch 2.9.0, Transformers 4.57.1 và safetensors dùng lại các lựa chọn đã kiểm tra; ONNX 1.23.2 Apache-2.0, ONNX Runtime 1.32.0 theo metadata maintainer là MIT, FastAPI 0.165.0 MIT, Uvicorn 0.54.0 BSD-3-Clause. Nguồn và hạn chế đối chiếu nằm trong `stage5_licenses.json`; truy xuất source license ONNX Runtime trả 404 nên không mô tả là đã đọc được file đó. Giữ notice của dependency và thư viện được đóng gói trong wheel. Không thêm Ultralytics/AGPL. Giấy phép model không thay thế nghĩa vụ license/attribution của ảnh.

Dùng môi trường Giai đoạn 5 riêng để tránh thay runtime đã khóa của Giai đoạn 4. Chưa cài dependency tùy chọn hay tạo môi trường mới trong lượt này. Cache/checksum phát hiện sửa đổi ngoài ý muốn, không phải chữ ký chống người cố ý giả nguồn xác nhận.

## 5. Việc cần làm thủ công

1. Kiểm tra/hoàn tất duyệt scene và bbox/risk bằng công cụ duyệt/Label Studio đã chuẩn bị. Xử lý ảnh sai bối cảnh và giấy phép; giữ các nhóm test cũ ở test. Mỗi lớp định huấn luyện cần đạt support trong CSV, không bắt buộc phải có đủ cả 18 lớp mới bắt đầu.
2. Có kết quả val human-verified của Giai đoạn 4 để biết detector yếu ở lớp nào. Điểm 0,7822/0,7092 so nhãn AI chưa chứng minh nhu cầu fine-tune chính thức.
3. Khi đủ điều kiện, tạo bundle bằng môi trường hiện có:

   ```powershell
   .\.venv-ml\Scripts\python.exe scripts/ml/prepare_stage5.py check
   .\.venv-ml\Scripts\python.exe scripts/ml/prepare_stage5.py export
   ```

   Hiện `check`/`export` trả trạng thái blocked (mã thoát khác 0) là đúng, không phải lỗi cần bỏ qua. Không sửa cờ human hay tự viết bundle để vượt chốt.

4. Mở notebook trên GPU Colab/Kaggle với repo và bundle/ảnh train-val trong vùng lưu trữ riêng. Notebook không upload lên Hub, không cần API key. Cell đầu kiểm dữ liệu trước mọi lệnh cài môi trường/tải trọng số. Huấn luyện có seed, flip ngang sửa bbox, jitter sáng/tương phản nhẹ và early stopping theo val. Giữ nguyên model/plan sau khi chọn checkpoint; chạy export và benchmark val theo notebook.
5. Để chạy model/ONNX sau khi đã có checkpoint, dùng môi trường riêng ở máy local:

   ```powershell
   py -3.13 -m venv .venv-stage5
   .\.venv-stage5\Scripts\python.exe -m pip install -r scripts/ml/requirements-stage5.txt
   .\.venv-stage5\Scripts\python.exe scripts/ml/export_stage5_onnx.py export
   .\.venv-stage5\Scripts\python.exe scripts/ml/export_stage5_onnx.py benchmark
   .\.venv-stage5\Scripts\python.exe scripts/ml/final_test_stage5.py
   ```

   Khi train trên Colab, mang thư mục run/best/ONNX và `run.json` về workspace có snapshot và export human gốc. Không tự đổi các đường dẫn/cờ verified để giả nguồn. Lệnh final-test dùng ONNX đã parity, không tune ngưỡng theo test, lưu cả lỗi; lần gọi lại chỉ đọc report. Không xóa lock/cache để chạy lại.

API demo khi đã có model và dependency:

```powershell
.\.venv-stage5\Scripts\python.exe -m uvicorn serve_stage5:create_app --factory --app-dir scripts/ml --host 127.0.0.1 --port 8766
```

`POST /detect` nhận bytes JPEG/PNG; trả bbox 0..1, lớp không được train và risk `unknown`. Đây là demo detector, chưa phải provider production hoặc kết luận an toàn.

## 6. Câu hỏi cần quyết

Không có yêu cầu phê duyệt mới cho phần chuẩn bị này. Phần đang thiếu là dữ liệu và bằng chứng đánh giá, không phải một câu trả lời “đồng ý train”. Nếu cần đổi taxonomy/gộp lớp hoặc chấp nhận một chính sách dữ liệu khác thì phải ghi rõ thay đổi trước một run mới; không tự coi nhãn AI là người đã xác nhận.

**Dừng ở Giai đoạn 5 với phần chuẩn bị hoàn tất và fine-tune đang bị chặn bởi dữ liệu.** Chưa chuyển Giai đoạn 6.
