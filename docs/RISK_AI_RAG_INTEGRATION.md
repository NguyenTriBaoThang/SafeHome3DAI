# TÍCH HỢP TRÍ TUỆ NHÂN TẠO & RAG (RISK AI & RAG INTEGRATION)
## SafeHome Risk Intelligence — Giải Thích Mối Nguy & Dẫn Chứng Y Tế Minh Bạch

### 1. Kiến Trúc Tích Hợp RAG

Mô-đun Risk Intelligence tích hợp sâu với cơ sở tri thức y tế thẩm định sẵn có trong hệ sinh thái SafeHome:
- **Tài liệu nguồn được chứng thực**:
  - `SRC_WHO_2021`: Step Safety — WHO Global Report on Falls Prevention in Older Age.
  - `SRC_CDC_STEADI_2023`: CDC STEADI Fall Prevention — Check for Safety: A Home Fall Prevention Checklist for Older Adults.
  - `SRC_BYT_VN_2020`: Tài liệu hướng dẫn chăm sóc sức khỏe người cao tuổi & Phòng ngừa tai nạn thương tích tại nhà (Bộ Y Tế Việt Nam).
- **Mã nguồn giải thích**: `src/lib/risk/explanationEngine.ts`.
- **API Endpoint**: `POST /api/risk-assessment/findings/:findingId/explain`.

---

### 2. Quy Trình Tạo Giải Thích Đa Tầng

Khi người dùng nhấn **"Xem giải thích AI"** trên bất kỳ mối nguy nào, hệ thống thực thi chuỗi xử lý:

```
[ Mối nguy phát hiện (RiskFinding) ]
               │
               ▼
[ 1. Trích xuất ID Dẫn chiếu & Mã quy tắc ]
               │
               ▼
[ 2. Đối chiếu cơ sở dữ liệu tri thức CURATED_KNOWLEDGE_SOURCES ]
               │
               ▼
[ 3. Trích chọn đoạn văn bằng chứng (Passage) khớp nhất ]
               │
               ▼
[ 4. Tổng hợp cấu trúc giải thích tiếng Việt đa tầng ]
  ├─ Cơ sở y học & sinh học người già (Clinical Rationale)
  ├─ Cơ chế vật lý môi trường nhà ở (Environmental Mechanism)
  ├─ Các bước can thiệp thực hành (Actionable Guidance)
  └─ Trích dẫn chuẩn có số thứ tự [1], [2] kèm link nguồn và đoạn trích gốc
```

---

### 3. Cơ Chế Hoạt Động Ngoại Tuyến Đảm Bảo 100% (Offline Fallback)

- Toàn bộ các đoạn trích yếu lược và tiêu chuẩn y tế được lập chỉ mục tại chỗ (Local In-Memory Index trong `src/data/curatedKnowledge.ts`).
- **Khi không có kết nối internet hoặc không cấu hình khóa API LLM bên ngoài**:
  - Hệ thống vẫn trả về câu trả lời giải thích đầy đủ, chuyên nghiệp, chính xác 100% ngữ nghĩa y tế mà không bị gián đoạn hay phát sinh lỗi kết nối.
- **Lời từ chối trách nhiệm y khoa bắt buộc (Medical Disclaimer)**:
  - Mọi giải thích AI luôn kèm thông điệp: *"SafeHome 3D AI cung cấp phân tích hỗ trợ phòng ngừa rủi ro môi trường dựa trên tài liệu khuyến cáo y tế cộng đồng (WHO, CDC, Bộ Y Tế). Ứng dụng không đưa ra chẩn đoán y khoa, không thay thế cho đánh giá chuyên môn của bác sĩ hoặc chuyên viên trị liệu vật lý."*

