# Danh Mục & Quy Trình Nạp Tri Thức — Knowledge Base

Tài liệu này hướng dẫn cách tổ chức, chuẩn hóa, phân đoạn (chunking) và quản lý danh mục tài liệu thẩm định trong hệ thống SafeHome Copilot.

---

## 1. Nguồn Tài Liệu Được Thẩm Định (Curated Sources)

Hệ thống chỉ chấp nhận nạp tài liệu từ các cơ quan y tế và tổ chức tiêu chuẩn uy tín:

| Mã Tài Liệu | Cơ Quan Ban Hành | Tên Văn Bản | Năm | Liên Kết Chính Thức |
|---|---|---|---|---|
| `SRC_WHO_2021` | **Tổ chức Y tế Thế giới (WHO)** | Step Safety: WHO Global Report on Falls Prevention in Older Age | 2021 | https://www.who.int/publications/i/item/9789241563536 |
| `SRC_CDC_STEADI_2023` | **Trung tâm Kiểm soát & Phòng ngừa Dịch bệnh Hoa Kỳ (CDC)** | STEADI — Older Adult Fall Prevention: Home Fall Prevention Checklist | 2023 | https://www.cdc.gov/steadi/pdf/steadi-brochure-checkforsafety-508.pdf |
| `SRC_BYT_VN_2020` | **Bộ Y tế Việt Nam** | Hướng dẫn Chăm sóc Sức khỏe Người cao tuổi và Phòng ngừa Tai nạn Thương tích tại Cộng đồng | 2020 | https://moh.gov.vn/cham-soc-suc-khoe-nguoi-cao-tuoi |
| `SRC_NCOA_2022` | **National Council on Aging (NCOA)** | Evidence-Based Falls Prevention Programs and Environmental Modifications | 2022 | https://www.ncoa.org/article/evidence-based-falls-prevention-programs |

---

## 2. Chiến Lược Phân Đoạn Tri Thức (Semantic Chunking Strategy)

Mỗi tài liệu khi nạp vào hệ sinh thái SafeHome được xử lý qua module `src/lib/rag/ingestion.ts` theo quy trình:

```
[Văn bản gốc / Markdown]
         │
         ▼
[Unicode Normalization (NFC)]
         │
         ▼
[Phát hiện ranh giới Heading (#, ##, ###) hoặc đoạn văn kép \n\n]
         │
         ▼
[Cắt đoạn kích thước chuẩn: 250 - 450 từ (overlap 40 từ)]
         │
         ▼
[Tạo mã băm bảo toàn toàn vẹn dữ liệu: SHA-256 Checksum]
         │
         ▼
[Lưu vào cơ sở dữ liệu SQLite: KnowledgeSource & KnowledgePassage]
```

### Quy tắc then chốt:
1. **Bảo tồn tiêu đề phân đoạn (`sectionTitle`)**: Luôn gắn tiêu đề cấp mục lớn vào từng đoạn văn con để phục vụ việc tăng trọng số tìm kiếm (title boosting).
2. **Không cắt ngang cụm từ thông số kỹ thuật**: Ví dụ: "80 - 90 cm", "32mm đến 38mm", "150 kg", "30-50 lux".
3. **Mã băm chống trùng lặp**: Mỗi đoạn văn bản được tạo SHA-256 hash từ nội dung thuần túy; các tài liệu nạp lại mà không sửa đổi sẽ tự động được nhận diện để tránh tạo bản ghi dư thừa.

---

## 3. Quy Trình Nạp Tài Liệu Mới Qua API

SafeHome cung cấp API Endpoint chuyên dụng để thêm tài liệu đã được thẩm định chuyên môn:

### Endpoint: `POST /api/rag/documents`
```json
{
  "documentId": "SRC_VN_TCVN_2024",
  "title": "Tiêu chuẩn Quốc gia TCVN: Thiết kế Nhà ở cho Người cao tuổi",
  "publisher": "Viện Kiến trúc Quốc gia & Bộ Xây Dựng",
  "publicationDate": "2024",
  "officialUrl": "https://example.gov.vn/tcvn-nha-o-nguoi-cao-tuoi",
  "rawText": "# Tiêu chuẩn sàn nhà vệ sinh\nSàn nhà vệ sinh cho người cao tuổi phải có hệ số ma sát động tối thiểu 0.6 khi ướt...\n\n# Tiêu chuẩn tay vịn\nTay vịn cần được gia cố chịu tải trọng tối thiểu 150 kg..."
}
```

### Phản hồi:
```json
{
  "success": true,
  "message": "Tài liệu SRC_VN_TCVN_2024 đã được nạp và phân mảnh thành 2 đoạn tri thức thành công.",
  "documentId": "SRC_VN_TCVN_2024",
  "totalChunks": 2,
  "contentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

