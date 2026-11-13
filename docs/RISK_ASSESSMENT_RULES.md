# SafeHome 3D AI — Quy Tắc Đánh Giá Nguy Cơ Môi Trường (Risk Assessment Rules)

## 1. Triết lý thiết kế động cơ đánh giá
Động cơ đánh giá nguy cơ SafeHome 3D AI hoạt động dựa trên các nguyên lý:
1. **Toán học không gian xác định (Deterministic Spatial Geometry)**: Không dự đoán mơ hồ, mọi nguy cơ đều có bằng chứng đo đạc cụ thể (khoảng cách tính bằng mét, cường độ ánh sáng tính bằng Lux, trạng thái vật liệu).
2. **Khách quan và có thể tái lặp (Reproducible)**: Cùng một cấu hình phòng sẽ luôn sinh ra cùng một kết quả đánh giá.
3. **Phân cấp ưu tiên can thiệp (Review Priority)**: Phân thành Cao (High), Trung bình (Medium), Thấp (Low). Đây là mức độ ưu tiên khuyến nghị gia đình cần cải tạo, không phải xác suất y khoa cá nhân sẽ bị ngã.

---

## 2. Chi tiết 8 quy tắc hình học không gian

### Quy tắc 1: `RULE_RUG_01` — Thảm trải sàn không cố định mép
- **Đối tượng áp dụng**: Mọi vật thể có danh mục `RUG`.
- **Điều kiện kích hoạt**: `isLoose === true` HOẶC `!isFixed`, đồng thời vị trí thảm nằm trong hoặc cách biên hành lang đi lại (`WalkingZone`) dưới 0.3 mét.
- **Mức ưu tiên**: **CAO (HIGH)**.
- **Biện pháp khắc phục**: Cố định 4 cạnh thảm bằng băng dính 2 mặt chuyên dụng hoặc đặt tấm lót cao su chống trượt bên dưới.

### Quy tắc 2: `RULE_CABLE_02` — Dây điện vắt ngang lối đi
- **Đối tượng áp dụng**: Vật thể danh mục `CABLE`.
- **Điều kiện kích hoạt**: `!isFixed`, khoảng cách từ dây điện đến trục đường đi chính nhỏ hơn bán kính vùng quét an toàn.
- **Mức ưu tiên**: **CAO (HIGH)**.
- **Biện pháp khắc phục**: Luồn dây vào nẹp sàn cao su vát mép hoặc ghen nhựa sát chân tường.

### Quy tắc 3: `RULE_LIGHT_03` — Chiếu sáng không đạt chuẩn
- **Đối tượng áp dụng**: Toàn bộ không gian phòng (`lightingLevel`).
- **Điều kiện kích hoạt**:
  - Phòng ngủ: `lightingLevel < 100 Lux` (Ban ngày) hoặc `< 40 Lux` (Chế độ ban đêm).
  - Phòng tắm / Phòng khách: `lightingLevel < 150 Lux`.
- **Mức ưu tiên**: **CAO (nếu < 60 Lux)** / **TRUNG BÌNH (nếu 60-149 Lux)**.
- **Biện pháp khắc phục**: Lắp đặt đèn LED hiệu suất cao, bố trí đèn ngủ cảm biến chuyển động tự động sáng khi bước chân xuống giường.

### Quy tắc 4: `RULE_BATH_WET_04` — Sàn ướt thiếu giải pháp chống trượt
- **Đối tượng áp dụng**: Không gian phòng tắm (`isWet === true && !isSlipResistant`).
- **Điều kiện kích hoạt**: Sàn gạch men bị ướt nhưng chưa phủ nano chống trơn hoặc chưa trải thảm cao su hút chân không.
- **Mức ưu tiên**: **CAO (HIGH)**.
- **Biện pháp khắc phục**: Phủ chất tăng ma sát sàn gạch, trang bị thảm cao su có lỗ thoát nước và giác hút đáy.

### Quy tắc 5: `RULE_BATH_GRAB_05` — Thiếu thanh tay vịn an toàn trong nhà vệ sinh
- **Đối tượng áp dụng**: Phòng tắm / WC (`roomType === "BATHROOM"`).
- **Điều kiện kích hoạt**: Số lượng thanh vịn hỗ trợ < 2 vị trí (cạnh bồn cầu và buồng tắm).
- **Mức ưu tiên**: **CAO (nếu 0 thanh)** / **TRUNG BÌNH (nếu 1 thanh)**.
- **Biện pháp khắc phục**: Bắt vít nở chịu tải tối thiểu 150kg cho thanh vịn Inox 304 ở cao độ 80-85cm so với mặt sàn.

### Quy tắc 6: `RULE_PATH_OBST_06` — Vật cản lấn chiếm thông thủy lối đi
- **Đối tượng áp dụng**: Đồ đạc, bàn trà, giỏ đồ đặt trong hành lang.
- **Điều kiện kích hoạt**: Khoảng cách thông thủy thực tế < 0.85 mét (theo CDC STEADI).
- **Mức ưu tiên**: **TRUNG BÌNH** đến **CAO** (tùy tuyến đi quan trọng).
- **Biện pháp khắc phục**: Kê đồ sát góc tường, giữ hành lang thông suốt tối thiểu 90cm.

### Quy tắc 7: `RULE_ROUTE_CLUTTER_07` — Đồ vật lộn xộn quanh tuyến đi lại
- **Đối tượng áp dụng**: Hộp carton, đồ chơi, giày dép để tạm dưới sàn.
- **Mức ưu tiên**: **THẤP (LOW)**.
- **Biện pháp khắc phục**: Dọn dẹp cất vào ngăn kéo hoặc giá kệ trên cao.

### Quy tắc 8: `RULE_DANGEROUS_OBJECT_08` — Góc bàn nhọn cạnh giường
- **Đối tượng áp dụng**: Bàn trà, bàn kính đặt cách thành giường < 1.0 mét.
- **Mức ưu tiên**: **TRUNG BÌNH (MEDIUM)**.
- **Biện pháp khắc phục**: Kê xa thành giường tối thiểu 1.2m hoặc bọc đệm silicon bo góc tròn.

