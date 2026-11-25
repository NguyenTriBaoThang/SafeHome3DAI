# B11 — Giao thức Thực nghiệm Đối chứng & Kịch bản Phân tích Số liệu

**Nhánh triển khai:** `feature/b-11-evaluation-protocol`  
**Trạng thái hiện tại:** `blocked_awaiting_field_data` *(Đã khóa thiết kế giao thức, script phân tích tái lập, bootstrap CI, confusion matrix và kiểm thử đơn vị; hiện có `0` tình nguyện viên và `0` phòng đo thật bằng thước laser ngoài thực địa nên chưa công bố kết quả đo).*

---

## 1. Thiết kế Giao thức Thực nghiệm (Pre-Registered Protocol)
1. **Phạm vi & Tuyên bố miễn trừ lâm sàng:**
   - Thực nghiệm chỉ đánh giá **khả năng sàng lọc mối nguy môi trường** và **tính dễ dùng (usability)** giữa 2 phương pháp trong phiên test ngắn hạn.
   - Tuyệt đối **không** kết luận *"giảm tỷ lệ té ngã thực tế"* hoặc *"hiệu quả điều trị/chẩn đoán lâm sàng"*.
2. **Thiết kế đối chứng cân bằng thứ tự (Counterbalanced AB/BA):**
   - **Nhóm phương pháp A (`Checklist-Only`):** Phiếu kiểm tra WHO/CDC/BYT dạng bảng truyền thống.
   - **Nhóm phương pháp B (`Checklist + AI Vision + 3D`):** Quy trình 7 bước SafeHome3DAI (`/workflow`) sử dụng mô hình phòng, gợi ý bounding box có người xác nhận và mô phỏng Before–After.
   - Mỗi người tham gia thực hiện trên **2 tình huống tương đương nhưng khác phòng** (ví dụ: Phòng ngủ #1 bằng A rồi Phòng ngủ #2 bằng B; người kế tiếp đảo ngược thứ tự B -> A trên 2 tình huống đối chứng) để loại bỏ hiệu ứng học thuộc lòng (learning effect).
3. **Ground Truth độc lập:**
   - Gán nhãn chuẩn cho từng tình huống bởi điều dưỡng / chuyên gia phục hồi chức năng hoặc 2 người thẩm định độc lập theo bộ quy tắc `RISK-001..008` ([B03_ANNOTATION_GUIDELINE.md](B03_ANNOTATION_GUIDELINE.md)), tách riêng các mục `not_assessable` (không quy về âm tính).
4. **Quyền riêng tư & Consent:**
   - Bắt buộc ký phiếu đồng ý ([B02_CONSENT_TEMPLATE.md](B02_CONSENT_TEMPLATE.md)) trước khi thu thập; dữ liệu xuất ra phân tích được ẩn danh (`participant_id` giả danh, không chứa họ tên, số điện thoại, ảnh mặt hay địa chỉ).

---

## 2. Tách 4 Bài toán & Chỉ số Đo riêng biệt
| Bài toán | Chỉ số thu thập | Công cụ tính toán |
| :--- | :--- | :--- |
| **1. Object Detection** | Precision, Recall, F1, mAP@50 theo từng lớp | Chạy qua `scripts/ml/eval_baseline.py` trên locked test set (B03/B05) |
| **2. Hazard Screening** | Precision, Recall, F1 theo từng `RISK-001..008`, Confusion Matrix, tỷ lệ `abstain / not_assessable`, Paired difference (B - A) | `scripts/evaluation/b11_experiment_analysis.py` (`compute_confusion_and_metrics`, Bootstrap CI 1000 lần) |
| **3. 3D Measurement MAE (cm)** | Sai số tuyệt đối trung bình `MAE (cm)` theo cặp điểm tham chiếu định nghĩa sẵn (chiều rộng lối đi, mặt nệm giường, bậc cửa) đo bằng thước laser | `compute_mae_cm()` — chỉ tính khi có cặp đo thực (`nPairs > 0`) |
| **4. Usability & Outcomes** | Thời gian hoàn thành (giây), tỷ lệ chọn đúng biện pháp ưu tiên, agreement với chuyên gia, **SUS 10 câu** (`0–100`) | `compute_sus_score()` — chỉ tính khi đủ 10 mục Likert hợp lệ trên mẫu người thật |

---

## 3. Hạn chế, Yếu tố Nhiễu (Confounders) & Cách Đọc Báo Cáo
- **Sai số camera / tái dựng 3D:** Ảnh chụp khác tiêu cự, góc rộng hoặc thiếu góc phòng làm tăng sai số ước lượng nếu không có bước nhập số đo thật bằng thước dây/laser.
- **Thiên lệch chọn mẫu (Selection Bias):** Tình nguyện viên quen dùng smartphone có thể hoàn thành nhanh hơn người cao tuổi ít tiếp xúc công nghệ -> cần phân tầng tuổi/người chăm sóc khi báo cáo.
- **Bất đồng chuyên gia (Expert Disagreement):** Một số tình huống biên (ánh sáng chuyển tiếp, vật cản bán cố định) có thể khác đánh giá giữa các chuyên gia -> ghi lại hệ số đồng thuận (`kappa` / `% agreement`) trong log kiểm định.
- **Cảnh báo cỡ mẫu thăm dò:** Mọi chỉ số có `n < 20` đều bị script gắn cờ `exploratoryWarning: true` kèm khoảng tin cậy Bootstrap 95%.

---

## 4. Lệnh chạy & Kiểm chứng tái lập
```powershell
python scripts/evaluation/b11_experiment_analysis.py
```
Kết quả hiện tại xuất ra `reports/b11_evaluation_summary.json` với `status: "blocked_awaiting_field_data"`, `participantsWithSus: 0`, `maeCm: null`, đảm bảo trung thực 100%.
