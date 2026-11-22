"""Create the guarded Colab/Kaggle notebook; never installs packages or trains."""
import json
from pathlib import Path

from dataset_common import ROOT, write_json


def build(output=ROOT / "notebooks/stage5_detector_finetune.ipynb"):
    cells = []
    def markdown(text):
        cells.append({"cell_type": "markdown", "metadata": {}, "source": text.splitlines(True)})
    def code(text):
        cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": text.splitlines(True)})
    markdown("""# Giai đoạn 5 — fine-tune detector có điều kiện

**Hiện dữ liệu repo chưa đủ để huấn luyện. Notebook này là phần chuẩn bị, chưa có kết quả fine-tune/ONNX/độ trễ.**

Chỉ dùng bundle được `prepare_stage5.py export` tạo từ ảnh và bbox human-verified, sau khi Giai đoạn 4 chính thức cho thấy cần cải thiện detector. Không dùng nhãn AI, unknown/unlabeled như nhãn âm, không train classifier nguy cơ. Giữ nguyên nhóm test; chọn checkpoint bằng val.

Model RT-DETR R18: Apache-2.0 theo model card; checkpoint revision khóa trong `stage5_plan.json`. Huấn luyện cần GPU Colab/Kaggle và Python 3.12/3.13. Không đưa .env/key vào notebook hay upload dữ liệu gia đình lên dịch vụ công khai.

Trước khi mở: giữ bản checkout repo riêng trong runtime, cấu hình `SAFEHOME_REPO` và `SAFEHOME_RAW` nếu cần; chuyển bundle train/val cùng các ảnh tương ứng lên vùng lưu trữ riêng. Không tự clone repo private bằng token trong cell. Bộ dữ liệu gốc hiện tại bị chặn ở bước kiểm tra dưới đây.
""")
    code("""import os, sys, subprocess
from pathlib import Path
REPO = Path(os.environ.get('SAFEHOME_REPO', '/content/SafeHome3DAI'))
if not REPO.is_dir():
    raise RuntimeError('Đặt SAFEHOME_REPO tới bản checkout repo trong Colab/Kaggle trước khi chạy.')
os.chdir(REPO)
sys.path.insert(0, str(REPO / 'scripts/ml'))
RAW = Path(os.environ.get('SAFEHOME_RAW', str(REPO / 'data/raw')))
BUNDLE = REPO / 'data/processed/stage5/training_bundle/bundle.json'
RUN = REPO / 'models/stage5/rtdetr_r18'
if sys.version_info[:2] not in {(3, 12), (3, 13)}:
    raise RuntimeError('Dùng runtime Python 3.12 hoặc 3.13 cho phiên bản đã khóa.')
""")
    markdown("""## Kiểm tra trước khi tải model/cài môi trường

Bundle chỉ có train/val; không chứa annotation test. Gate kiểm tra checksum ảnh, nhóm, trạng thái verified, support từng lớp và checkpoint đã kiểm tra giấy phép. Lỗi thiếu bundle/dữ liệu ở đây là trạng thái dự kiến hiện tại; không bỏ qua cell này.
""")
    code("""from stage5_common import load_training_bundle
bundle = load_training_bundle(BUNDLE, RAW)
print({'status': 'verified_train_val_bundle_loaded', 'classes': bundle['class_to_model_id'],
       'images': len(bundle['images']), 'test_annotations_included': bundle['test_annotations_included']})
""")
    code("""# Chỉ chạy sau khi gate trên đạt; dùng runtime Colab/Kaggle riêng, không sửa venv Stage 4.
subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'scripts/ml/requirements-stage5.txt'], check=True)
""")
    markdown("""## Huấn luyện chỉ detector

Seed, augmentation flip ngang có sửa bbox, jitter sáng/tương phản nhẹ, learning rate, patience và ngưỡng bbox đều được lưu trong plan. Early stopping chọn theo mAP50 val. Không crop làm mất quan hệ vật thể, không đảo dọc, không đổi luật/ngưỡng y khoa. Seed không đảm bảo CUDA tái lập từng bit.
""")
    code("""import torch
if not torch.cuda.is_available():
    raise RuntimeError('Bật GPU runtime; không tự thay bằng một lượt train CPU dài.')
subprocess.run([sys.executable, 'scripts/ml/train_detector.py', '--bundle', str(BUNDLE),
                '--raw', str(RAW), '--output', str(RUN), '--device', 'cuda'], check=True)
""")
    code("""import json
history = json.loads((RUN / 'history.json').read_text(encoding='utf-8'))
for row in history:
    print({key: row[key] for key in ['epoch', 'train_loss', 'val_map50', 'seconds']})
# Không đọc hoặc chỉnh ngưỡng theo test.
""")
    markdown("""## ONNX và đo độ trễ trên val

Chỉ export checkpoint hoàn tất; kiểm tra parity PyTorch/ONNX trên tối đa 3 ảnh val thật. Sai parity thì không phát hành metadata cho service. Benchmark đọc ảnh val thật, có warmup, báo p50/p95 CPU; không gọi đó là độ trễ trên trình duyệt hay GPU.
""")
    code("""subprocess.run([sys.executable, 'scripts/ml/export_stage5_onnx.py', 'export', '--run', str(RUN),
                '--bundle', str(BUNDLE), '--raw', str(RAW), '--onnx', str(RUN / 'onnx')], check=True)
subprocess.run([sys.executable, 'scripts/ml/export_stage5_onnx.py', 'benchmark', '--bundle', str(BUNDLE),
                '--raw', str(RAW), '--onnx', str(RUN / 'onnx')], check=True)
""")
    markdown("""## Test một lượt và API demo

Chuyển thư mục model/ONNX cùng `run.json` về workspace gốc có frozen snapshot, export Label Studio gốc và verified bundle để đánh giá test. Những đường dẫn human-export tuyệt đối của Windows không tự hợp lệ trên Colab; không sửa cờ verified để bỏ qua kiểm tra. Chạy tại workspace gốc:

```powershell
.\\.venv-stage5\\Scripts\\python.exe scripts/ml/final_test_stage5.py
```

Lệnh này chỉ dùng detector đã chọn, giữ lỗi trong mẫu số, ghi ledger trước từng ảnh và không suy luận lại khi test đã hoàn tất. Test Giai đoạn 4 đã xem không được mô tả như holdout hoàn toàn mới. Chỉ báo metric detection cho các lớp đã train; không công bố recall nguy cơ từ detector đơn thuần.

API demo loopback trong môi trường có dependency:

```bash
python -m uvicorn serve_stage5:create_app --factory --app-dir scripts/ml --host 127.0.0.1 --port 8766
curl --data-binary @photo.jpg -H 'Content-Type: image/jpeg' http://127.0.0.1:8766/detect
```

API trả bbox chuẩn hóa và risk `unknown`, không ghi ảnh lên đĩa. Chưa tích hợp provider vào Next.js (Giai đoạn 6). Không public dịch vụ này hoặc đưa dữ liệu nhà ở lên Hub trong notebook. Dừng ở Giai đoạn 5.
""")
    for index, cell in enumerate(cells):
        cell["id"] = "stage5-" + str(index)
    write_json(output, {"nbformat": 4, "nbformat_minor": 5, "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.12"}}, "cells": cells})
    return output


if __name__ == '__main__':
    print(build())
