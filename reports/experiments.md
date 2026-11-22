# Giai đoạn 4 — so sánh trên validation

Trạng thái: blocked

Metric ML: chưa đánh giá được

Gemini invocations mới: 0; test invocations: 0 trong job validation.

Seed: 20261122. lexicographic: pooled HIGH recall, pooled risk recall, pooled risk F1, mAP50, pooled risk precision; id breaks exact ties

- Chưa có split theo nhóm đóng băng.
- Chưa có bundle nhãn human-verified.

| Thí nghiệm | Chiến lược | Ngưỡng bbox | Trạng thái | HIGH recall | Risk recall | Risk F1 | mAP50 | Risk precision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | baseline | 0.5 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |
| structured | combined | 0.5 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |
| few_shot | few_shot | 0.5 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |
| per_risk | per_risk | 0.5 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |
| self_verify | self_verify | 0.5 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |
| structured_recall | combined | 0.25 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |
| owlv2 | owlv2 | 0.3 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |
| owlv2_recall | owlv2 | 0.15 | chưa chạy | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được |

Cấu hình thắng: chưa chọn được

Unknown không được đổi thành âm. Lỗi inference vẫn giữ trong mẫu số. Ngưỡng trên chỉ lọc confidence vật thể, không sửa luật nguy cơ.
Mỗi JSON thí nghiệm chứa AP/P/R theo lớp, P/R/F1/HIGH recall theo nguy cơ, support và group bootstrap CI; gallery lỗi nằm cùng thư mục.
Few-shot dùng ảnh train đã verified; val không phân tích nhãn test, không gửi ảnh test cho model. Không đủ HIGH positives thì không chọn thắng.
OWLv2 cần dependency tùy chọn và weights chưa tải; chưa có benchmark thật để chứng minh hiệu quả.
