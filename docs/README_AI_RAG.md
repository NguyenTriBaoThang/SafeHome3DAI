# SafeHome Copilot — Trợ lý AI An Toàn Không Gian Sống

SafeHome Copilot là hệ thống **AI Chat + Trustworthy RAG (Retrieval-Augmented Generation)** được thiết kế chuyên biệt để tư vấn, giải thích và định hướng cải thiện an toàn môi trường sống, phòng ngừa té ngã cho người cao tuổi.

---

## 1. Tính Năng Cốt Lõi

1. **Hiểu ngôn ngữ tự nhiên tiếng Việt**: Phân tích ý định người dùng (Query Intent Classification), phát hiện ngữ cảnh đàm thoại nhiều lượt (Multi-turn Follow-up) và xử lý từ quy chiếu đại từ.
2. **Truy xuất tri thức lai (Hybrid Retrieval)**: Tìm kiếm đồng thời theo thuật toán TF-IDF / BM25 cải tiến kết hợp field-boosting (tiêu đề x5, từ khóa x4, trọng số nội dung) trên kho tài liệu đã được thẩm định từ WHO, CDC Hoa Kỳ (STEADI) và Bộ Y tế Việt Nam.
3. **Đánh giá mức độ đầy đủ của chứng cứ (Evidence Sufficiency Evaluation)**: Phân loại trạng thái chứng cứ thành `SUPPORTED`, `PARTIALLY_SUPPORTED`, `INSUFFICIENT_EVIDENCE`, `OUT_OF_SCOPE`, và `EMERGENCY`.
4. **Phản hồi có trích dẫn kiểm chứng được (Verifiable Inline Citations)**: Mọi câu trả lời chuyên môn đều gắn chỉ số trích dẫn dạng `[1]`, `[2]`, cho phép người dùng click để xem trực tiếp đoạn trích gốc, tên văn bản, nhà xuất bản, số trang và mã hash SHA-256.
5. **Cơ chế phòng vệ an toàn y tế (Healthcare AI Safety Guardrails)**:
   - Tự động nhận diện tình huống cấp cứu và kích hoạt hướng dẫn gọi **115** kèm sơ cứu ban đầu.
   - Từ chối chẩn đoán bệnh tật, kê đơn thuốc hoặc tư vấn điều trị lâm sàng ngoài phạm vi.
   - Từ chối các con số tỷ lệ phần trăm tùy tiện không có trong tài liệu thẩm định.
   - Miễn trừ trách nhiệm y tế (Mandatory Medical Disclaimer) bắt buộc trên mọi giao diện.
6. **Bộ giao diện 3 bảng điều khiển chuyên nghiệp**:
   - **Bảng trái**: Quản lý lịch sử hội thoại, tìm kiếm nhanh và chỉ số kho tài liệu.
   - **Bảng giữa**: Luồng hội thoại Markdown, thẻ trạng thái chứng cứ, trích dẫn tương tác, câu hỏi gợi ý tiếp theo và bộ soạn thảo tin nhắn có đề xuất mẫu.
   - **Bảng phải**: Bộ thanh tra chứng cứ (Evidence Inspector), danh mục văn bản chuẩn (Source Registry) và bảng điều khiển đánh giá Benchmark RAG trực tiếp.
7. **Sẵn sàng tích hợp Digital Twin 3D**: Interface công cụ TypeScript chuẩn bị sẵn để liên kết tương tác với mô hình 3D phòng ngủ, phòng tắm trong các phiên bản tiếp theo.

---

## 2. Cấu Trúc Thư Mục Module

```
src/
├── app/
│   ├── ai-assistant/
│   │   └── page.tsx                      # Giao diện 3-panel SafeHome Copilot
│   └── api/
│       ├── ai/
│       │   ├── chat/route.ts             # API Chat JSON tiêu chuẩn
│       │   ├── chat/stream/route.ts      # API Chat Server-Sent Events (SSE)
│       │   └── conversations/            # CRUD phiên hội thoại & tin nhắn
│       └── rag/
│           ├── search/route.ts           # API tìm kiếm tri thức RAG
│           ├── sources/route.ts          # API danh mục tài liệu thẩm định
│           ├── documents/route.ts        # API nạp tài liệu mới (Ingestion)
│           └── eval/route.ts             # API chạy bộ Benchmark đánh giá RAG
├── data/
│   ├── curatedKnowledge.ts              # Kho tài liệu mẫu WHO, CDC, Bộ Y tế
│   └── ragEvaluationDataset.ts          # 8 kịch bản đánh giá chất lượng RAG
├── features/
│   └── ai-copilot/
│       └── tools/
│           └── digitalTwinTools.ts       # Interface kết nối công cụ 3D Digital Twin
└── lib/
    ├── ai/
    │   └── conversationManager.ts        # Quản lý lưu trữ SQLite cho hội thoại
    └── rag/
        ├── types.ts                      # Toàn bộ Type definitions của hệ thống RAG
        ├── ingestion.ts                  # Bộ chuẩn hóa văn bản, băm SHA-256 & phân đoạn
        ├── queryAnalysis.ts              # Phân loại ý định, an toàn & viết lại truy vấn
        ├── retrieval.ts                  # Bộ máy truy xuất văn bản lai & field-boosting
        ├── evidenceSufficiency.ts        # Bộ đánh giá tính đầy đủ của bằng chứng
        ├── citationVerifier.ts           # Bộ xác thực trích dẫn & ngăn hallucination
        ├── groundedGenerator.ts          # Bộ sinh câu trả lời đối chiếu bằng chứng
        └── evaluator.ts                  # Bộ điều phối kiểm thử Benchmark RAG tự động
```

---

## 3. Khởi Động Nhanh (Quickstart)

### Cài đặt phụ thuộc & cơ sở dữ liệu
```bash
# Cài đặt thư viện
npm install

# Đồng bộ Prisma ORM với SQLite cục bộ
npx prisma db push

# Nạp dữ liệu mẫu ban đầu (phòng 3D, mối nguy & kho tài liệu chuẩn)
node prisma/seed.js
```

### Chạy kiểm thử tự động
```bash
# Chạy toàn bộ 33 kiểm thử (Unit, Integration & RAG Benchmark)
npm test
```

### Khởi chạy môi trường phát triển
```bash
npm run dev
```
Truy cập giao diện Copilot tại: `http://localhost:3000/ai-assistant`
Truy cập API Benchmark tại: `http://localhost:3000/api/rag/eval`

