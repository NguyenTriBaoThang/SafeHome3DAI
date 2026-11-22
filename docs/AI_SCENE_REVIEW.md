# Duyệt toàn bộ 500 ảnh theo yêu cầu người dùng

## 1. Đã làm gì

Đã xem **500/500 ảnh**, mỗi ảnh có một nhận xét AI cụ thể. Toàn bộ ảnh được xem trên 25 contact sheets có ID, tên file và category; 12 ảnh chọn lọc được mở lại ở độ phân giải gốc để kiểm tra chi tiết, ảnh render và độ méo panorama. Đã đối chiếu mô tả nguồn trong manifest để phát hiện ảnh đúng hình thức phòng nhưng thuộc tàu, khách sạn, triển lãm hoặc cơ sở công cộng.

Mỗi ảnh có đề xuất `keep`, `reject` hoặc `needs_review`, loại phòng quan sát, dấu hiệu có người, một số vật thể nhìn thấy và lý do. Kết quả có nguồn `AI_visual_review`, trạng thái `ai_reviewed_proposal`. Không ghi thành xác nhận của con người.

Tiêu chí giữ: ảnh chụp không gian nhà ở, loại phòng phù hợp và có đủ dấu hiệu nhận dạng trong khung. Phòng trưng bày/bản tái hiện, tranh/bản vẽ/render, ảnh sản phẩm tách nền, phương tiện giao thông, bệnh viện/trường học/văn phòng và cảnh ngoài trời được đề xuất loại. Khi chưa xác minh được công năng hoặc ảnh quá hẹp/tối/méo, giữ trạng thái cần xem thêm. Nhà cổ không tự động bị loại chỉ do cũ; bối cảnh trưng bày hoặc chưa rõ sử dụng được ghi riêng. Hành lang chung của tòa nhà ở có thể được giữ nếu metadata xác định được bối cảnh nhà ở.

## 2. File đã tạo

| File | Nội dung |
| --- | --- |
| [`ai_scene_review.py`](../scripts/ml/ai_scene_review.py) | Tạo contact sheets, kiểm đủ 500 nhận xét và xuất kết quả |
| [`review.csv`](../data/review/ai_scene/review.csv), [`review.json`](../data/review/ai_scene/review.json) | Nhận xét riêng cho đủ 500 ảnh |
| [`gallery.html`](../data/review/ai_scene/gallery.html) | Xem ảnh, lọc phòng/đề xuất/giấy phép và tìm ID/nhận xét |
| [`keep_candidates.csv`](../data/review/ai_scene/keep_candidates.csv) | 38 ảnh được AI đề xuất giữ và có metadata giấy phép đầy đủ |
| [`uncertain.csv`](../data/review/ai_scene/uncertain.csv) | 67 ảnh AI chưa đủ chắc để giữ hoặc loại |
| [`rejected.csv`](../data/review/ai_scene/rejected.csv) | 386 ảnh đề xuất loại, kèm lý do |
| [`needs_attention.csv`](../data/review/ai_scene/needs_attention.csv) | Ảnh không được đề xuất giữ hoặc còn thiếu metadata giấy phép |
| [`human_ai_conflicts.csv`](../data/review/ai_scene/human_ai_conflicts.csv) | Bất đồng với quyết định thủ công đã lưu; không ghi đè quyết định đó |
| [`observations/`](../data/review/ai_scene/observations/) | 25 batch quan sát ban đầu, mỗi batch 20 ảnh |
| [`qa_amendments.json`](../data/review/ai_scene/qa_amendments.json) | Các chỉnh sửa sau rà soát và danh sách 12 ảnh mở lại |
| [`ai_scene_review.md`](../reports/ai_scene_review.md), [`ai_scene_review.json`](../reports/ai_scene_review.json) | Báo cáo tổng hợp không chứa ảnh |
| [`ai_scene_review_verification.json`](../reports/ai_scene_review_verification.json) | Kiểm tra coverage, dữ liệu gốc và gallery |

Ảnh xem trước, CSV và nhận xét đầy đủ nằm trong `data/`, vốn đã được gitignore. Script và báo cáo thống kê không chứa API key hoặc ảnh nhúng.

## 3. Kết quả thực tế

