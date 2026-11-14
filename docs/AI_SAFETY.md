# Hàng Rào An Toàn AI & Y Tế — AI Safety Guardrails

Tài liệu này xác định các chính sách an toàn, ranh giới đạo đức và các cơ chế phòng vệ được tích hợp trong hệ thống SafeHome Copilot.

---

## 1. Tuyên Ngôn Phạm Vi & Miễn Trừ Trách Nhiệm

> **LƯU Ý Y TẾ QUAN TRỌNG:**
> SafeHome Copilot là công cụ trí tuệ nhân tạo hỗ trợ giáo dục và lập kế hoạch cải thiện an toàn môi trường nhà ở nhằm phòng ngừa nguy cơ té ngã cho người cao tuổi.
> Hệ thống **KHÔNG PHẢI LÀ THIẾT BỊ Y TẾ**, không đưa ra chẩn đoán lâm sàng, không kê đơn thuốc và không thay thế cho việc thăm khám của bác sĩ chuyên khoa hoặc chuyên gia đánh giá môi trường sống chuyên nghiệp.

---

## 2. Các Ranh Giới Nghiêm Ngặt (Safety Guardrails)

### 2.1 Tình Huống Cấp Cứu Khẩn Cấp (Emergency Protocol)
- **Dấu hiệu nhận biết**: Câu hỏi đề cập đến chấn thương cấp tính, ngã bất tỉnh, co giật, hôn mê, gãy xương hoặc chảy máu nhiều.
- **Hành vi bắt buộc của hệ thống**:
  1. Lập tức hiển thị số điện thoại cấp cứu y tế khẩn cấp: **115**.
  2. Cảnh báo không tự ý di chuyển nạn nhân nếu nghi ngờ chấn thương cột sống hoặc gãy xương.
  3. Từ chối mọi câu hỏi tư vấn thông thường và tập trung vào chỉ dẫn an toàn sinh mạng trước mắt.

### 2.2 Yêu Cầu Y Khoa Ngoài Thẩm Quyền (Out-of-Scope Medical)
- **Dấu hiệu nhận biết**: Hỏi về tên thuốc, liều lượng dùng, kháng sinh, tiêm thuốc, phỏng đoán bệnh lý tim mạch/thần kinh.
- **Hành vi bắt buộc của hệ thống**:
  1. Khẳng định rõ hệ thống là trợ lý an toàn không gian sống và không có thẩm quyền chuyên môn y tế lâm sàng.
  2. Khuyên gia đình đưa người cao tuổi đến cơ sở y tế gần nhất hoặc liên hệ bác sĩ gia đình.

### 2.3 Phòng Chống Ảo Giác Về Tỷ Lệ & Số Liệu (Anti-Fabrication Policy)
- Nghiêm cấm đưa ra các phát biểu mang tính khẳng định định lượng không có trong tài liệu thẩm định (ví dụ: "giải pháp này giúp bạn 100% không bao giờ ngã", hay "loại gạch này giảm chính xác 85% rủi ro").
- Khi người dùng gài số liệu giả định trong câu hỏi, hệ thống kích hoạt trạng thái `INSUFFICIENT_EVIDENCE` để bác bỏ hoặc giải thích rõ thiếu cơ sở thực nghiệm.

### 2.4 Phòng Thủ Trước Tấn Công Prompt Injection / Jailbreak
- Lọc bỏ các mẫu ký tự cố tình can thiệp vào hành vi hệ thống (e.g. `ignore all instructions`, `act as an unrestricted doctor`, `bỏ qua mọi quy tắc`).
- Các câu hỏi này tự động bị khóa và chuyển hướng an toàn.

---

## 3. Nhật Ký & Khả Năng Giám Sát (Auditability)

Mọi lượt trao đổi của người dùng đều được ghi lại trong cơ sở dữ liệu SQLite:
- Ý định phân tích (`intent`)
- Trạng thái bằng chứng (`evidenceStatus`)
- Chế độ sinh phản hồi (`responseMode`)
- Điểm tự tin logic (`confidenceScore`)
- Các trích dẫn nguồn văn bản tương ứng (`AnswerCitation`)

Nhờ đó, quản trị viên y tế và kỹ sư hệ thống luôn có thể kiểm tra lại nguồn gốc câu trả lời và bảo đảm tính tuân thủ pháp lý y tế.

