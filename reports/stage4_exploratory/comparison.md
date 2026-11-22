# Giai đoạn 4 — thăm dò với nhãn AI

**CHƯA PHẢI ĐỘ CHÍNH XÁC CHÍNH THỨC.**
Nhãn tham chiếu do Codex xem ảnh và ước lượng bbox trước khi xem dự đoán Gemini/OWLv2; chưa được con người xác nhận.
Chỉ số dưới đây là mức khớp với nhãn AI, có thể sai cả nhãn lẫn bbox. Không dùng để kết luận an toàn hay triển khai.

Trạng thái: exploratory_complete
Model: `gemini-3.5-flash-lite`; seed 20261122; temperature 0.1 (baseline giữ mặc định).
Ứng viên 38 ảnh/37 nhóm: train 27, val 6, test 5. Chỉ 3 exemplar train được gán nhãn; không huấn luyện.
17 lớp có tên được chấm; `other` không gán hết nên loại khỏi chấm, không coi là âm. Lớp không có support có AP=null.
RISK-003/004/005/007/008 giữ unknown. Unknown/N/A loại khỏi mẫu số nhị phân; lỗi inference vẫn tính bỏ sót.

Quy tắc chọn đã khóa trước inference: All eight predeclared experiments, same complete val membership; failures remain misses. Only zero-failure configurations eligible. If val has HIGH positives: HIGH recall, risk recall, risk F1, mAP50, risk precision. Otherwise: mAP50 only; HIGH/risk efficacy unassessed. Lexicographic ascending experiment id breaks exact ties. One locked winner on exploratory test once.

| Val | Trạng thái | Lỗi/6 | HIGH support | HIGH recall | Risk recall | Risk F1 | mAP50 AI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | incomplete | 6 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.0000 |
| structured | completed | 0 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.7822 |
| few_shot | completed | 0 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.6417 |
| per_risk | incomplete | 1 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.8210 |
| self_verify | incomplete | 1 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.8591 |
| structured_recall | completed | 0 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.7822 |
| owlv2 | completed | 0 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.4614 |
| owlv2_recall | completed | 0 | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | 0.5642 |

Cấu hình chọn: `structured`; cơ sở: objects_only_no_HIGH_positive_reference.
**Không có HIGH dương tính thì HIGH recall không xác định; chọn theo bbox không chứng minh phát hiện nguy cơ.**

## Test thăm dò — một lượt của cấu hình đã khóa

Trạng thái: completed; ảnh: 5; lỗi: 0; mAP50 so nhãn AI: 0.7092.
HIGH support: 0; HIGH recall: chưa đánh giá được.

Gemini invocations đã ghi cache: 98; OWLv2 invocations: 12. Số này gồm lời gọi lỗi, không phải số HTTP retry nội bộ SDK.
JSON mỗi cấu hình có AP/P/R theo lớp, P/R/F1 theo nguy cơ, support, group bootstrap CI95 (1.000 lần, mẫu rất nhỏ). Gallery lỗi HTML nằm cùng thư mục val/test; bbox tham chiếu màu xanh, dự đoán màu đỏ.
Dữ liệu gốc và quyết định duyệt của người dùng không bị ghi lại. Không tạo human_scene_verified/human_risk_verified, bundle verified hay khóa test chính thức.
Dừng ở Giai đoạn 4. Muốn benchmark chính thức cần ảnh đúng bối cảnh, nhãn và bbox do con người kiểm tra, cùng dữ liệu đo cho các nguy cơ chưa quan sát được.
