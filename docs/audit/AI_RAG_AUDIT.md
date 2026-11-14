# BÁO CÁO KIỂM TOÁN NĂNG LỰC AI, RAG & TRUY XUẤT NGUỒN GỐC (AI/RAG AUDIT)
### SafeHome 3D AI — Tiêu Chuẩn Minh Bạch & Không Ảo Giác Y Khoa

---

## 1. Kiểm Toán Danh Mục Mô Hình AI Thực Tế (AI Capabilities Inventory)

| Thành Phần | Bản Chất Kỹ Thuật | Mô Hình Sử Dụng | Nơi Vận Hành | Nguồn Dữ Liệu Huấn Luyện / Cơ Sở | Trạng Thái Ảo Giác |
|---|---|---|---|---|---|
| **Đánh Giá Nguy Cơ (Risk Engine)** | Hệ Thống Chuyên Gia Xác Định (Deterministic Expert System) | 8 Quy Tắc Lâm Sàng | Local Node.js / TypeScript | WHO (2021) & CDC STEADI (2019) | 0% Ảo giác (Deterministic logic) |
| **Thị Giác AI (Vision Studio)** | Multimodal VLM + Heuristic Detector + Manual Review Studio | VLM / Object Taxonomy 15 Lớp | API Multimodal + Local Fallback | Tiêu chuẩn nội thất và vật cản ngã | 0% Bịa đặt (Luôn gắn nhãn `isEstimate: true`) |
| **Trợ Lý AI & RAG (Copilot)** | Retrieval-Augmented Generation | Embeddings & Grounded Generator | Local Node.js & Database RAG | Tài liệu chính thống WHO, CDC, ADA | Có bộ lọc từ chối khi thiếu bằng chứng |
| **NLP Khảo Sát** | Trích Xuất Thực Thể Ngôn Ngữ Tự Nhiên | Intent & Entity Pattern Extractor | Local TypeScript Engine | Ngân hàng câu hỏi chuẩn y tế | Không tự suy đoán thông tin ngoài |

---

## 2. Kiểm Toán Trích Dẫn Y Khoa (Source Verification Audit)
1. **Tuyệt đối không sinh URL hoặc trích dẫn giả**: Mọi đoạn giải thích y tế khi người dùng nhấp nút "Giải thích Y khoa (RAG)" đều gắn liền với định danh `KnowledgeSource` có thật trong cơ sở dữ liệu (`WHO_FALLS_2021`, `CDC_STEADI_2019`, `ADA_STANDARDS_2010`).
2. **Quy tắc An toàn Y tế**:
   - Nếu câu hỏi vượt ra ngoài phạm vi an toàn vật lý nhà ở (ví dụ: người dùng hỏi đơn thuốc hay chẩn đoán bệnh lý), hệ thống tự động từ chối với thông báo hướng dẫn tham vấn bác sĩ chuyên khoa.
   - Thang điểm an toàn được định danh rõ ràng là: *"Chỉ số ưu tiên xử lý mối nguy môi trường (quy ước nội bộ)"*, không bao giờ công bố sai lệch là "xác suất té ngã lâm sàng của người cao tuổi".

