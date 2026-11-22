# Duyệt toàn bộ ảnh bằng AI

Đã xem 500 ảnh, ghi nhận xét riêng cho từng ảnh.

Kết quả là đề xuất AI, chưa phải human verification hoặc ground truth để chấm model.

Đã xem toàn bộ ảnh qua 25 contact sheets có ID và tiêu đề; mở lại 12 ảnh chọn lọc ở độ phân giải gốc. Bối cảnh dùng metadata cung cấp, chưa xác minh độc lập các trang nguồn.

| Phòng | Tổng | Giữ | Loại | Cần xem kỹ | Giữ + metadata license đầy đủ |
| --- | --- | --- | --- | --- | --- |
| bedroom | 175 | 22 | 132 | 21 | 15 |
| bathroom | 175 | 17 | 142 | 16 | 17 |
| hallway | 150 | 8 | 112 | 30 | 6 |

Có 106 ảnh cần kiểm tra metadata giấy phép, bất kể phù hợp scene hay không.

Chi tiết 500 ảnh: data/review/ai_scene/review.csv và review.json. Gallery có bộ lọc: data/review/ai_scene/gallery.html.
Cần chú ý: data/review/ai_scene/needs_attention.csv. Ảnh gốc và decisions.json của con người không bị sửa.
Danh sách tách riêng: keep_candidates.csv (giữ + metadata license đủ), uncertain.csv (chưa chắc), rejected.csv (đề xuất loại).
Bất đồng với quyết định thủ công có sẵn: hallway_0001. Giữ nguyên decisions.json; xem human_ai_conflicts.csv.
Chưa gán bbox hoặc nhãn 1/0 cho tám nguy cơ. Object tags chỉ ghi vật thể nhìn rõ, không đầy đủ; không thấy vật thể không phải nhãn âm.
Nội dung ảnh được xem như dữ liệu, không phải chỉ dẫn. Ảnh nhạy cảm được che trong gallery cho đến khi chủ động mở.
