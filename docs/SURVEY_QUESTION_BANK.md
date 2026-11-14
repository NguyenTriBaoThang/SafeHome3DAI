# Ngân Hàng Câu Hỏi Khảo Sát — Survey Question Bank

Tài liệu này ghi lại toàn bộ ngân hàng câu hỏi định hình chuẩn hóa (Version 1.0.0) dành cho Phòng ngủ (`BEDROOM`) và Nhà vệ sinh (`BATHROOM`).

---

## 1. Phòng Ngủ (Bedroom Question Bank)

| Mã Câu Hỏi | Hạng Mục | Nội Dung Câu Hỏi | Loại Dữ Liệu | Điều Kiện Áp Dụng | Bắt Buộc | Nguồn Dẫn Chiếu |
|---|---|---|---|---|---|---|
| `BED_001` | `BASIC` | Phòng ngủ có chiều dài và chiều rộng khoảng bao nhiêu? | `DIMENSIONS` (m) | Luôn áp dụng | Không | Quy chuẩn nhà ở |
| `BED_002` | `BASIC` | Người cao tuổi có thường xuyên sử dụng phòng ngủ này không? | `YES_NO` | Luôn áp dụng | Có | - |
| `BED_003` | `BASIC` | Phòng ngủ có cửa sổ hoặc nguồn ánh sáng tự nhiên không? | `YES_NO` | Luôn áp dụng | Có | Tiêu chuẩn chiếu sáng |
| `BED_004` | `LIGHTING` | Ban đêm, lối đi từ giường đến cửa có đủ ánh sáng để quan sát không? | `YES_NO` | Luôn áp dụng | Có | `SRC_WHO_2021`, `SRC_BYT_VN_2020` |
| `BED_005` | `LIGHTING` | Có đèn ngủ hoặc đèn dễ bật ngay tầm tay khi thức dậy vào ban đêm không? | `YES_NO` | Luôn áp dụng | Có | `SRC_WHO_2021`, `SRC_CDC_STEADI_2023` |
| `BED_006` | `FLOOR` | Trong phòng ngủ có thảm trải sàn không? | `YES_NO` | Luôn áp dụng | Có | `SRC_WHO_2021`, `SRC_CDC_STEADI_2023` |
| `BED_007` | `FLOOR` | Thảm có được cố định chắc chắn để hạn chế trượt hoặc xô lệch không? | `YES_NO` | Khi `BED_006 = YES` | Có | `SRC_WHO_2021`, `SRC_CDC_STEADI_2023` |
| `BED_008` | `CABLE` | Có dây điện hoặc dây sạc nằm trên lối đi không? | `YES_NO` | Luôn áp dụng | Có | `SRC_CDC_STEADI_2023` |
| `BED_009` | `OBSTACLE` | Lối đi từ giường đến cửa có bị cản bởi đồ đạc không? | `YES_NO` | Luôn áp dụng | Có | `SRC_CDC_STEADI_2023` |
| `BED_010` | `OBSTACLE` | Những đồ vật nào đang cản lối đi trong phòng ngủ? | `MULTI_CHOICE` | Khi `BED_009 = YES` | Không | - |
| `BED_011` | `ACCESSIBILITY` | Người sử dụng có gặp khó khăn khi đứng lên hoặc ngồi xuống giường không? | `YES_NO` | Luôn áp dụng | Có | `SRC_BYT_VN_2020` |
| `BED_012` | `ACCESSIBILITY` | Có vật dụng thường xuyên sử dụng phải với cao hoặc di chuyển xa mới lấy được không? | `YES_NO` | Luôn áp dụng | Có | `SRC_CDC_STEADI_2023` |

---

## 2. Nhà Vệ Sinh (Bathroom Question Bank)

