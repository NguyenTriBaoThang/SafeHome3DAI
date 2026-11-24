# QUY TRÌNH & PHIẾU THẨM ĐỊNH CHUYÊN MÔN LÂM SÀNG (TASK A04)

**Mã giao thức:** `PROT-CLIN-REVIEW-V1`  
**Đơn vị chủ trì:** Nhóm Nghiên cứu & Phát triển Hệ sinh thái SafeHome 3D AI  
**Đối tượng thẩm định:** Bộ quy tắc suy luận rủi ro môi trường `RISK-001` đến `RISK-008`  
**Chính sách minh bạch:** Tuyệt đối không giả mạo chữ ký chuyên gia; trạng thái mặc định là `PENDING_REVIEW` hoặc `REFERENCE_ONLY`.

---

## 1. Mục đích & Phạm vi

Hệ thống SafeHome 3D AI được phát triển nhằm hỗ trợ phòng ngừa tai nạn té ngã cho người cao tuổi ($\ge 65$ tuổi) sống tại gia đình tại Việt Nam.

Quy trình thẩm định này thiết lập kênh đánh giá độc lập bởi các chuyên gia y tế lâm sàng thuộc 3 lĩnh vực trọng yếu:
1. **Bác sĩ Lão khoa (Geriatrician):** Đánh giá các hội chứng lão khoa (giảm sút cơ - sarcopenia, tụt huyết áp tư thế, suy giảm nhận thức nhẹ, bệnh lý thoái hóa khớp).
2. **Bác sĩ / Kỹ thuật viên Phục hồi chức năng & Hoạt động trị liệu (Physiatrist / Occupational Therapist):** Đánh giá dáng đi, thăng bằng, công thái học vận động (ergonomics) và sự an toàn của dụng cụ trợ giúp.
3. **Điều dưỡng Chuyên khoa Lão (Geriatric Nurse Specialist):** Đánh giá tính khả thi và an toàn của các hoạt động chăm sóc sinh hoạt hàng ngày (ADL - Activities of Daily Living).

---

## 2. Tiêu chí Đánh giá 4 Chiều (4-Tier Evaluation Framework)

Mỗi quy tắc từ `RISK-001` đến `RISK-008` phải được rà soát qua 4 tiêu chí bắt buộc:

| Tiêu chí | Nội dung xem xét | Nguy cơ sai lệch cần ngăn chặn |
|---|---|---|
| **1. Cơ chế cơ sinh học (Biomechanical Mechanism)** | Cơ chế gây mất thăng bằng có đúng với sinh lý bệnh và dáng đi của người già không? | Báo cáo cơ chế sai lệch, phóng đại hoặc quy kết thiếu căn cứ khoa học. |
| **2. Độ chuẩn xác của ngưỡng số (Threshold Calibration)** | Ngưỡng số (cm, Lux, m, DCOF) có phù hợp với tầm vóc người cao tuổi Việt Nam không? | Áp dụng máy móc tiêu chuẩn phương Tây (ví dụ: chiều cao giường hoặc tầm với quá lớn so với nhân trắc học người Việt). |
| **3. Tính an toàn của can thiệp (Intervention Safety)** | Khuyến nghị cải tạo có gây ra rủi ro thứ phát mới không? | Lắp tay vịn sai độ cao làm kẹt khớp vai; gờ dốc cao su ngắn quá tạo độ dốc lớn; băng dán thảm bong mép gây bẫy vấp chân. |
| **4. Tính khả thi & chi phí tại Việt Nam (Feasibility & Cost)** | Vật tư và giải pháp có dễ mua tại thị trường Việt Nam với chi phí hợp lý không? | Đưa ra các khuyến nghị thiết bị đắt đỏ, không khả thi cho đa số hộ gia đình. |

---

## 3. Mẫu Phiếu Thẩm định Chuyên môn (Clinical Expert Review Form)

```markdown
================================================================================
PHIẾU THẨM ĐỊNH CHUYÊN MÔN QUY TẮC PHÒNG NGỪA TÉ NGÃ — SAFEHOME 3D AI
================================================================================

I. THÔNG TIN CHUYÊN GIA THẨM ĐỊNH:
- Họ và tên chuyên gia: ........................................................
- Chức danh / Học hàm / Học vị: ...............................................
- Chuyên khoa: [ ] Lão khoa   [ ] Phục hồi chức năng   [ ] Điều dưỡng Lão khoa
- Số chứng chỉ hành nghề khám chữa bệnh: ......................................
- Cơ quan công tác: ...........................................................
- Ngày thẩm định: ..... / ..... / 202...

II. ĐÁNH GIÁ TỪNG QUY TẮC CỤ THỂ:

1. Mã quy tắc: RISK-......
   - Tên quy tắc: ..............................................................
   - Mức độ nguy hại lâm sàng (Severity): [ ] ĐỒNG Ý   [ ] ĐỀ NGHỊ ĐIỀU CHỈNH
     Ghi chú điều chỉnh (nếu có): .............................................
   
   - Ngưỡng định lượng an toàn: [ ] ĐỒNG Ý   [ ] ĐỀ NGHỊ ĐIỀU CHỈNH
     Ngưỡng đề xuất thay thế: .................................................
     Lý do chuyên môn: ........................................................
   
   - Biện pháp khắc phục đề xuất: [ ] AN TOÀN   [ ] TIỀM ẨN NGUY CƠ THỨ PHÁT
     Nguy cơ thứ phát cần lưu ý: ..............................................

III. KẾT LUẬN CỦA HỘI ĐỒNG:
[ ] PHÊ DUYỆT ÁP DỤNG TRÊN HỆ THỐNG (EXPERT_APPROVED)
[ ] CHỈ CHO PHÉP DẪN CHIẾU THAM KHẢO Y VĂN (REFERENCE_ONLY)
[ ] YÊU CẦU ĐIỀU CHỈNH LẠI NGƯỠNG TRƯỚC KHI TÁI THẨM ĐỊNH (REVISE_REQUIRED)
[ ] BÁC BỎ QUY TẮC DO THIẾU CƠ SỞ (REJECTED)

CHỮ KÝ VÀ HỌ TÊN CHUYÊN GIA THẨM ĐỊNH
(Ký số hoặc ký tên đóng dấu)
```

---

## 4. Quy tắc Bất di bất dịch về Trạng thái trong Phần mềm

1. Khi hệ thống hiển thị kết quả cho người dùng hoặc xuất báo cáo:
   - Nếu `status === "REFERENCE_ONLY"`: Hiển thị nhãn màu xanh dương `[Dẫn chiếu y văn CDC/WHO]`.
   - Nếu `status === "PROPOSED_INTERNAL"`: Hiển thị nhãn màu hổ phách `[Đang đề xuất nội bộ - Chưa thẩm định]`.
   - Nếu `status === "PENDING_REVIEW"`: Hiển thị nhãn màu xám `[Chờ chuyên gia phê duyệt]`.
   - Chỉ khi nào có chữ ký số hợp lệ trong `signatureHash` thì trường `status` mới được chuyển sang `EXPERT_APPROVED`.
2. Không cho phép bất kỳ kỹ sư backend nào can thiệp sửa trực tiếp trạng thái thành `EXPERT_APPROVED` trong code mà không có file biên bản thẩm định đính kèm trong thư mục `docs/clinical/reviews/`.

