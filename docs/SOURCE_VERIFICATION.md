# Cơ Chế Xác Thực Trích Dẫn — Source Verification

Tài liệu này trình bày giải pháp đảm bảo tính tin cậy tuyệt đối (Trustworthiness) và chống hiện tượng ảo giác (Anti-Hallucination) trong câu trả lời của SafeHome Copilot.

---

## 1. Nguyên Tắc Cốt Lõi

1. **Không trích dẫn mù mờ**: Mọi thông tin khuyến nghị kỹ thuật (khoảng cách lối đi, vị trí bắt vít thanh vịn, mức độ chiếu sáng đêm) bắt buộc phải có chỉ số trích dẫn `[1]`, `[2]`.
2. **Khả năng kiểm chứng trực tiếp (Verifiability)**: Khi người dùng click vào thẻ trích dẫn `[1]`, giao diện lập tức mở Bảng Thanh Tra Bằng Chứng (Evidence Inspector), làm nổi bật chính xác câu trích nguồn, tên tổ chức y tế, năm công bố và liên kết URL gốc để tra cứu chéo.
3. **Bộ lọc cắt tỉa ảo giác (Hallucination Pruning)**: Nếu mô hình ngôn ngữ lớn (LLM) tự sinh ra một trích dẫn `[5]` trong khi chỉ có 3 đoạn tài liệu được cung cấp trong context, bộ xác thực `citationVerifier.ts` sẽ phát hiện và loại bỏ ký tự `[5]` đó trước khi lưu trữ hoặc trả về cho người dùng.

---

## 2. Cấu Trúc Bản Ghi Trích Dẫn (`StructuredCitation`)

Mỗi nguồn dẫn được trả về dưới định dạng chuẩn:

```typescript
export interface StructuredCitation {
  citationIndex: number;         // Chỉ số [1], [2], ...
  documentId: string;            // Ví dụ: SRC_WHO_2021
  sourceTitle: string;           // Tên tài liệu chính thức
  publisher: string;             // Tổ chức ban hành (WHO, CDC, Bộ Y tế)
  sectionTitle: string;          // Mục/Chương cụ thể trong tài liệu
  pageNumber?: string;           // Trang trong tài liệu gốc (nếu có)
  officialUrl?: string;          // Đường dẫn kiểm chứng trực tuyến
  passageExcerpt: string;        // Đoạn trích dẫn nguyên văn dùng làm căn cứ
  contentHash: string;           // Mã SHA-256 bảo đảm tính toàn vẹn
}
```

---

## 3. Trải Nghiệm Người Dùng Trên Giao Diện

1. **Hiển thị huy hiệu trích dẫn tương tác**:
   Các số hiệu `[1]`, `[2]` trong nội dung phản hồi markdown được render thành các nút tương tác màu xanh (Teal/Emerald badge).
2. **Hover Preview**: Di chuột lên huy hiệu sẽ hiển thị tooltip tóm tắt tổ chức xuất bản và phân đoạn liên quan.
3. **Click để kiểm tra**: Bấm vào huy hiệu sẽ kích hoạt panel bên phải chuyển sang tab **"Bằng chứng đã dùng"**, cuộn đến vị trí phân đoạn tương ứng và hiển thị đoạn trích nguyên văn để người dùng đối chiếu.

