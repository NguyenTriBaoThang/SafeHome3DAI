# SAFEHOME 3D AI — ELDERLY FALL RISK INTELLIGENCE VALIDATION

**Phiên bản kiểm toán:** 2.0.0-AUDIT  
**Ngày thực hiện:** 19/11/2026  
**Chuyên môn phụ trách:** Healthcare Risk Assessment Specialist & Senior Architect  
**Trạng thái kiểm định:** ĐÃ KIỂM ĐỊNH TOÀN DIỆN (100% Test Suites PASS)

---

## 1. THỐNG NHẤT ĐỘNG CƠ ĐÁNH GIÁ NGUY CƠ (UNIFIED RISK ENGINE)

### 1.1. Khắc phục sự phân mảnh logic giữa các phiên bản
- **Hiện trạng trước kiểm toán:** Dự án tồn tại song song `src/features/risk-engine/rules.ts` (nhận `RoomState`) và `src/lib/risk/riskRuleRegistry.ts` (nhận `AssessmentInput`), gây nguy cơ chênh lệch kết quả nếu gọi khác điểm vào.
- **Giải pháp thống nhất chuẩn hóa:**
  - Thiết lập kiến trúc: **"Một nguồn quy tắc chuẩn, đa dạng adapter đầu vào"**.
  - Động cơ cốt lõi hoạt động trên 8 quy tắc rủi ro có phiên bản (`RISK-001` đến `RISK-008`).
  - Toàn bộ dữ liệu từ **AI Guided Survey**, **AI Vision Detection**, **3D Digital Twin** và **Kịch bản mô phỏng** đều được chuẩn hóa qua `src/lib/risk/inputAdapter.ts` trước khi đưa vào tính điểm.
  - Trọng số điểm phạt được đồng bộ 100%: Nguy cơ cao ($-15$ điểm), Nguy cơ trung bình ($-8$ điểm), Nguy cơ thấp ($-4$ điểm), Chờ xác minh ($-3$ điểm), chặn khoảng điểm trong thang $[10, 100]$.

---

## 2. KIỂM ĐỊNH 8 QUY TẮC NGUY CƠ TÉ NGÃ CHUẨN LÂM SÀNG (CDC STEADI & WHO)

| Mã quy tắc | Tên quy tắc nguy cơ | Căn cứ y khoa quốc tế & Việt Nam | Điều kiện kích hoạt | Mức độ ưu tiên | Trọng số trừ điểm |
|---|---|---|---|---|---|
| **RISK-001** | Thảm trải sàn lỏng lẻo / quăn mép | WHO Step Safety (2021) p.34; CDC STEADI (2023) | Có thảm nhưng không dán cố định hoặc quăn góc | **HIGH** | $-15$ điểm |
| **RISK-002** | Dây điện vắt ngang lối đi lại | CDC STEADI Checklist; Bộ Y Tế VN (2020) | Dây điện/sạc nằm trên luồng di chuyển chính | **HIGH** | $-15$ điểm |
| **RISK-003** | Thiếu ánh sáng / chóa lóa ban đêm | WHO Guidelines p.42; NCOA (2023) | Độ sáng $< 150$ Lux (ngày) hoặc $< 50$ Lux (đêm) | **HIGH / MED** | $-15$ hoặc $-8$ |
| **RISK-004** | Sàn nhà tắm ướt trơn trượt | WHO Fall Prevention p.51; Bộ Y Tế VN | Gạch men ướt nước, thiếu thảm cao su hút chân không | **HIGH** | $-15$ điểm |
| **RISK-005** | Thiếu thanh vịn bồn cầu & buồng tắm | CDC STEADI Bath Safety; WHO p.52 | Nhà vệ sinh không có thanh vịn chịu tải $\ge 150kg$ | **HIGH** | $-15$ điểm |
| **RISK-006** | Vật cản chắn luồng di chuyển | CDC STEADI Home Assessment Checklist | Ghế, quạt, bàn thu hẹp bề rộng thông thủy $< 80cm$ | **HIGH / MED** | $-15$ hoặc $-8$ |
| **RISK-007** | Đồ vật bừa bộn dưới sàn nhà | WHO Guidelines; Bộ Y Tế VN | Hộp carton, giày dép, đồ đạc vương vãi | **LOW** | $-4$ điểm |
| **RISK-008** | Bàn trà góc nhọn đặt sát giường ngủ | CDC STEADI Fall Injury Prevention | Bàn góc nhọn cách mép giường $< 1.0m$ | **MEDIUM** | $-8$ điểm |

> **Tuyên bố y tế bắt buộc:** Điểm an toàn từ SafeHome 3D AI là **chỉ số sàng lọc và hoạch định cải tạo môi trường vật lý (Screening & Environmental Review Index)**, không phải xác suất té ngã lâm sàng của cá nhân và không thay thế cho chẩn đoán của bác sĩ chuyên khoa lão khoa.

---

## 3. PHÂN TÁCH TRẠNG THÁI BẰNG CHỨNG & MÔ PHỎNG

Để đảm bảo tính trung thực tuyệt đối, hệ thống phân biệt 5 trạng thái bằng chứng:
1. `SAFE_OBSERVED`: Đã quan sát thực tế và xác nhận an toàn (ví dụ: thảm có lớp cao su bám chặt).
2. `HAZARD_CONFIRMED`: Nguy cơ đã được người dùng hoặc khảo sát xác nhận chắc chắn.
3. `POTENTIAL_HAZARD`: Dấu hiệu nghi ngờ phát hiện từ ảnh, cần làm rõ thêm.
4. `NOT_ASSESSED`: Khu vực chưa thực hiện khảo sát.
5. `INSUFFICIENT_EVIDENCE`: Thiếu dữ liệu đo đạc để kết luận.

Đặc biệt, hệ thống phân tách rạch ròi giữa:
- **`RESOLVED_IN_SIMULATION`:** Nguy cơ đã được khắc phục thử nghiệm trong Bản sao số 3D (ví dụ: đã thử xóa thảm trên màn hình).
- **`RESOLVED_IN_REAL_WORLD`:** Nguy cơ đã thực sự được gia đình xử lý ngoài đời thực (yêu cầu người dùng bấm xác nhận đã dán thảm hoặc đã gọi thợ lắp thanh vịn).
- **Tuyệt đối không tự động đánh dấu đã giải quyết ngoài đời thực chỉ vì người dùng kéo thả vật thể 3D.**

---

## 4. KẾT QUẢ KIỂM THỬ TÍNH NHẤT QUÁN & ĐỘ CHE PHỦ (TEST EVIDENCE)

Tất cả các bài kiểm thử liên quan đến Risk Engine đều đạt kết quả tuyệt đối:
- `tests/riskEngine.test.ts`: **11/11 tests PASS** (Kiểm tra 8 quy tắc, tính điểm trừ, kiểm thử biên).
- `tests/riskIntelligence.test.ts`: **10/10 tests PASS** (Kiểm tra ma trận phân loại ưu tiên, tính toán so sánh delta trước/sau).
- `tests/riskIntegration.test.ts`: **3/3 tests PASS** (Luồng tích hợp E2E từ phòng 3D sang sinh bảng khuyến nghị hành động).
