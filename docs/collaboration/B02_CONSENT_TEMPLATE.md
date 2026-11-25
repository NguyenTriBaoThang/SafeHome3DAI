# B02 — Mẫu phiếu đồng ý cung cấp ảnh phòng (bản nháp)

> **Bản nháp kỹ thuật.** Chưa được luật sư hoặc hội đồng đạo đức duyệt. Phải được rà soát trước khi dùng với hộ gia đình thật. Các mục `[ĐIỀN]` do nhóm điền.

Ảnh chỉ được lưu trong `/.private/` trên máy của nhóm. Thư mục này nằm trong `.gitignore` (dòng 68: `/.private/`, đã kiểm tra). **Không commit ảnh thật, không đưa lên repo, không dán vào tài liệu.**

---

## PHIẾU ĐỒNG Ý CUNG CẤP ẢNH PHÒNG NGỦ / PHÒNG TẮM

**Dự án:** SafeHome 3D AI, công cụ hỗ trợ sàng lọc yếu tố môi trường gây té ngã. Không phải thiết bị y tế, không chẩn đoán, không bảo đảm loại bỏ nguy cơ.
**Người liên hệ của nhóm:** `[ĐIỀN: họ tên, điện thoại/email]`

**Mã phiếu (`consent_id`):** `[ĐIỀN: vd CON-0001]`  **Mã hộ gia đình (`household_id`):** `[ĐIỀN: vd HH-001]`  **Ngày:** `__/__/____`

### 1. Mục đích (đánh dấu từng mục bạn đồng ý; có thể chọn một phần)

- [ ] **Kiểm thử:** dùng ảnh để kiểm tra phần mềm có nhận diện đúng vật thể/mối nguy không.
- [ ] **Nghiên cứu:** dùng ảnh và nhãn đã gán để tính độ chính xác của hệ thống (chỉ trong bộ kiểm thử, không dùng để huấn luyện hay chỉnh tham số).
- [ ] **Trình diễn (demo):** hiển thị ảnh trong buổi báo cáo/trình bày nội bộ `[ĐIỀN: phạm vi người xem]`.

### 2. Dịch vụ AI bên thứ ba (tách riêng, mặc định KHÔNG chọn)

- [ ] **Tôi cho phép gửi ảnh của tôi tới dịch vụ AI bên thứ ba (Google Gemini)** để phân tích. Ảnh sẽ rời khỏi máy của nhóm và được xử lý theo chính sách của nhà cung cấp.

Nếu không chọn ô này, ảnh **không** được gửi đi; chỉ phân tích cục bộ hoặc gán nhãn thủ công (`approved_for_third_party = false`).

### 3. Những gì xin bạn KHÔNG chụp vào ảnh

Người (kể cả ảnh/chân dung treo tường), khuôn mặt, giấy tờ, thuốc có nhãn tên, thư từ, số nhà/biển địa chỉ, màn hình, ảnh gia đình. Nếu lỡ chụp phải, nhóm sẽ che hoặc loại ảnh đó và không dùng.

### 4. Xử lý và lưu trữ

- Trước khi dùng, nhóm **xóa metadata EXIF (gồm GPS, model máy)** khỏi mọi ảnh.
- Lưu ở nơi riêng tư, không công khai: `/.private/` trên `[ĐIỀN: máy/ổ đĩa mã hóa]`. Không lên CDN, không lên repo.
- Người được truy cập: `[ĐIỀN: danh sách tên, tối đa số người cần thiết]`; mỗi lần truy cập chỉ phục vụ mục đích đã chọn ở mục 1.
- Không bán, không chia sẻ ngoài danh sách trên và (nếu đã chọn mục 2) nhà cung cấp AI.
- **Thời hạn lưu giữ:** `[ĐIỀN: ví dụ đến hết ngày __/__/____ hoặc __ tháng]`; hết hạn ảnh bị xóa và ghi lại việc xóa.

### 5. Quyền rút lại

Bạn có thể rút lại đồng ý **bất cứ lúc nào, không cần nêu lý do**, bằng cách liên hệ `[ĐIỀN: kênh]` kèm `consent_id`. Trong vòng `[ĐIỀN: số ngày]` nhóm sẽ: (a) xóa ảnh gốc và bản sao, (b) loại các dòng liên quan khỏi manifest, (c) báo lại cho bạn. Dữ liệu đã gửi tới bên thứ ba có thể không thu hồi được bằng thao tác của nhóm; việc xóa phía nhà cung cấp theo chính sách của họ. Rút lại không ảnh hưởng đến bạn.

### 6. Xác nhận

Tôi đã đọc và hiểu phiếu này, được hỏi lại các điều chưa rõ, và tự nguyện tham gia.

| | |
| :--- | :--- |
| Họ tên người đồng ý | `[ĐIỀN]` |
| Chữ ký | |
| Quan hệ với người sống trong nhà (nếu ký thay) | `[ĐIỀN]` |
| Ngày | `__/__/____` |
| Người của nhóm lập phiếu | `[ĐIỀN]` |

---

## Đặc tả manifest (nội bộ, đặt trong `/.private/`, không commit)

Một dòng cho mỗi ảnh (CSV/JSONL):

| Cột | Ý nghĩa / giá trị |
| :--- | :--- |
| `image_id` | Mã ảnh duy nhất |
| `household_id` | Mã hộ; chia dữ liệu theo hộ, không tách ảnh cùng hộ ra nhiều tập |
| `consent_id` | Trỏ về phiếu; ảnh không có phiếu hợp lệ thì không được vào manifest |
| `room_type` | `BEDROOM` \| `BATHROOM` |
| `scene_id` | Một cảnh/góc chụp; nhiều ảnh cùng cảnh dùng chung |
| `lighting` | vd `day` \| `night` \| `mixed` \| `unknown` |
| `occlusion` | vd `none` \| `partial` \| `heavy` |
| `approved_for_third_party` | `true`/`false`, bằng ô ở mục 2; `false` thì **không** gọi Gemini |
| `split` | **luôn là `test`** (bộ kiểm thử khóa, xem `CONTEXT.md`) |
| `reviewer` | Người review thứ hai (không phải người gán nhãn đầu) |
| `private_path` | Đường dẫn tương đối trong `/.private/`; không để đường dẫn tuyệt đối/địa chỉ nhà |

Quy tắc: rút đồng ý = xóa dòng + xóa file + ghi nhật ký; ảnh chưa qua bước xóa EXIF và kiểm "không có người/giấy tờ" thì không được có `private_path`.
