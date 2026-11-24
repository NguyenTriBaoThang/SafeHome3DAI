# Giai đoạn 5 — điều kiện fine-tune

Trạng thái: **blocked**.
Chưa huấn luyện; chưa có model fine-tune/ONNX hay số đo độ trễ. Không dùng điểm khớp nhãn AI như độ chính xác chính thức.

Ảnh scene đủ điều kiện do người duyệt: 1; ảnh train có nhãn verified: 0; val verified: 0.

- Missing official human-reviewed frozen split
- No object class reaches the declared verified train/val support minimums
- Need a human-verified Stage 4 validation result to establish whether object fine-tuning is justified; AI agreement is insufficient

## Thiếu dữ liệu detector

Mức tối thiểu trong plan là tiêu chí chuẩn bị kỹ thuật, không bảo đảm đủ dữ liệu về mặt thống kê; không phải ngưỡng y khoa.

| Lớp | Train bbox verified | Train ảnh dương | Val ảnh dương | Cần thêm bbox train | Cần thêm ảnh train | Đủ điều kiện |
| --- | --- | --- | --- | --- | --- | --- |
| bed | 0 | 0 | 0 | 50 | 20 | False |
| chair | 0 | 0 | 0 | 50 | 20 | False |
| table | 0 | 0 | 0 | 50 | 20 | False |
| cabinet | 0 | 0 | 0 | 50 | 20 | False |
| nightstand | 0 | 0 | 0 | 50 | 20 | False |
| door | 0 | 0 | 0 | 50 | 20 | False |
| toilet | 0 | 0 | 0 | 50 | 20 | False |
| sink | 0 | 0 | 0 | 50 | 20 | False |
| bathtub | 0 | 0 | 0 | 50 | 20 | False |
| sofa | 0 | 0 | 0 | 50 | 20 | False |
| rug | 0 | 0 | 0 | 50 | 20 | False |
| electrical_cable | 0 | 0 | 0 | 50 | 20 | False |
| grab_bar | 0 | 0 | 0 | 50 | 20 | False |
| obstacle_route | 0 | 0 | 0 | 50 | 20 | False |
| threshold_step | 0 | 0 | 0 | 50 | 20 | False |
| lamp | 0 | 0 | 0 | 50 | 20 | False |
| light_switch | 0 | 0 | 0 | 50 | 20 | False |
| other | 0 | 0 | 0 | 50 | 20 | False |

## Thiếu dữ liệu nguy cơ

Không xây hoặc huấn luyện classifier nguy cơ trong nhánh này. Chỉ đếm nhãn train verified; unknown/N/A không phải âm.

| Risk | Dương train verified | Âm | Unknown | Cần thêm ảnh dương để đạt 50 |
| --- | --- | --- | --- | --- |
| RISK-001 | 0 | 0 | 0 | 50 |
| RISK-002 | 0 | 0 | 0 | 50 |
| RISK-003 | 0 | 0 | 0 | 50 |
| RISK-004 | 0 | 0 | 0 | 50 |
| RISK-005 | 0 | 0 | 0 | 50 |
| RISK-006 | 0 | 0 | 0 | 50 |
| RISK-007 | 0 | 0 | 0 | 50 |
| RISK-008 | 0 | 0 | 0 | 50 |

Ảnh/nhóm test thăm dò Giai đoạn 4 tiếp tục được bảo vệ, không chuyển sang train/val. Đổi tập test hoặc huấn luyện trên test đã xem sẽ làm mất tính độc lập.
