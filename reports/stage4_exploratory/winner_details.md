# Cấu hình được chọn — chỉ so với nhãn AI

**Chưa phải độ chính xác chính thức.** Nhãn và bbox AI có thể sai; không suy ra an toàn thực tế.
Val chọn `structured` theo objects_only_no_HIGH_positive_reference. Không có HIGH dương tính để đánh giá HIGH recall.

## val

mAP50 so nhãn AI: 0.7822; CI95 group bootstrap: [0.5000, 0.9626] (B=1000).
Lớp có đối tượng tham chiếu: 13; ảnh: 6.

| Lớp | Số đối tượng AI | AP50 AI | P | R | CI95 AP50 |
| --- | --- | --- | --- | --- | --- |
| bed | 2 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=911) |
| chair | 3 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=906) |
| table | 2 | 0.5050 | 1.0000 | 0.5000 | [0.0000, 1.0000] (B=906) |
| cabinet | 3 | 0.6634 | 1.0000 | 0.6667 | [0.0000, 1.0000] (B=978) |
| nightstand | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| door | 1 | 1.0000 | 0.5000 | 1.0000 | [1.0000, 1.0000] (B=679) |
| toilet | 1 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=681) |
| sink | 1 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=663) |
| bathtub | 2 | 0.0000 | 0.0000 | 0.0000 | [0.0000, 0.0000] (B=921) |
| sofa | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| rug | 2 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=906) |
| electrical_cable | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| grab_bar | 1 | 0.0000 | chưa đánh giá được | 0.0000 | [0.0000, 0.0000] (B=681) |
| obstacle_route | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| threshold_step | 1 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=660) |
| lamp | 2 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=906) |
| light_switch | 1 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=679) |

Lớp không có đối tượng tham chiếu giữ AP=null, không đổi thành 0. Mẫu quá nhỏ nên CI/bootstrap không chứng minh độ tổng quát.

## test

mAP50 so nhãn AI: 0.7092; CI95 group bootstrap: [0.4673, 1.0000] (B=1000).
Lớp có đối tượng tham chiếu: 8; ảnh: 5.

| Lớp | Số đối tượng AI | AP50 AI | P | R | CI95 AP50 |
| --- | --- | --- | --- | --- | --- |
| bed | 2 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=912) |
| chair | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| table | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| cabinet | 2 | 0.5050 | 1.0000 | 0.5000 | [0.0000, 1.0000] (B=921) |
| nightstand | 1 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=670) |
| door | 2 | 0.1683 | 0.3333 | 0.5000 | [0.0000, 1.0000] (B=920) |
| toilet | 1 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=666) |
| sink | 1 | 0.0000 | 0.0000 | 0.0000 | [0.0000, 0.0000] (B=699) |
| bathtub | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| sofa | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| rug | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| electrical_cable | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| grab_bar | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| obstacle_route | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| threshold_step | 0 | chưa đánh giá được | chưa đánh giá được | chưa đánh giá được | — |
| lamp | 1 | 1.0000 | 0.5000 | 1.0000 | [1.0000, 1.0000] (B=670) |
| light_switch | 2 | 1.0000 | 1.0000 | 1.0000 | [1.0000, 1.0000] (B=684) |

Lớp không có đối tượng tham chiếu giữ AP=null, không đổi thành 0. Mẫu quá nhỏ nên CI/bootstrap không chứng minh độ tổng quát.
