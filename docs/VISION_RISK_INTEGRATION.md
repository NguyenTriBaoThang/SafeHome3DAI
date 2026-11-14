# Tích Hợp Thị Giác Và Động Cơ Rủi Ro (Vision & Risk Assessment Integration)

Tài liệu này giải thích quy trình kích hoạt lại Động cơ Đánh giá Rủi ro 8 Quy Tắc (**8 Deterministic Hazard Rules**) khi có dữ liệu thị giác mới.

---

## 1. 8 Quy Tắc Rủi Ro Môi Trường Được Kích Hoạt

Khi các sự thật thị giác (`VisionRoomFact`) được xác nhận, chúng ảnh hưởng trực tiếp đến 8 quy tắc rủi ro sau:

1. **RUG_TRIP_HAZARD (Thảm trải sàn lỏng lẻo)**:
   - Kích hoạt khi: `has_rug == YES` và `rug_fixed == NO`.
   - Mức độ nghiêm trọng: `HIGH` (Nguy cơ ngã hàng đầu theo CDC STEADI).
2. **ELECTRICAL_CABLE_TRIP (Dây điện chắn ngang đường)**:
   - Kích hoạt khi: `cable_on_floor == YES`.
   - Mức độ nghiêm trọng: `HIGH` (Vướng chân khi di chuyển ban đêm).
3. **BATHROOM_NO_GRAB_BAR (Thiếu thanh tay vịn nhà tắm)**:
   - Kích hoạt khi: `has_grab_bar == NO`.
   - Mức độ nghiêm trọng: `CRITICAL` (Khu vực trơn trượt có tỷ lệ chấn thương gãy xương cao nhất).
4. **BATHROOM_SLIPPERY_FLOOR (Sàn nhà tắm trơn trượt)**:
   - Kích hoạt khi: `has_anti_slip_mat == NO`.
5. **BED_HEIGHT_INAPPROPRIATE (Chiều cao giường không phù hợp)**:
   - Kích hoạt khi độ cao mặt đệm gây khó khăn khi đặt chân vững trên sàn.
6. **NIGHT_LIGHTING_POOR (Chiếu sáng ban đêm kém)**:
   - Lưu ý an toàn y tế: AI Vision từ ảnh chụp ban ngày **không bao giờ** khẳng định đèn đêm đủ hay thiếu, mà luôn gắn cờ `SPATIAL_UNCERTAINTY` để khảo sát hoặc người dùng tự bổ sung.
7. **DOORWAY_OBSTACLE (Vật cản lối ra vào)**:
   - Kích hoạt khi có hộp đồ, đồ đạc chắn ngưỡng cửa hoặc góc mở cửa hẹp.
8. **CLEAR_WALKWAY_DEFICIT (Lối đi không đủ chiều rộng tối thiểu 80-90cm)**:
   - Kích hoạt khi khoảng cách giữa giường và tủ/tường bị thu hẹp bởi vật dụng nội thất thừa.

---

## 2. Tích Hợp Giải Thích Khoa Học Cùng AI Copilot RAG

Người dùng tại trang Thị giác AI có thể nhấn **"Giải thích bằng chứng Y khoa (RAG)"** cho từng mối nguy. Hệ thống sẽ truy xuất tài liệu chuẩn y khoa:
- **Tổ chức Y tế Thế giới (WHO 2021)**: Hướng dẫn phòng chống té ngã ở người lớn tuổi trong môi trường sinh hoạt gia đình.
- **Trung tâm Kiểm soát và Phòng ngừa Dịch bệnh Hoa Kỳ (CDC STEADI 2019)**: Thuật toán can thiệp môi trường sống và tiêu chuẩn lắp đặt tay vịn chịu tải 250 lbs (~113 kg).
- **Tiêu chuẩn Thiết kế Nhà ở Thích ứng ADA (2010)**.

