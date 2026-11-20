# SafeHome Copilot — Trợ lý AI An Toàn Không Gian Sống

SafeHome Copilot là hệ thống **AI Chat + Trustworthy RAG (Retrieval-Augmented Generation)** được thiết kế chuyên biệt để tư vấn, giải thích và định hướng cải thiện an toàn môi trường sống, phòng ngừa té ngã cho người cao tuổi dựa trên tri thức y tế chuẩn hóa từ WHO, CDC Hoa Kỳ (STEADI) và Bộ Y tế Việt Nam.

---

## 1. Tính Năng Cốt Lõi

1. **Hiểu ngôn ngữ tự nhiên tiếng Việt**: Phân tích ý định người dùng (Query Intent Classification), phát hiện ngữ cảnh đàm thoại nhiều lượt (Multi-turn Follow-up) và xử lý từ quy chiếu đại từ.
2. **Truy xuất tri thức lai (Hybrid Retrieval)**: Tìm kiếm đồng thời theo thuật toán TF-IDF / BM25 cải tiến kết hợp field-boosting (tiêu đề x5, từ khóa x4, trọng số nội dung) trên kho tài liệu đã được thẩm định từ WHO, CDC Hoa Kỳ (STEADI) và Bộ Y tế Việt Nam.
3. **Đánh giá mức độ đầy đủ của chứng cứ (Evidence Sufficiency Evaluation)**: Phân loại trạng thái chứng cứ thành `SUPPORTED`, `PARTIALLY_SUPPORTED`, `INSUFFICIENT_EVIDENCE`, `OUT_OF_SCOPE`, và `EMERGENCY`.
4. **Phản hồi có trích dẫn kiểm chứng được (Verifiable Inline Citations)**: Mọi câu trả lời chuyên môn đều gắn chỉ số trích dẫn dạng `[1]`, `[2]`, cho phép người dùng click để mở ngăn tra cứu, xem trực tiếp đoạn trích gốc, tên văn bản, nhà xuất bản, số trang và đường dẫn cổng tra cứu chính thức.
5. **Định dạng giao diện chuyên biệt `SafeHomeMarkdown`**: Định dạng rõ ràng tiêu đề y tế (`##`, `###`), thẻ thông tin phòng 3D (`📌`), hộp lưu ý cảnh báo an toàn (`* ⚠️`) và các huy hiệu trích dẫn tương tác.
6. **Tích hợp thẩm định nguy cơ đồ vật qua ảnh**:
   - Trực tiếp tiếp nhận kết quả từ modal **Thẩm Định Rủi Ro Vật Dụng Qua Ảnh** (`ItemAssessmentModal`).
   - Phân tích 3 câu hỏi CDC STEADI: Điểm nguy cơ, Tại sao nguy hiểm, Nguy hiểm ở chỗ nào (kèm các ghim H1, H2, H3, H4) và lộ trình khắc phục.
   - Nút liên kết chuyển nhanh sang **Thị giác AI (`/ai-vision`)** để quét toàn bộ không gian phòng.
7. **Cơ chế phòng vệ an toàn y tế (Healthcare AI Safety Guardrails)**:
   - Tự động nhận diện tình huống cấp cứu và kích hoạt hướng dẫn gọi **115** kèm sơ cứu ban đầu.
   - Từ chối chẩn đoán bệnh tật, kê đơn thuốc hoặc tư vấn điều trị lâm sàng ngoài phạm vi.
   - Từ chối các con số tỷ lệ phần trăm tùy tiện không có trong tài liệu thẩm định (`Evidence Fallback Active`).
   - Miễn trừ trách nhiệm y tế (Mandatory Medical Disclaimer) bắt buộc trên mọi giao diện.
8. **Bộ giao diện 3 bảng điều khiển chuyên nghiệp (`/ai-assistant`)**:
   - **Bảng trái**: Quản lý lịch sử hội thoại, tìm kiếm nhanh và chỉ số kho tài liệu.
   - **Bảng giữa**: Luồng hội thoại Markdown, thẻ trạng thái chứng cứ, trích dẫn tương tác, câu hỏi gợi ý tiếp theo và bộ soạn thảo tin nhắn có đề xuất mẫu.
   - **Bảng phải (4 Tab)**:
     - **Tab 1: Bằng chứng (Evidence)**: Xem chi tiết đoạn trích dẫn gốc.
     - **Tab 2: Vật dụng (Items Vault)**: Lịch sử và chi tiết các đồ vật đã thẩm định rủi ro.
     - **Tab 3: Kho nguồn (Sources)**: Danh mục các tổ chức y tế chuẩn mực.
     - **Tab 4: Thẩm định RAG (Eval)**: Báo cáo đánh giá chất lượng câu trả lời theo 8 tiêu chí y tế.

---

## 2. Cấu Trúc Thư Mục Module

```text
src/
├── app/
│   ├── ai-assistant/
│   │   └── page.tsx                      # Giao diện 3-panel SafeHome Copilot
│   └── api/
│       ├── ai/
│       │   ├── chat/route.ts             # API Chat JSON tiêu chuẩn
│       │   ├── chat/stream/route.ts      # API Chat Server-Sent Events (SSE)
│       │   └── conversations/            # CRUD phiên hội thoại & tin nhắn
│       ├── rag/
│       │   ├── search/route.ts           # API tìm kiếm tri thức RAG
│       │   ├── sources/route.ts          # API danh mục tài liệu thẩm định
│       │   ├── documents/route.ts        # API nạp tài liệu mới (Ingestion)
│       │   └── eval/route.ts             # API chạy bộ Benchmark đánh giá RAG
│       └── vision/
│           └── assess-item/route.ts      # API thẩm định nguy cơ vật dụng (CDC STEADI)
├── components/
│   └── chat/
│       ├── SafeHomeMarkdown.tsx          # Trình render markdown y khoa chuẩn hóa
│       ├── ItemAssessmentModal.tsx       # Modal tải ảnh & thẩm định vật dụng CDC STEADI
│       └── ItemHazardCard.tsx            # Thẻ trực quan hóa điểm rủi ro & ghim H1..H4
├── data/
│   ├── curatedKnowledge.ts              # Kho tài liệu mẫu WHO, CDC, Bộ Y tế
│   └── ragEvaluationDataset.ts          # 8 kịch bản đánh giá chất lượng RAG
└── lib/
    ├── ai/
    │   └── conversationManager.ts        # Quản lý lưu trữ SQLite cho hội thoại
    ├── vision/
    │   ├── itemHazardAnalyzer.ts         # Động cơ thẩm định nguy cơ vật dụng
    │   └── itemHazardTypes.ts            # Type definitions thẩm định vật dụng
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

```bash
# Cài đặt phụ thuộc
npm install

# Đồng bộ Prisma ORM với SQLite
npx prisma db push

# Chạy máy chủ phát triển
npm run dev

# Mở trình duyệt tại
http://localhost:3000/ai-assistant
```

---

## 4. Kiểm Thử Động Cơ RAG & Thẩm Định Vật Dụng

```bash
# Chạy kiểm thử RAG & Thẩm định vật dụng
npx vitest run tests/itemHazardAssessment.test.ts tests/ragEngine.test.ts tests/ragEvaluation.test.ts
```
Toàn bộ ca kiểm thử vượt qua **100%**, đảm bảo không có ảo giác số liệu và trích dẫn chuẩn mực.
