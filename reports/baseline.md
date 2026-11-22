# Baseline Gemini hiện tại — Giai đoạn 3

Trạng thái: **blocked**. UTC: 2026-11-22T01:51:56.420454+00:00.

**Chưa đánh giá được.** Không chạy inference và không tạo metric giả.

- Chưa có ảnh human_scene_verified=true và đủ metadata giấy phép.
- Chưa có snapshot chia tập theo nhóm đóng băng từ Giai đoạn 2.
- Chưa có bundle nhãn verified nhập từ xác nhận thủ công trong Label Studio.

## Phương pháp

Dùng đúng Gemini room adapter và hàm risk của UI đã tách ra để dùng chung; không dùng pipeline tiền gán Giai đoạn 2 làm baseline. Không nhận dữ liệu mẫu/fallback là inference thật. Hallway chưa được hàm risk UI hỗ trợ: dự đoán risk unknown.

AP50 dùng IoU 0.5, 101 điểm nội suy recall, maxDets=100 mỗi ảnh/lớp, all-area không crowd/ignore. mAP chỉ trung bình các lớp có GT dương, ghi rõ số lớp. Precision/recall object tại ngưỡng confidence đã ghi trong cấu hình. Đây là triển khai bbox chuẩn hóa theo quy ước, không phải chạy toàn bộ COCO API.

Risk chỉ tính GT verified 1/0 và applicable=true. GT unknown/nonapplicable loại khỏi mẫu số. Dự đoán unknown/lỗi là abstention, không phải nhãn 0: precision chỉ tính dự đoán dương, recall tính trên toàn bộ GT dương (abstain dương là bỏ sót), F1=2TP/(2TP+FP+FN+abstain_dương). Coverage và confusion tách abstention dương/âm. Inference lỗi không tạo GT âm; object GT vẫn là đối tượng bị bỏ sót khi không có prediction.

CI 95% percentile bootstrap theo nhóm nguồn/nhà; lưu seed, số vòng và số replicate hợp lệ. Không đủ hai nhóm thì CI unavailable. Lớp <20 mẫu dương có cảnh báo. CI của replicate không xác định không được thay bằng 0.

## Kết luận và giới hạn

Chưa có metric hợp lệ thì chưa kết luận Gemini yếu ở nguy cơ nào. Sau khi có dữ liệu, đọc recall/HIGH recall cùng số mẫu/CI và xem baseline_errors.html; không dùng test để chỉnh prompt/hyperparameter.

Giới hạn từ code: confidence adapter bị clamp 0.5–0.99; UI dùng giá trị mặc định cho nhiều thuộc tính và normalization có thể bỏ qua một số trường nested. Luật có thể cho kết luận định lượng không được ảnh chứng minh. Đây là đặc tính baseline cần phơi bày, chưa chỉnh ngưỡng/logic để nâng điểm. RISK-003/004/005/007/008 cần đo/khảo sát ngoài ảnh đơn để có GT binary; unknown là kết quả hợp lệ.

Confusion chi tiết: baseline_confusion.csv; ví dụ ảnh/GT/prediction: baseline_errors.html (tham chiếu ảnh local, không copy/commit ảnh). Cấu hình và số vòng bootstrap trong baseline.json. Nếu có lỗi inference, báo cáo trạng thái incomplete, không loại ảnh lỗi để làm đẹp metric.

**Dừng Giai đoạn 3; không train hoặc tự chuyển Giai đoạn 4.**
