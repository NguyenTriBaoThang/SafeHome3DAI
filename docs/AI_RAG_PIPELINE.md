# SafeHome 3D AI — Quy Trình RAG & Khung Tri Thức (RAG Pipeline)

## 1. Mục tiêu & Nguyên lý thiết kế
Hệ thống RAG (Retrieval-Augmented Generation) của SafeHome 3D AI được phát triển nhằm mục tiêu:
1. **Tuyệt đối không bịa đặt nguồn gốc y khoa**: Không sinh nội dung y khoa sai lệch hoặc khẳng định chữa lành.
2. **Khả năng hoạt động tự chủ (Dual-Mode Architecture)**: Không phụ thuộc vào API Key bên ngoài. Khi chưa cấu hình LLM API, hệ thống kích hoạt bộ máy phản hồi cục bộ xác thực (Evidence-based Local Fallback) đối sánh đoạn trích trực tiếp.
3. **Liên kết ngữ cảnh không gian thực tế**: Kết hợp câu hỏi người dùng với hiện trạng các vật thể 3D và các điểm nguy cơ đang phát hiện trong căn phòng.

---

## 2. Quy trình RAG Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant UI as Chat UI (Module D)
    participant API as /api/rag Handler
    participant RAG as RAG Retrieval Engine
    participant Registry as Curated Sources Registry
    participant LLM as External LLM / Fallback

    User->>UI: Nhập câu hỏi (VD: "Tại sao thảm không cố định lại nguy hiểm?")
    UI->>API: Gửi query + Context phòng 3D hiện tại
    API->>RAG: Tokenize & Scored Retrieval
    RAG->>Registry: Tìm kiếm đoạn văn theo trọng số từ khóa & quy tắc
    Registry-->>RAG: Trả về Top 3 passages phù hợp nhất
    alt Có API Key (Gemini / OpenAI)
        RAG->>LLM: Tạo phản hồi có căn cứ dẫn xuất (Grounded Answer)
    else Chế độ Cục bộ (Local Fallback)
        RAG->>LLM: Tổng hợp văn bản trích dẫn nguyên văn + Khuyến nghị thực tế
    end
    LLM-->>API: Phản hồi hoàn chỉnh kèm trích dẫn (Citations)
    API-->>UI: Hiển thị câu trả lời + Trích dẫn nguồn tài liệu + Tuyên bố miễn trừ
```

---

## 3. Danh mục nguồn tài liệu thẩm định (Curated Sources)

| Mã nguồn | Tổ chức | Tiêu đề văn bản | Năm | Trọng tâm khuyến nghị |
|---|---|---|---|---|
| `SRC_WHO_2021` | WHO | Step Safety: WHO Global Report on Falls Prevention in Older Age | 2021 | Thảm trải sàn, độ rọi chiếu sáng 150-200 Lux, ma sát sàn phòng tắm |
| `SRC_CDC_STEADI_2023` | CDC Hoa Kỳ | STEADI: Check for Safety - A Home Fall Prevention Checklist | 2023 | Thông thủy lối đi tối thiểu 85-90cm, không vắt dây điện qua lối đi |
| `SRC_BYT_VN_2020` | Bộ Y tế Việt Nam | Hướng dẫn chăm sóc sức khỏe và phòng ngừa tai nạn thương tích | 2020 | Gãy cổ xương đùi, lắp thanh tay vịn chữ L bồn cầu, công tắc đèn cảm biến |
| `SRC_NCOA_2023` | NCOA | Evidence-Based Falls Prevention Programs | 2023 | Can thiệp môi trường vật lý giúp giảm đến 39% nguy cơ ngã |

