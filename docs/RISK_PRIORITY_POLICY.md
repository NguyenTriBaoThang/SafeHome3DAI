# CHÍNH SÁCH PHÂN BỔ MỨC ĐỘ ƯU TIÊN (RISK PRIORITY POLICY)
## SafeHome Risk Intelligence — Nguyên Tắc Xác Định & Giải Trình Minh Bạch

### 1. Bốn Mức Đánh Giá Trạng Thái (Evaluation States)

Mỗi quy tắc khi thẩm định một phòng sẽ trả về chính xác một trong bốn trạng thái chuẩn hóa:

1. **`DETECTED`**:
   - Nguy cơ môi trường được xác nhận kích hoạt dựa trên các số đo thực tế hoặc câu trả lời hiện trường.
2. **`NOT_DETECTED`**:
   - Điều kiện an toàn được thỏa mãn đầy đủ (ví dụ: đã có thanh tay vịn kiên cố, thảm đã dán mép, sàn có thảm chống trượt).
3. **`NEEDS_VERIFICATION`**:
   - Dữ liệu khảo sát chưa thu thập đủ hoặc người dùng trả lời "Chưa rõ / Không biết". Hệ thống ghi nhận trạng thái chưa rõ để người nhà kiểm tra lại thực địa, tuyệt đối không đoán mò.
4. **`NOT_APPLICABLE`**:
   - Quy tắc không liên quan đến loại phòng này (ví dụ: quy tắc thanh vịn nhà tắm `RISK-006` đối với phòng khách hoặc phòng ngủ).

---

### 2. Bốn Mức Phân Bổ Mức Độ Ưu Tiên (Finding Priority)

Khi một nguy cơ ở trạng thái `DETECTED`, hệ thống phân loại mức ưu tiên can thiệp theo 4 cấp độ:

| Mức Ưu Tiên | Nhãn Tiếng Việt | Màu Huy Hiệu | Tiêu Chí Quyết Định |
|---|---|---|---|
| **`HIGH`** | Cần ưu tiên kiểm tra (Khẩn thiết) | Đỏ (`bg-rose-50 text-rose-700`) | Nguy cơ tương quan trực tiếp với chấn thương đe dọa tính mạng (gãy xương chậu, vỡ sọ não, chấn thương cột sống) |
| **`MEDIUM`** | Nên xem xét cải thiện | Vàng cam (`bg-amber-50 text-amber-700`) | Nguy cơ làm tăng tải trọng vận động, cản trở thao tác hoặc tiềm ẩn té ngã khi người già mệt mỏi |
| **`LOW`** | Theo dõi hoặc cải thiện khi phù hợp | Xanh ngọc (`bg-teal-50 text-teal-700`) | Nguy cơ tiềm ẩn nhẹ, có thể duy trì theo dõi và khắc phục khi sắp xếp lại nội thất |
| **`UNKNOWN`** | Cần bổ sung thông tin khảo sát | Xám (`bg-slate-100 text-slate-700`) | Gắn liền với trạng thái `NEEDS_VERIFICATION` |

---

### 3. Công Thức Tính Điểm An Toàn Gợi Ý (Heuristic Safety Score Index)

Điểm an toàn là một **chỉ số đánh giá môi trường có tính chất giáo dục (0 - 100 điểm)**, không phải xác suất lâm sàng y khoa:

$$\text{SafetyScore} = \max\left(10, \min\left(100, 100 - (15 \times N_{\text{HIGH}}) - (8 \times N_{\text{MEDIUM}}) - (4 \times N_{\text{LOW}}) - (3 \times N_{\text{UNKNOWN}})\right)\right)$$

Trong đó:
- $N_{\text{HIGH}}$: Số mối nguy ưu tiên cao (mỗi điểm trừ 15).
- $N_{\text{MEDIUM}}$: Số mối nguy ưu tiên vừa (mỗi điểm trừ 8).
- $N_{\text{LOW}}$: Số mối nguy ưu tiên thấp (mỗi điểm trừ 4).
- $N_{\text{UNKNOWN}}$: Số yếu tố chưa đủ thông tin kiểm định (mỗi điểm trừ 3 điểm phạt bất định).

---

### 4. Bảng Tra Cứu Lý Do Quyết Định Ưu Tiên (Priority Rationale Catalog)

Mỗi phân loại đều đi kèm lý do bằng tiếng Việt để người dùng và người chăm sóc hiểu thấu đáo tại sao vấn đề này cần được ưu tiên xử lý trước:

- **Thảm lỏng lẻo (`RISK-001`)**: Ưu tiên CAO nếu nằm trên luồng di chuyển chính cạnh giường ngủ, vì người già có xu hướng lê chân thấp, dễ bị quăn mép thảm gây mất thăng bằng.
- **Dây điện ngang lối đi (`RISK-002`)**: Ưu tiên CAO vì dây điện là bẫy vấp ngã ngầm; mắt người già giảm thị lực ban đêm khó nhận biết.
- **Sàn ướt nhà tắm (`RISK-005`)**: Ưu tiên CAO vì nền gạch trơn kết hợp nước xà phòng là vị trí phát sinh hơn 70% ca gãy xương chậu ở người cao tuổi.
- **Thiếu tay vịn nhà tắm (`RISK-006`)**: Ưu tiên CAO nếu hoàn toàn không có thanh vịn, vì hiện tượng tụt huyết áp tư thế khi đứng dậy từ bồn cầu rất dễ gây choáng quỵ ngã.

