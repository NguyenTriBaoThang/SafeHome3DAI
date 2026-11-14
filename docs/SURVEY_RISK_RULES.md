# Quy Tắc Sàng Lọc Mối Nguy Môi Trường — Environmental Hazard Screening Rules

Tài liệu này định nghĩa hệ thống 8 quy tắc sàng lọc nguy cơ môi trường minh bạch, có thể giải trình (`src/lib/survey/screeningEngine.ts`).

---

## 1. Triết Lý & Ranh Giới An Toàn

1. **Sàng lọc vận hành, không phải chẩn đoán y tế**: Hệ thống phân loại vấn đề thành các mức độ ưu tiên xử lý thực tế:
   - `Cần ưu tiên kiểm tra` (`CAN_UU_TIEN_KIEM_TRA`): Yếu tố rủi ro trực tiếp, nguy hiểm hiển hiện.
   - `Nên xem xét cải thiện` (`NEN_XEM_XET_CAI_THIEN`): Khuyến nghị nâng cấp theo tiêu chuẩn an toàn cho người già.
   - `Cần thêm thông tin` (`CAN_THEM_THONG_TIN`): Dữ liệu chưa đủ rõ để kết luận.
2. **Không bịa đặt xác suất ngã**: Hệ thống tuyệt đối không đưa ra các con số tùy tiện như "70% nguy cơ ngã" hay "85% sẽ gặp tai nạn".
3. **Mỗi phát hiện đều gắn liền với bằng chứng dẫn chiếu**: Liên kết trực tiếp với các tài liệu chuẩn của WHO, CDC STEADI và Bộ Y tế Việt Nam.

---

## 2. Chi Tiết 8 Quy Tắc Sàng Lọc

### RULE_BED_001: Thảm trải sàn phòng ngủ chưa cố định chống trượt
- **Điều kiện**: `BED_006 == YES` VÀ `BED_007 == NO`
- **Mức ưu tiên**: `Cần ưu tiên kiểm tra`
- **Cơ chế nguy cơ**: Thảm xô lệch, quăn mép hoặc trượt trên nền đá hoa/gỗ bóng là nguyên nhân gây trượt chân phổ biến nhất khi người già đi lại vào ban đêm.
- **Biện pháp khắc phục**: Cố định mép thảm bằng băng dính chuyên dụng chịu lực hoặc sử dụng miếng lót cao su chống trượt bám chặt sàn.
- **Nguồn dẫn**: `SRC_WHO_2021`, `SRC_CDC_STEADI_2023`.

### RULE_BED_002: Dây điện vắt ngang lối đi phòng ngủ
- **Điều kiện**: `BED_008 == YES`
- **Mức ưu tiên**: `Cần ưu tiên kiểm tra`
- **Cơ chế nguy cơ**: Dây điện tạo thành bẫy vướng chân, đặc biệt nguy hiểm khi người cao tuổi giảm phản xạ nhấc bàn chân khi bước.
- **Biện pháp khắc phục**: Luồn dây vào ống nẹp cố định sát chân tường hoặc di chuyển thiết bị gần ổ cắm.
- **Nguồn dẫn**: `SRC_CDC_STEADI_2023`.

### RULE_BED_003: Lối đi từ giường đến cửa bị cản trở bởi đồ đạc
- **Điều kiện**: `BED_009 == YES`
- **Mức ưu tiên**: `Cần ưu tiên kiểm tra`
- **Cơ chế nguy cơ**: Bàn ghế, đôn ghế hoặc hộp đồ làm thu hẹp hành lang di chuyển dưới mức thông thủy chuẩn (80 - 90 cm).
- **Biện pháp khắc phục**: Kê dọn lại đồ đạc, đảm bảo lối đi thẳng và rộng rãi từ giường ngủ ra cửa.
- **Nguồn dẫn**: `SRC_CDC_STEADI_2023`.

### RULE_BED_004: Ánh sáng ban đêm từ giường đến cửa không đảm bảo
- **Điều kiện**: `BED_004 == NO` HOẶC `BED_005 == NO`
- **Mức ưu tiên**: `Cần ưu tiên kiểm tra`
- **Cơ chế nguy cơ**: Mắt người già cần ánh sáng gấp 3-4 lần để định hướng trong đêm; bóng tối khiến người già dễ bước hụt hoặc va quệt.
- **Biện pháp khắc phục**: Bổ sung đèn ngủ cảm ứng chuyển động (30 - 50 lux) hoặc đèn đầu giường trong tầm tay với.
- **Nguồn dẫn**: `SRC_WHO_2021`, `SRC_BYT_VN_2020`.

### RULE_BATH_001: Sàn nhà vệ sinh trơn trượt hoặc thường xuyên đọng nước
- **Điều kiện**: `BATH_003 == YES` HOẶC `BATH_004 == YES`
- **Mức ưu tiên**: `Cần ưu tiên kiểm tra`
- **Cơ chế nguy cơ**: Sự kết hợp giữa nước, bọt xà phòng và bề mặt gạch men làm suy giảm trầm trọng ma sát động, gây ra các ca ngã chấn thương nặng nhất tại nhà.
- **Biện pháp khắc phục**: Trang bị thảm cao su chống trượt có giác hút, phủ dung dịch tăng ma sát sàn gạch, khơi thông phễu thoát sàn.
- **Nguồn dẫn**: `SRC_WHO_2021`, `SRC_BYT_VN_2020`.

### RULE_BATH_002: Chưa có thanh tay vịn hoặc tay vịn chưa kiểm tra chắc chắn
- **Điều kiện**: `BATH_005 == NO` HOẶC `BATH_007 == NOT_CHECKED`
- **Mức ưu tiên**: `Nên xem xét cải thiện`
- **Cơ chế nguy cơ**: Người già thiếu điểm tì tựa an toàn khi chuyển đổi tư thế đứng - ngồi tại bồn cầu hoặc khi bước qua sàn ướt buồng tắm.
- **Biện pháp khắc phục**: Bắt vít thanh tay vịn inox phi 32-38mm vào tường gạch/bê tông (chịu tải tối thiểu 110-150 kg).
- **Nguồn dẫn**: `SRC_WHO_2021`, `SRC_BYT_VN_2020`.

### RULE_BATH_003: Ánh sáng nhà vệ sinh chưa đủ sáng
- **Điều kiện**: `BATH_008 == NO`
- **Mức ưu tiên**: `Nên xem xét cải thiện`
- **Cơ chế nguy cơ**: Thiếu sáng khiến người cao tuổi không nhìn thấy các vệt nước đọng trên sàn hoặc không định vị chính xác vị trí đồ dùng.
- **Biện pháp khắc phục**: Lắp đèn LED chống ẩm phân bổ đều đạt độ rọi tối thiểu 150-200 lux.
- **Nguồn dẫn**: `SRC_WHO_2021`.

### RULE_BATH_004: Có bậc thềm cao hoặc vật cản tại lối vào nhà vệ sinh
- **Điều kiện**: `BATH_009 == YES` HOẶC `BATH_010 == YES`
- **Mức ưu tiên**: `Nên xem xét cải thiện`
- **Cơ chế nguy cơ**: Bậc thềm chênh cao dễ gây vấp ngón chân khi bước vào nhà vệ sinh.
- **Biện pháp khắc phục**: Lắp gờ dốc thoải (ramp) cao su và dán băng keo phản quang màu tương phản cảnh báo mép bậc.
- **Nguồn dẫn**: `SRC_CDC_STEADI_2023`, `SRC_BYT_VN_2020`.