| Mã Câu Hỏi | Hạng Mục | Nội Dung Câu Hỏi | Loại Dữ Liệu | Điều Kiện Áp Dụng | Bắt Buộc | Nguồn Dẫn Chiếu |
|---|---|---|---|---|---|---|
| `BATH_001` | `BASIC` | Nhà vệ sinh có kích thước khoảng bao nhiêu? | `DIMENSIONS` (m) | Luôn áp dụng | Không | Quy chuẩn nhà ở |
| `BATH_002` | `BASIC` | Nhà vệ sinh có khu vực tắm riêng không? | `YES_NO` | Luôn áp dụng | Có | - |
| `BATH_003` | `FLOOR` | Sàn nhà vệ sinh có thường xuyên bị ướt hoặc đọng nước không? | `YES_NO` | Luôn áp dụng | Có | `SRC_WHO_2021`, `SRC_BYT_VN_2020` |
| `BATH_004` | `FLOOR` | Khi sàn ướt, người sử dụng có nhận thấy bề mặt dễ trơn trượt không? | `YES_NO` | Luôn áp dụng | Có | `SRC_BYT_VN_2020`, `SRC_CDC_STEADI_2023` |
| `BATH_005` | `GRAB_BAR` | Nhà vệ sinh có tay vịn hỗ trợ ở những vị trí cần thiết không? | `YES_NO` | Luôn áp dụng | Có | `SRC_WHO_2021`, `SRC_BYT_VN_2020` |
| `BATH_006` | `GRAB_BAR` | Tay vịn được bố trí ở những khu vực nào? | `SINGLE_CHOICE` | Khi `BATH_005 = YES` | Có | `SRC_WHO_2021`, `SRC_BYT_VN_2020` |
| `BATH_007` | `GRAB_BAR` | Tay vịn đã được kiểm tra độ chắc chắn hoặc lắp đặt phù hợp chưa? | `SINGLE_CHOICE` | Khi `BATH_005 = YES` | Có | `SRC_WHO_2021` |
| `BATH_008` | `LIGHTING` | Ánh sáng trong nhà vệ sinh có đủ để quan sát rõ lối đi và khu vực sử dụng không? | `YES_NO` | Luôn áp dụng | Có | `SRC_WHO_2021` |
| `BATH_009` | `OBSTACLE` | Có đồ vật hoặc vật dụng gây cản trở khi ra vào nhà vệ sinh không? | `YES_NO` | Luôn áp dụng | Có | - |
| `BATH_010` | `OBSTACLE` | Có bậc cao hoặc chênh lệch mặt sàn ở lối vào nhà vệ sinh không? | `YES_NO` | Luôn áp dụng | Có | `SRC_CDC_STEADI_2023`, `SRC_BYT_VN_2020` |
| `BATH_011` | `ACCESSIBILITY` | Người sử dụng có gặp khó khăn khi ra vào khu vực tắm hoặc sử dụng bồn cầu không? | `YES_NO` | Luôn áp dụng | Có | `SRC_BYT_VN_2020` |
| `BATH_012` | `ADDITIONAL` | Bạn có muốn bổ sung vấn đề hoặc ghi chú nào cần kiểm tra trong nhà vệ sinh không? | `TEXT` | Luôn áp dụng | Không | - |

---

## 3. Quy Ước Giá Trị Khuyết Thiếu & Tính Mở Rộng

- **Chấp nhận giá trị "Chưa rõ" (`UNKNOWN`)**: Toàn bộ các câu hỏi trắc nghiệm đều tích hợp tùy chọn "Chưa rõ" để tránh việc ép buộc người dùng đoán mò thông tin.
- **Dễ dàng mở rộng cho các phòng khác**: Cấu trúc câu hỏi định nghĩa chuẩn `SurveyQuestion` cho phép bổ sung ngân hàng câu hỏi Phòng khách (`LIVING_ROOM`), Bếp (`KITCHEN`) hoặc Cầu thang (`STAIRCASE`) mà không cần thay đổi logic động cơ xử lý.

