# DANH MỤC 8 QUY TẮC KIỂM ĐỊNH MÔI TRƯỜNG (RISK RULE REGISTRY)
## Phiên bản đăng ký: v1.0.0

Mỗi quy tắc trong SafeHome Risk Intelligence là một hàm thuần khiết (Pure Function), có khả năng tái lặp kết quả 100% khi cùng một đầu vào được nạp vào hệ thống.

---

### Bảng Tổng Hợp 8 Quy Tắc Kiểm Định

| Mã Quy Tắc | Tên Quy Tắc | Nhóm Hành Động | Mức Mặc Định | Không Gian Áp Dụng | Trích Dẫn Y Tế |
|---|---|---|---|---|---|
| `RISK-001` | Thảm trải sàn không cố định mép / trượt dịch | `SECURE_RUG` | `HIGH` | Phòng ngủ, Phòng khách, Hành lang | WHO 2021, CDC STEADI |
| `RISK-002` | Dây điện / cáp vắt ngang lối đi thông thủy | `REROUTE_CABLE` | `HIGH` | Toàn bộ các phòng | CDC STEADI, BYT VN |
| `RISK-003` | Vật cản lấn chiếm thông thủy lối đi | `REMOVE_OBSTACLE` | `HIGH` | Toàn bộ các phòng | CDC STEADI, WHO |
| `RISK-004` | Chiếu sáng ban đêm không đủ an toàn | `IMPROVE_LIGHTING` | `HIGH` | Phòng ngủ, WC, Hành lang | WHO 2021, BYT VN |
| `RISK-005` | Sàn nhà tắm trơn trượt khi ướt | `ADD_NON_SLIP_MAT` | `HIGH` | Nhà vệ sinh / Phòng tắm | WHO 2021, BYT VN |
| `RISK-006` | Thiếu thanh tay vịn an toàn trong nhà vệ sinh | `INSTALL_GRAB_BAR` | `HIGH` | Nhà vệ sinh / Phòng tắm | WHO 2021, BYT VN |
| `RISK-007` | Gờ bậc cửa chênh lệch cao độ tại lối vào | `RAMP_OR_MARK_THRESHOLD` | `MEDIUM` | Lối vào WC, Phòng ngủ | CDC STEADI, BYT VN |
| `RISK-008` | Tầm với công tắc đèn / vật dụng thiết yếu | `REORGANIZE_STORAGE` | `MEDIUM` | Phòng ngủ, Phòng khách | CDC STEADI, WHO |

---

### Chi Tiết Từng Quy Tắc & Điều Kiện Kích Hoạt

#### 1. RISK-001 — Thảm Trải Sàn Không Cố Định Mép
- **Mục tiêu**: Phát hiện thảm trang trí hoặc thảm lau chân lỏng lẻo dễ gây trượt hoặc quăn mép.
- **Ngưỡng kỹ thuật**: Mép thảm phải được cố định hoàn toàn hoặc sử dụng thảm có đế cao su chống trượt DCOF >= 0.42.
- **Điều kiện kích hoạt**:
  - `rugs.present === true` VÀ (`isSecured === false` HOẶC `edgesCurled === true`).
  - Nếu thảm nằm trên lối đi chính (`inWalkway === true`) $\rightarrow$ Ưu tiên `HIGH`.
  - Nếu thảm nằm góc phòng $\rightarrow$ Ưu tiên `MEDIUM`.

#### 2. RISK-002 — Dây Điện Vắt Ngang Lối Đi Thông Thủy
- **Mục tiêu**: Loại bỏ nguy cơ vướng chân hoặc mắc gậy chống vào dây nguồn/sạc.
- **Ngưỡng kỹ thuật**: 0 dây điện trần cắt ngang hành lang thông thủy.
- **Điều kiện kích hoạt**:
  - `cables.crossingWalkway === true` VÀ không có nẹp cao su bảo vệ (`hasCordCover === false`).
  - Mức ưu tiên: `HIGH`.

