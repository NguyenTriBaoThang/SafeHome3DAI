# SafeHome AI Guided Home Safety Survey — Khảo Sát Không Gian Sống Thông Minh Bằng AI

SafeHome AI Guided Survey là module khảo sát môi trường nhà ở thông minh, tương tác từng bước và tự động thích ứng theo câu trả lời của gia đình người cao tuổi trong nền tảng **SafeHome 3D AI**.

---

## 1. Mục Tiêu & Sứ Mệnh

Khác với các bảng câu hỏi tĩnh truyền thống (nơi hiển thị hàng chục câu hỏi cùng lúc khiến người dùng bối rối), SafeHome AI Guided Survey:
1. **Hỏi từng câu một theo tiến trình hội thoại thông minh**.
2. **Tự động nhánh hóa và loại trừ các câu hỏi không liên quan** (Ví dụ: Nếu phòng không có thảm, hệ thống tự động bỏ qua câu hỏi về việc cố định thảm; nếu có thảm, câu hỏi cố định sẽ lập tức được ưu tiên).
3. **Chấp nhận cả lựa chọn nút bấm và câu trả lời tự nhiên bằng tiếng Việt** (Ví dụ: *"Có một cái thảm nhỏ cạnh giường nhưng nó hay bị xê dịch"* -> Tự động trích xuất thành `rugPresent = true` và `rugSecured = false`).
4. **Cơ chế xác nhận trước khi lưu (Confirmation Layer)**: Đảm bảo người dùng luôn nắm quyền kiểm soát đối với các dữ liệu AI trích xuất.
5. **Tự động số hóa thành Hồ sơ phòng (`RoomProfile`) chuẩn hóa** và chuyển tiếp trực tiếp sang động cơ đánh giá mối nguy, mô hình 3D Digital Twin và trợ lý Copilot.

---

## 2. Giao Diện 3 Bảng Điều Khiển (3-Panel Architecture)

```
┌─────────────────────────┬───────────────────────────┬─────────────────────────┐
│  PANEL 1: NAVIGATOR     │  PANEL 2: AI CONVERSATION │  PANEL 3: ROOM PROFILE  │
│                         │                           │                         │
│  - Chọn / Tạo hồ sơ nhà │  - Trợ lý AI hỏi từng câu │  - Kích thước & Vật liệu│
│  - Danh sách phòng:     │  - Giải thích ngữ cảnh    │  - Tình trạng sàn, ánh  │
│    + Phòng ngủ          │  - Tùy chọn Có/Không/Chưa │    sáng, thảm, dây điện │
│    + Nhà vệ sinh        │  - Khung trả lời tự nhiên │  - Danh sách Mối nguy   │
│  - Thanh tiến độ (%)    │  - Nút Quay lại / Tiếp tục│    phát hiện thời gian  │
│  - Lịch sử câu đã trả   │  - Hoàn thành & Tóm tắt   │    thực kèm khuyến nghị │
│    lời (nhảy nhanh)     │                           │  - Ảnh chụp & AI Vision │
└─────────────────────────┴───────────────────────────┴─────────────────────────┘
```

- **Bảng bên trái (Survey Navigator)**:
  - Cho phép chuyển đổi giữa các căn nhà hoặc tạo khảo sát mới.
  - Hiển thị danh sách các phòng với huy hiệu trạng thái: `Chưa bắt đầu`, `Đang khảo sát`, `Đã hoàn thành`.
  - Hiển thị danh sách lịch sử câu đã trả lời, cho phép bấm vào bất kỳ câu nào để xem lại hoặc sửa đổi.
- **Bảng ở giữa (AI Guided Conversation)**:
  - Trợ lý AI hiển thị **duy nhất một câu hỏi chính tại một thời điểm**.
  - Cung cấp lời giải thích trợ giúp (Help text) tại sao câu hỏi này quan trọng đối với an toàn người già.
  - Điều khiển đầu vào đa dạng: Lựa chọn Có/Không, Chọn một, Chọn nhiều, Nhập kích thước (Dài x Rộng), Ghi chú tự do, và nút "Chưa rõ / Không biết".
  - Tích hợp khung nhập tiếng Việt tự nhiên: Nhập ngôn ngữ hội thoại thường ngày -> AI phân tích và đề xuất giá trị có cấu trúc.
- **Bảng bên phải (Room Profile Inspector)**:
  - **Tab 1: Hồ sơ phòng**: Hiển thị trạng thái dữ liệu các hạng mục (kích thước, sàn, chiếu sáng, thảm, dây điện, vật cản, tay vịn) và tỷ lệ hoàn thiện hồ sơ.
  - **Tab 2: Mối nguy sàng lọc**: Danh sách các phát hiện môi trường được kích hoạt theo thời gian thực (Real-time screening findings) phân loại theo mức độ ưu tiên (`Cần ưu tiên kiểm tra`, `Nên xem xét cải thiện`) và dẫn chiếu tài liệu WHO, CDC.
  - **Tab 3: Ảnh & AI Vision**: Xem trước ảnh chụp phòng thực tế và các gợi ý phân tích trực quan.

---

## 3. Quy Trình Khảo Sát Thích Ứng (Survey Workflow)

1. **Khởi tạo khảo sát**: Nhập tên nhà ở, đặc điểm người cao tuổi (ví dụ: *"Cụ bà 80 tuổi, đi lại chậm"*), chọn phòng ban đầu.
2. **Khảo sát thích ứng từng bước**: Trả lời các câu hỏi tuần tự. Mỗi câu trả lời được lưu tức thì (autosave) vào cơ sở dữ liệu SQLite.
3. **Cập nhật và hủy bỏ phụ thuộc (Stale Dependency Invalidation)**:
   - Nếu người dùng ban đầu chọn *"Có thảm"* và trả lời câu hỏi phụ *"Thảm chưa cố định"*.
   - Sau đó người dùng quay lại sửa thành *"Không có thảm"*.
   - Động cơ luồng khảo sát lập tức phát hiện câu hỏi phụ đã mất hiệu lực, tự động xóa câu trả lời cũ khỏi cơ sở dữ liệu và hủy kích hoạt cảnh báo nguy cơ thảm trượt.
4. **Hoàn thành phòng & Chuyển giao dữ liệu**:
   - Khi hoàn thành 100% câu hỏi áp dụng, phòng chuyển sang trạng thái `COMPLETED`.
   - Dữ liệu được đóng gói thành `RoomProfile` JSON sẵn sàng cho việc:
     - Xuất tệp JSON báo cáo.
     - Khởi tạo dự thảo không gian 3D (`convertRoomProfileToSceneDraft`).
     - Gửi ngữ cảnh sang SafeHome Copilot (`/ai-assistant`) để tư vấn chuyên sâu.

