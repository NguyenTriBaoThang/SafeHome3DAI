# B05 — Baseline Detector (RT-DETR vs YOLO) & Đối chứng Chi phí – Tốc độ

**Nhánh triển khai:** `feature/b-05-detector-comparison`  
**Trạng thái hiện tại:** `not_ready` *(Đã khóa pipeline huấn luyện, export ONNX và kịch bản đối chứng tái lập; CHƯA huấn luyện và CHƯA có file ONNX thật do thiếu tập ảnh hộ gia đình Việt Nam có nhãn người xác nhận từ B02/B03).*

---

## 1. Lựa chọn mô hình & Lý do kỹ thuật – bản quyền
- **Lựa chọn chính:** **RT-DETR R18** (`PekingU/rtdetr_r18vd`, revision `ac77a11ff0170a41b771c03264987f8ce2b0d753`).
  - **Bản quyền:** **Apache-2.0**, dùng trọng số `safetensors` an toàn cho phát hành mở / y tế cộng đồng.
  - **Vì sao chưa chọn YOLOv8 mặc định:** các gói Ultralytics YOLOv8 dùng giấy phép **AGPL-3.0** nếu chưa mua giấy phép thương mại; RT-DETR R18 cho kích thước nhẹ, xuất được ONNX opset 17 chạy CPU (`detector_stage5.py`, `export_stage5_onnx.py`) và phù hợp phục vụ qua FastAPI nội bộ (`serve_stage5.py`).

---

## 2. Lệnh tái lập & Bảo vệ tập Test Khóa (Locked Test Set)
- **Kiểm tra điều kiện dữ liệu & chuẩn bị tập Stage 5:**
  - `python scripts/ml/prepare_stage5.py` (kiểm tra human-only gates, trả `training_permitted=false` khi số ảnh train/val verified = `0`).
- **Huấn luyện tái lập (khi có đủ >= 50 bbox/lớp & split theo `household_id`):**
  - `python scripts/ml/train_detector.py` (seed `20261122`, AdamW `lr=5e-5`, `patience=6`, augmentation chỉ ở train, lưu `best.safetensors`).
- **Xuất ONNX & đối chứng P50/P95 CPU:**
  - `python scripts/ml/export_stage5_onnx.py` (ONNX opset 17, đối chiếu parity với PyTorch trên tập `val`, giữ nguyên `test` khóa chỉ chạy 1 lần ở `final_test_stage5.py`).
- **Tạo báo cáo đối chứng B05 (`reports/b05_comparison.json`):**
  - `python scripts/ml/b05_benchmark_comparison.py`

---

## 3. Bảng Đối chứng Gemini VLM vs Local Detector (Trung thực hiện trạng)
| Tiêu chí đối chứng | Gemini VLM (Cloud Proxy) | RT-DETR R18 Local (ONNX CPU) | Trạng thái |
| :--- | :---: | :---: | :--- |
| **Provider ID (`SHARED_CONTRACT_V1`)** | `gemini` | `local` | Đã chuẩn hóa trong `src/lib/vision/providers/` |
| **Chế độ dự phòng im lặng** | **Cấm** (lỗi -> HTTP `503`, UI giữ checklist) | **Cấm** (lỗi -> HTTP `503`, UI giữ checklist) | Đã kiểm chứng trong `visionProviders.test.ts` |
| **Checkpoint / ONNX Artifact** | Cloud API (`providerMetadata.modelVersion`) | Chưa có (`0/0` file `.onnx`) | **`not_ready`** (`training_permitted=false`) |
| **Precision / Recall / F1 / mAP@50 vật thể** | `chưa đánh giá` (thiếu locked test B03) | `not_ready` (0 ảnh verified) | Chưa đủ dữ liệu |
| **Latency P50 / P95 & Peak RAM** | Chưa đo trên locked test | Chưa đo vì chưa có `.onnx` | Chưa có số liệu |
| **Chi phí gọi API / ảnh** | Theo hạn mức Gemini | `0 USD` khi chạy ONNX cục bộ | Chỉ áp dụng khi có artifact |

> **Ràng buộc bắt buộc:** Tuyệt đối **không** dùng con số thăm dò `70,92%` trên 5 ảnh nhãn AI trước đây hay tập 38 ảnh Wikimedia Commons để suy diễn độ chính xác phát hiện mối nguy (`RISK-001..008`) hoặc khẳng định làm giảm tỷ lệ té ngã.

---

## 4. Khung Ablation tách biệt Object vs Hazard
Hệ thống giữ logic quy tắc nguy cơ độc lập với bộ phát hiện (`risk_supported=false` ở mọi provider Vision):
1. **Stage 1 (`object_only`):** Bộ detector chỉ sinh `detections` (`PENDING_REVIEW`) + bounding box; mọi nguy cơ phi thị giác (`lux`, sàn trơn, độ cố định mép thảm) để `unknown`.
2. **Stage 2 (`+survey_confirmation`):** Người dùng chấp nhận/sửa/loại từng nhãn và trả lời câu hỏi làm rõ.
3. **Stage 3 (`+risk_rules`):** Động cơ quy tắc chuẩn `evaluateRoomHazardsCanonical` (A03) tính nguy cơ từ đối tượng đã xác nhận + số đo thực/xác nhận.