#### 3. RISK-003 — Vật Cản Lấn Chiếm Thông Thủy Lối Đi
- **Mục tiêu**: Đảm bảo luồng di chuyển không bị cản trở đối với người già hoặc người dùng thiết bị hỗ trợ.
- **Ngưỡng kỹ thuật**: Thông thủy lối đi tối thiểu >= 0.85m (chuẩn CDC STEADI).
- **Điều kiện kích hoạt**:
  - `walkwayClearWidthM < 0.85m` HOẶC có đồ đạc phụ nằm trong lối đi.
  - Nếu `< 0.70m` $\rightarrow$ Ưu tiên `HIGH`.
  - Từ `0.70m - 0.85m` $\rightarrow$ Ưu tiên `MEDIUM`.

#### 4. RISK-004 — Độ Chiếu Sáng Ban Đêm Không Đủ An Toàn
- **Mục tiêu**: Bù đắp sự suy giảm điều tiết bóng tối của mắt người cao tuổi.
- **Ngưỡng kỹ thuật**: Độ rọi tối thiểu >= 60-100 Lux; có đèn ngủ dẫn đường dịu mắt (30-50 Lux).
- **Điều kiện kích hoạt**:
  - `nighttimeLux < 60 Lux` HOẶC thiếu đèn ngủ cảm biến trên tuyến đi WC.
  - Mức ưu tiên: `HIGH` nếu `< 40 Lux` hoặc không có đèn dẫn đường; `MEDIUM` nếu từ 40-60 Lux.

#### 5. RISK-005 — Bề Mặt Sàn Nhà Tắm Trơn Trượt Khi Ướt
- **Mục tiêu**: Ngăn chặn trượt ngã trên bề mặt men bóng ẩm ướt gây gãy xương chậu.
- **Ngưỡng kỹ thuật**: Hệ số ma sát động DCOF >= 0.42 khi ướt hoặc trải thảm cao su giác hút.
- **Điều kiện kích hoạt**:
  - `roomType === "BATHROOM"` VÀ `floor.isWet === true` VÀ không có thảm cao su giác hút / gạch nhám.
  - Mức ưu tiên: `HIGH`.

#### 6. RISK-006 — Thiếu Thanh Tay Vịn An Toàn Trong Nhà Vệ Sinh
- **Mục tiêu**: Cung cấp điểm tì tựa chịu lực khi thay đổi tư thế đứng - ngồi tránh tụt huyết áp.
- **Ngưỡng kỹ thuật**: Tối thiểu 2 vị trí chịu lực âm tường (Cạnh bồn cầu và trong buồng sen tắm).
- **Điều kiện kích hoạt**:
  - `roomType === "BATHROOM"` VÀ `grabBarsCount < 2` (hoặc thiếu vị trí bồn cầu / sen tắm).
  - Mức ưu tiên: `HIGH` nếu `count === 0`; `MEDIUM` nếu `count === 1`.

#### 7. RISK-007 — Gờ Bậc Cửa Chênh Lệch Cao Độ
- **Mục tiêu**: Tránh vấp ngón chân do bàn chân nhấc không đủ cao qua gờ bậc cửa.
- **Ngưỡng kỹ thuật**: Độ chênh cốt tối đa <= 1.5cm; nếu > 1.5cm phải có gờ vát dốc thoải.
- **Điều kiện kích hoạt**:
  - `levelDifferenceCm > 1.5cm` VÀ không có gờ dốc vát mép (`hasThresholdRamp === false`).
  - Mức ưu tiên: `HIGH` nếu `> 3.5cm`; `MEDIUM` nếu `1.5 - 3.5cm`.

#### 8. RISK-008 — Tầm Với Công Tắc Đèn Hoặc Vật Dụng Thiết Yếu
- **Mục tiêu**: Tránh động tác rướn người hoặc thức dậy mò mẫm trong bóng tối gây ngã khỏi nệm.
- **Ngưỡng kỹ thuật**: Khoảng cách từ mép giường đến công tắc đèn hoặc tab đầu giường <= 50-60cm.
- **Điều kiện kích hoạt**:
  - `roomType === "BEDROOM"` VÀ (`switchReachableFromBed === false` HOẶC `essentialItemsReachableFromBed === false`).
  - Mức ưu tiên: `MEDIUM`.