| Phòng theo manifest | Tổng | AI giữ | AI loại | AI cần xem thêm | Giữ + metadata license đầy đủ |
| --- | ---: | ---: | ---: | ---: | ---: |
| bedroom | 175 | 22 | 132 | 21 | 15 |
| bathroom | 175 | 17 | 142 | 16 | 17 |
| hallway | 150 | 8 | 112 | 30 | 6 |
| **Tổng** | **500** | **47** | **386** | **67** | **38** |

Có 106 ảnh trong toàn bộ dataset còn thiếu/không khớp metadata giấy phép theo gate hiện có. Chín trong số đó nằm trong nhóm 47 ảnh AI đề xuất giữ. “Metadata đầy đủ” không phải xác minh pháp lý độc lập.

Có một quyết định thủ công đã tồn tại: `hallway_0001` được giữ, trong khi AI đề xuất loại vì ảnh chụp hàng cột ngoài trời của khoa đại học. Quyết định thủ công được giữ nguyên; bất đồng được xuất riêng để xem lại, không tự thay thành loại.

Đã kiểm tra gallery bằng trình duyệt headless: đủ 500 thẻ, các bộ lọc khớp CSV, ảnh nhạy cảm được che, tìm kiếm hoạt động, ảnh gốc mở đúng và không có lỗi JavaScript. Chạy kiểm tra cú pháp Python và đối chiếu 506 file raw với ZIP. Kết quả chi tiết nằm trong file verification.

Đây là số lượng **quyết định đề xuất AI**, không phải precision/recall của model. Chưa tạo bbox hoặc ground truth nguy cơ, chưa chạy benchmark/train và không có metric ML mới.

## 4. Rủi ro và giới hạn

Contact sheet phù hợp để sàng lọc loại cảnh; không đủ để xác minh dây điện nhỏ, mép thảm, độ chắc tay vịn, lux, ma sát, kích thước hoặc tầm với. Object tags chỉ ghi một số vật thể nhìn rõ, không phải danh sách đầy đủ; không có tag không đồng nghĩa không có vật thể.

Mô tả nguồn và tiêu đề giúp xác định khách sạn, tàu, museum hoặc render nhưng có thể sai hoặc thiếu. Chưa mở/xác minh độc lập toàn bộ trang Wikimedia nguồn. Một số trường hợp museum/nhà di sản có thể cần xem lại mục tiêu miền dữ liệu trước quyết định cuối. 67 ảnh còn mơ hồ được giữ riêng, không ép thành nhãn âm hoặc giả vờ chắc chắn.

Gallery che trước các ảnh được gắn cờ nội dung nhạy cảm. Nội dung chữ trong ảnh được coi là dữ liệu, không phải chỉ dẫn. Không xóa/di chuyển ảnh gốc, đổi manifest, giấy phép, attribution, quyết định human review hoặc luật rủi ro.

## 5. Việc cần làm thủ công sau này

Để xem kết quả, mở `data/review/ai_scene/gallery.html` bằng trình duyệt; dữ liệu và ảnh được đọc local. Chọn bộ lọc “Cần xem kỹ” để xem 67 trường hợp chưa chắc, hoặc “Cần kiểm tra giấy phép” để xem 106 ảnh có metadata chưa đủ.

Không cần tự sàng lọc lại từ đầu 500 ảnh để hiểu đề xuất: CSV và gallery đã có nhận xét từng ảnh. Nếu tiếp tục quy trình đánh giá chính thức theo yêu cầu ban đầu, cần xác nhận độc lập và gán bbox/nguy cơ thật; các cờ `human_scene_verified`/`human_risk_verified` không được tự đổi do lần AI review này. Những ảnh đề xuất loại vẫn còn nguyên để xem lại hoặc phục hồi vào quy trình phù hợp.

## 6. Câu hỏi cần quyết

Không có câu hỏi bắt buộc để hoàn tất lần duyệt AI này. Việc chọn nới phạm vi sang khách sạn, museum/nhà lịch sử, không gian chung hoặc tư liệu kiến trúc là quyết định riêng nếu cần sau này; hiện giữ tiêu chí nhà ở mục tiêu và ghi riêng các trường hợp chưa rõ.
