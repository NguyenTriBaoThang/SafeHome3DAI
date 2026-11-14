# ĐÁNH GIÁ CHẤT LƯỢNG & ĐỘ TIN CẬY (RISK EVALUATION & BENCHMARK)
## SafeHome Risk Intelligence — Thước Đo Tin Cậy & Khả Năng Mở Rộng

### 1. Tiêu Chí Đánh Giá Hệ Thống

SafeHome Risk Intelligence được đánh giá dựa trên 5 tiêu chuẩn nghiêm ngặt:

1. **Tính Xác Định & Tái Lặp (Determinism & Reproducibility)**:
   - 100% các kết luận về sự tồn tại của mối nguy được điều khiển bởi toán học và logic điều kiện xác định.
   - Khi cùng một hồ sơ phòng được nạp vào, hệ thống luôn trả về cùng một danh sách mối nguy, cùng mức ưu tiên và cùng điểm số an toàn.

2. **Tính Minh Bạch & Truy Xuất Nguồn Gốc (Traceability & Explainability)**:
   - Mỗi phát hiện đều có thể truy ngược về chính xác câu hỏi hiện trường hoặc tọa độ 3D đã kích hoạt nó qua trang `/risk-assessment/traceability`.
   - Mỗi mức độ ưu tiên đều có câu giải thích lý do cụ thể bằng tiếng Việt dễ hiểu.

3. **Tính An Toàn Y Tế (Medical Safety & Compliance)**:
   - Hệ thống không tuyên bố chẩn đoán y khoa, không đưa ra tiên lượng tỷ lệ phần trăm nguy cơ ngã mang tính ngụy tạo (ví dụ: không bao giờ nói "Người này có 75% khả năng ngã trong tuần tới").
   - Mọi phân loại rủi ro đều là mức độ ưu tiên kiểm tra môi trường nhà ở (Environmental Hazard Prioritization).

4. **Tính Thích Ứng Đa Nguồn (Multi-source Interoperability)**:
   - Hoạt động đồng thời và nhất quán với cả dữ liệu số từ khảo sát hiện trường (`RoomProfile`) và dữ liệu hình học 3D (`RoomState`).

5. **Hiệu Suất Thực Thi (Runtime Performance)**:
   - Thời gian thẩm định 8 quy tắc: `< 5ms`.
   - Thời gian tạo giải thích RAG ngoại tuyến: `< 10ms`.
   - Đảm bảo trải nghiệm tức thì trên giao diện người dùng mà không có hiện tượng giật lag.

