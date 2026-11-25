# Task A08 — Chuẩn hóa kho tri thức RAG & Trích dẫn kiểm chứng

## 1. Kiến trúc Registry tài liệu và luồng phê duyệt nguồn
- **File chính:** `src/lib/rag/documentRegistry.ts`, `src/lib/rag/ingestion.ts`, `src/data/curatedKnowledge.ts`
- Mỗi nguồn tài liệu bắt buộc có metadata:
  - `documentId`, `title`, `publisher` / `organization`
  - `officialUrl` / `accessLink` (kiểm tra bởi `validateOfficialSourceUrl`, từ chối URL rỗng, `example.com`, `localhost`, `javascript:`)
  - `publicationDate`, `lastVerifiedAt`, `language`, `license`, `version`
  - `contentHash` (SHA-256 hex 64 ký tự khớp chính xác nội dung chuẩn hóa của tài liệu và từng đoạn trích)
- **Luồng phê duyệt (`PENDING` -> `APPROVED` / `REJECTED`):**
  - Mọi tài liệu nạp mới qua `ingestDocument()` hoặc `POST /api/rag/documents` mặc định mang trạng thái `approvalStatus = "PENDING"`.
  - Chỉ tài liệu đã qua `approveDocument()` (`approvalStatus === "APPROVED"`) và còn trong thời hạn xác minh (`DEFAULT_DOCUMENT_MAX_AGE_DAYS = 365`, không đánh dấu `OUTDATED`) mới được `retrieveEvidenceChunks()` truy xuất.

## 2. Schema trích dẫn & `sourceSupportMap`
- Mở rộng `StructuredCitation` (`src/lib/rag/types.ts`):
  - `documentId`, `chunkId`, `sectionTitle`, `pageNumber`, `sourceSpan: { startOffset, endOffset }`
  - `accessLink` / `officialUrl`, `version`, `contentHash`, `license`, `publicationDate`, `lastVerifiedAt`
- `verifyAndFormatCitations()` tạo `sourceSupportMap: SourceSupportEntry[]`:
  - Đối chiếu từng câu phát biểu gắn `[n]` với nội dung đoạn trích `[n]` (`evaluateClaimSupportAgainstChunk`).
  - Khi phát hiện **retrieved mismatch** hoặc **URL giả/không hợp lệ**, đánh dấu `supported: false`, gỡ bỏ `[n]`, loại trích dẫn sai khỏi `citations` và ghi cảnh báo.
- Mọi phản hồi từ `generateGroundedAnswer()` / `processCopilotChat()` đi kèm `documentAuditTrail` ghi nhận phiên bản tài liệu (`documentId`, `version`, `contentHash`, `approvalStatus`) và được lưu vết vào `PersistenceAuditEvent` (`RAG_RESPONSE_AUDIT / DOCUMENT_VERSIONS_EVALUATED`).

## 3. Phân tách nội dung & Cơ chế từ chối (`INSUFFICIENT_EVIDENCE`)
- Mọi câu trả lời có căn cứ tách biệt 2 phần rõ ràng:
  1. **Khuyến nghị theo tài liệu đã thẩm định (`evidenceBreakdown.documentRecommendations`)**
  2. **Kết luận theo tình huống tự khai / dữ liệu phòng (`evidenceBreakdown.selfReportedSituationNotes`)**
- Khi thiếu bằng chứng (câu hỏi ngoài corpus, nguồn đã bị xóa `removeDocument`, nguồn quá hạn `markDocumentOutdated` hoặc `PENDING`/`REJECTED`), hệ thống trả lời rõ **"chưa đủ bằng chứng"** kèm hướng dẫn **kiểm tra thủ công** tại hiện trường.

## 4. Ví dụ hỏi - đáp có trích dẫn kiểm chứng (phối hợp Thành viên 2 — B12)
1. **Hỏi:** *"Tại sao thảm trải sàn không cố định lại nguy hiểm cho người cao tuổi?"*
   - **Khuyến nghị theo tài liệu:** Thảm không cố định và mép thảm quăn là nguyên nhân hàng đầu gây vấp ngã; cần cố định mép bằng băng dính hai mặt hoặc lớp lót chống trượt (`[1]` WHO `SRC_WHO_2021` v2.1, trang 34, span 1200–1540; `[2]` NCOA `SRC_NCOA_2023` v2023.2, trang 12, span 1100–1470).
2. **Hỏi:** *"Nên chọn thanh vịn chất liệu gì cho nhà tắm?"*
   - **Khuyến nghị theo tài liệu:** Lắp thanh vịn chịu tải tối thiểu 150 kg tại bồn cầu và buồng tắm ở độ cao 80–90 cm; chọn inox vân sần/nhám hoặc bọc nhựa chống trượt, tránh giác hút chân không (`[1]` WHO `SRC_WHO_2021`, trang 51; `[2]` Bộ Y tế `SRC_BYT_VN_2020`, trang 22).
3. **Hỏi ngoài phạm vi tài liệu:** *"Cách ép xung GPU RTX 5090 để chạy mô hình?"*
   - **Phản hồi:** `"Chưa đủ bằng chứng trong kho tài liệu đã kiểm chứng..."` (`responseMode = REFUSAL_INSUFFICIENT`, `citations = []`) kèm hướng dẫn kiểm tra thủ công an toàn môi trường.

