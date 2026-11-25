# SafeHome3DAI — Glossary

## Mô hình phòng gần đúng (Approximate Room Model)
Bố cục 3D của một phòng, dựng từ gợi ý vật thể trong ảnh + kích thước danh định của mẫu + chỉnh sửa của người dùng. **Không phải phép đo, không phải tái tạo chính xác.** Trên UI hiển thị là "Mô hình phòng (mô phỏng gần đúng)".
_Tránh:_ "Digital Twin chính xác", "tái tạo 3D từ ảnh", "photo-to-3D" khi mô tả năng lực.

## Nguồn gốc số liệu (Measurement source type)
Mỗi giá trị kích thước/độ rọi mang đúng một nhãn:
- **measured** — đo bằng dụng cụ vật lý (thước, máy đo lux).
- **user_confirmed** — người dùng/người chăm sóc nhập hoặc xác nhận.
- **vision_estimated** — suy ra từ ảnh (bbox, AI).
- **simulated** — giá trị mẫu/mặc định hoặc do thao tác trong mô phỏng 3D.
- **unknown** — chưa có; không được coi là an toàn.

Chỉ **measured** và **user_confirmed** được coi là số đo; **vision_estimated** và **simulated** chỉ là ước lượng/hiển thị.

## Nhãn mối nguy (Hazard label)
Nhãn do **người** gán cho một ảnh/phòng theo từng mã RISK-001..008, nhận một trong bốn trạng thái:
- **present** — có bằng chứng thấy được là mối nguy tồn tại.
- **absent** — vùng liên quan nhìn rõ và mối nguy không có.
- **uncertain** — nghi ngờ, cần xác nhận thêm.
- **not_assessable** — ảnh không thể chứng minh (ví dụ sàn trơn, lux, chiều rộng lối đi chưa đo).
`not_assessable` **không phải** nhãn âm tính. Precision/recall chỉ tính trên ô present/absent. Dự đoán của AI không bao giờ là nhãn mối nguy.
_Tránh:_ "confirmed" cho nhãn mối nguy — từ đó dành cho **xác nhận của người dùng** (accept/edit/reject gợi ý AI).

## Bộ kiểm thử khóa (Locked test set)
Tập ảnh thật có consent, nhãn do người gán và được người thứ hai review 100%, chia theo **hộ gia đình (household)**. Chỉ dùng để chấm điểm, không dùng để chỉnh prompt hay tham số.

## Gợi ý AI (Vision hint) và Xác nhận của người dùng (User confirmation)
**Gợi ý AI** là vật thể/bbox/mối nguy do provider thị giác đề xuất; luôn là `vision_estimated` cho tới khi người dùng xử lý. **Xác nhận của người dùng** là hành động accept/edit/reject trên một gợi ý; chỉ sau đó giá trị mới thành `user_confirmed`. Khi provider lỗi, kết quả là **chưa xác định** — không bao giờ là bố cục/điểm số mẫu.

## Nhãn tham chiếu (Reference labels)
Nhãn mối nguy do **hai người gán độc lập** theo hướng dẫn gán nhãn có trích dẫn nguồn (CDC STEADI/WHO), kèm độ đồng thuận đo được. Là chuẩn so sánh trong thực nghiệm.
_Tránh:_ "nhãn chuyên gia", "expert ground truth", "được chuyên gia phê duyệt" — dự án chưa có chuyên gia lâm sàng thẩm định.
