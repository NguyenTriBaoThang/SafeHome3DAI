# Đánh Giá Hiệu Năng Mô Hình Thị Giác (Vision Evaluation & Academic Metrics)

Tài liệu này trình bày khung đo lường độ chính xác và an toàn của hệ thống phân tích hình ảnh **SafeHome Vision Intelligence** dựa trên các tiêu chuẩn thị giác máy tính quốc tế (COCO mAP, Precision, Recall, F1-Score).

---

## 1. Ma Trận Đánh Giá Theo Nhóm Thực Thể (Taxonomy Performance Matrix)

Trong ngữ cảnh an toàn cho người cao tuổi, **độ nhạy (Recall)** đối với các vật cản gây té ngã (thảm trượt, dây điện, thiếu tay vịn) được ưu tiên cao hơn độ chuẩn xác thuần túy (Precision), bởi vì việc bỏ sót một mối nguy (False Negative) có thể dẫn đến hậu quả té ngã thực tế.

| Nhóm Đối Tượng | Metric Mục Tiêu (IoU @ 0.5) | Mức Độ Ưu Tiên | Biện Pháp Kiểm Soát Dương Tính Giả (False Positive Mitigation) |
|---|---|---|---|
| `bed`, `chair`, `toilet` | mAP > 0.88 | Tiêu Chuẩn | Dễ nhận diện, thuật toán heuristic phân loại chính xác |
| `rug` (Thảm trải sàn) | Recall > 0.95 | Rất Cao | Mọi phát hiện thảm đều kích hoạt câu hỏi làm rõ về lớp đế chống trượt |
| `electrical_cable` (Dây điện) | Recall > 0.90 | Cực Kỳ Cao | Lọc hình thái học phân biệt đường ron gạch và dây cáp sàn |
| `grab_bar` (Thanh tay vịn) | Precision > 0.85 | Cao | Yêu cầu người dùng xác nhận loại trừ giá treo khăn thông thường |
| `threshold_step` (Gờ cửa) | Recall > 0.85 | Cao | Đánh dấu nghi vấn để khảo sát bổ sung số đo độ cao gờ |

---

## 2. Xử Lý Tính Bất Định (Uncertainty Handling)

Hệ thống phân định 3 cấp độ tin cậy:
- **Độ tin cậy cao (`confidence >= 0.85`)**: Hiển thị hộp viền xanh lá, đề xuất xác nhận nhanh.
- **Độ tin cậy trung bình (`0.60 <= confidence < 0.85`)**: Hiển thị hộp viền vàng, khuyến nghị người dùng kiểm tra kỹ.
- **Độ tin cậy thấp (`confidence < 0.60`)**: Không tự động công bố là sự thật; chuyển thành quan sát diện nghi vấn (`SPATIAL_UNCERTAINTY`) và đặt câu hỏi gợi ý cho người dùng.

---

## 3. Khung Đánh Giá Khoa Học Định Kỳ (Evaluation Protocol)
1. **Tập dữ liệu thử nghiệm chuẩn hóa (Golden Benchmark Dataset)**: Bao gồm 200 bức ảnh phòng ngủ và phòng tắm của người cao tuổi với nhãn ground-truth được bác sĩ lão khoa và kỹ sư an toàn gắn nhãn độc lập.
2. **Kiểm tra hồi quy liên tục (Regression Testing)**: Bộ kiểm thử `tests/visionEngine.test.ts` và `tests/visionIntegration.test.ts` tự động kiểm tra tính chính xác của việc chuẩn hóa tọa độ, loại bỏ EXIF, và tính toàn vẹn của dữ liệu sau khi ánh xạ.

