# B10 (lite) — Truy cập được và dùng được trên điện thoại cho /workflow

Phạm vi: 7 bước `/workflow`, `AppHeader`, `StepNav` mới. Không đụng lõi rủi ro, nhãn nguồn gốc, hay các chốt chặn "chưa thể đánh giá" / không "an toàn" của B09.

## Cách đo
- `next dev` cổng riêng, `SAFEHOME_PRIVATE_DIR` tạm, tài khoản demo cục bộ, đường "Bỏ qua AI", không gọi Gemini.
- Ảnh chụp trong `docs/collaboration/b10-screenshots/DEMO_before_*` và `DEMO_after_*` (bước 1/3/5/7 ở 375 và 1440; bước 5 ở 320; bước 3 ở viewport 640 px, tương đương zoom 200% của màn 1280). Ảnh chụp bằng viewport rất cao để thấy cả trang (vùng cuộn nằm trong `main`).
- Số liệu lấy bằng script đo trong trình duyệt (kích thước nút tương tác, cỡ chữ tính toán, `scrollWidth`).

## Trước / sau (số liệu đo thật)
| Chỉ tiêu | Trước | Sau |
|---|---|---|
| Tràn ngang ở 375 px (bước 1/3/5/7) | 686 px ở cả 4 bước (chip header) | 375 px, không tràn |
| Tràn ngang ở 320 px, bước 5 | 686 px | 320 px, không tràn |
| Tràn ngang ở 640 px, bước 3 | 694 px | 640 px, không tràn |
| Tràn ngang ở 1440 px | không | không |
| Chữ < 12 px, bước 1 / 5 / 7 (375 px) | 34 / 33 / 26 nút chữ | 0 / 4 / 0 |
| Mục tương tác < 44 px, bước 1 (375 px) | 13 | 1 (logo, đã sửa sau lần đo) |
| Mục tương tác < 44 px, bước 7 | 21 | 6 (5 ô tick 20x20 nằm trong nhãn 44 px, 1 logo) |
| Mục tương tác < 44 px, bước 5 | 27 | 19 (thanh công cụ 3D) |
| Thanh bước trên điện thoại | 7 ô chiếm ~400 px, sticky | "Bước 3/7 — tên", thanh tiến độ, mục "Xem tất cả 7 bước" |

## Tương phản (tỉ lệ tính theo công thức WCAG)
| Cặp | Trước | Sau |
|---|---|---|
| Chữ trắng trên teal (nút chính) | 3.74 (teal-600) | 5.47 (teal-700) |
| Chữ trắng trên sky (gradient nút bước 1) | 4.10 | 5.93 |
| Chữ trắng trên emerald (nút xác minh) | 3.77 | 5.48 |
| Chữ phụ trên nền trắng | 2.56 (slate-400) | 7.58 (slate-600) |
| Chữ emerald trên nền emerald-50 | 5.21 | 7.29 |
| Chữ rose trên nền rose-50 | 5.72 | 8.71 |
| Chữ amber trên nền amber-50 | 6.84 | 8.75 |
| Viền focus teal-700 trên trắng | (không có chuẩn) | 5.47 (cần >= 3) |
| Chữ trắng trên slate-700 ("Chưa biết" đang chọn) | — | 10.35 |
Không đo: chữ trong cảnh 3D (nền thay đổi), màu trên gradient sidebar.

## Đã sửa
- `StepNav`: một nút chính lớn (48 px, trên cùng ở điện thoại), nút Quay lại phụ; khi bận hiện spinner và "Đang lưu hiện trạng…"/"Đang chuyển…"/"Đang lưu…". Nút header "Tiếp tục" cũng hiện trạng thái bận.
- Stepper nén trên điện thoại; mỗi ô bước là `<ol>` + `aria-current="step"`; ô >= 44 px.
- Header: chip tự xuống dòng, không sticky trên điện thoại; nút ngày/đêm có `aria-label`, `aria-pressed`; "Đăng xuất" >= 44 px.
- Checklist: ba nút lưới 3 cột, cao 44 px, chữ 16 px trên điện thoại; "Chưa biết" vẫn là mặc định (màu xám đậm để không giống đã trả lời).
- Gợi ý AI: Chấp nhận / Sửa nhãn / Loại cao 44 px, xếp xuống dòng; nút Quay lại bước thay vì nhảy sai bước ("Bỏ qua AI" nay sang bước 4 thay vì quay về bước 2).
- Ô nhập 16 px (tránh iOS tự phóng to), ô chọn tệp có nhãn và nút 44 px, ô đồng ý lớn hơn.
- Hộp thoại "Giải thích": `role="dialog"`, `aria-modal`, nhãn, Esc để đóng, focus vào hộp rồi trả lại nút mở, bấm nền để đóng, nút đóng có `aria-label`.
- Thẻ nguy cơ: mức độ có biểu tượng + chữ (không chỉ màu); "Làm nổi vật thể 3D" là nút thật dùng được bằng bàn phím.
- Đoạn lưu ý dài thu gọn: câu ngắn + "Xem thêm".
- Focus-visible toàn cục (viền 3 px), `prefers-reduced-motion`.
- Canvas 3D: cao 300–320 px trên điện thoại, `max-w-full`; `WebGLBoundary` có sẵn vẫn hiện danh sách khi WebGL lỗi (chưa mô phỏng lỗi WebGL).
- Bàn phím xe lăn 3D: nhãn tiếng Việt, 44 px.

## Danh sách kiểm WCAG 2.2 AA cơ bản
| Tiêu chí | Kết quả | Bằng chứng |
|---|---|---|
| 1.1.1 Văn bản thay thế (nút icon) | Đạt (phần đã sửa) | `aria-label` ở nút đóng, ngày/đêm, xe lăn; icon trang trí `aria-hidden` |
| 1.3.1 Cấu trúc | Đạt một phần | `ol`, `details`, `fieldset`, `h1/h2` có; bảng bước 7 chưa kiểm đọc màn hình |
| 1.4.1 Không chỉ dùng màu | Đạt | mức nguy cơ có ▲/●/○ + chữ; trạng thái bước có số/dấu tích |
| 1.4.3 Tương phản chữ 4.5:1 | Đạt cho các cặp đã đo; chưa đo toàn bộ | bảng trên |
| 1.4.4 Phóng 200% | Đạt (mô phỏng viewport 640 px, không tràn) | ảnh `DEMO_after_640_step3` |
| 1.4.10 Reflow 320 px | Đạt ở bước 1 và 5 | scrollWidth 320; chưa đo bước 2,3,4,6,7 ở 320 |
| 1.4.12 Giãn chữ | Chưa kiểm | — |
| 2.1.1 Bàn phím | Đạt ở luồng đã đi | Tab qua header, form; Space chọn checklist; Enter mở hộp thoại |
| 2.1.2 Không bẫy bàn phím | Đạt ở hộp thoại | Esc đóng, focus trả về nút "Giải thích" |
| 2.4.1 Bỏ qua khối | Không đạt | chưa có skip link |
| 2.4.7 Focus nhìn thấy | Đạt | outline solid 3 px đo được ở mọi phần tử đã Tab |
| 2.5.8 Kích thước mục tiêu | Đạt một phần | còn thanh công cụ 3D (24 px), ô tick 20 px (nhãn 44 px) |
| 3.3.2 Nhãn/hướng dẫn | Đạt một phần | ô số đo có nhãn; ô chọn nguồn có `aria-label` |
| 3.1.1 Ngôn ngữ | Đạt | `<html lang="vi">` |
| 4.1.2 Tên/vai trò | Đạt phần đã sửa | `aria-pressed`, `aria-current`, `role=dialog` |
| 4.1.3 Thông báo trạng thái | Đạt một phần | chip lưu có `role=status`; chưa kiểm bằng trình đọc màn hình |
| Trình đọc màn hình thật (VoiceOver/TalkBack) | Chưa kiểm | — |

## Ghi chú bàn phím (đi thật, 375 px)
Tab: cổng dev Next (chỉ môi trường dev) → logo → Đăng xuất → "Xem tất cả 7 bước" → "Xem thêm" → ô tên dự án → ô mô tả → các thẻ gợi ý. Mỗi phần tử có outline 3 px. Checklist: focus nút "Có" + Space đổi `aria-pressed` đúng. Bước 5: Enter ở "Giải thích" mở hộp thoại, focus nằm trong hộp; Esc đóng và trả focus về nút.

## Còn lại (mức độ)
- Cao: thanh công cụ 3D (`RoomCanvas`: ánh sáng, góc nhìn, Fit, Chụp…) cao ~24 px, và còn ~4 nhãn < 12 px trong cảnh; nút/nhãn đánh dấu trong cảnh chưa chỉnh. Cần thiết kế lại thanh công cụ cho cảm ứng.
- Trung bình: chữ thân chủ yếu 14 px (câu hỏi checklist, nút chính, ô nhập, đoạn lưu ý là 16 px trên điện thoại); chưa đạt "mọi chữ 16 px".
- Trung bình: chưa có skip link; chưa kiểm VoiceOver/TalkBack; chưa kiểm giãn chữ 1.4.12.
- Trung bình: chưa mô phỏng WebGL lỗi để xác nhận danh sách vẫn dùng được (chỉ đọc mã `WebGLBoundary`).
- Thấp: AppSidebar và các trang ngoài `/workflow` chỉ đổi cỡ chữ/màu máy móc, chưa kiểm tra bố cục; `npm run lint` không chạy được (chưa cài ESLint).
- Thấp: chuyển bước bằng nút trên đầu (desktop) và cuối bước đều còn; chưa thử với người dùng thật.

## Kịch bản thử nghiệm 10 phút cho B11 (không bịa SUS)
Chuẩn bị: điện thoại thật, tài khoản demo, đường "Bỏ qua AI". Người thử: 1 người cao tuổi hoặc người chăm sóc. Người quan sát không gợi ý; ghi giờ bằng đồng hồ bấm.
1. (1 phút) Giải thích ngắn rồi để tự mở `/workflow`. Đo: giờ tới khi chọn xong loại phòng; có hiểu "Bước 1/7" không (hỏi: "Bạn đang ở đâu trong quy trình?").
2. (3 phút) Trả lời checklist bước 2: Đo: tổng thời gian; số lần bấm sai/bấm lại; số mục để "Chưa biết" và lý do họ nói; có chạm trượt nút nào.
3. (1 phút) Bước 3: nhiệm vụ "Bạn không muốn gửi ảnh, hãy tiếp tục". Đo: giờ tìm thấy "Bỏ qua AI"; có lúng túng không.
4. (2 phút) Bước 5: "Cho biết phòng có điểm nguy hiểm nào và điều gì chưa biết được". Đo: có nói đúng "chưa thể đánh giá, không phải an toàn" không; mở "Giải thích" được không; đóng bằng nút/Esc.
5. (2 phút) Bước 6–7: chọn một thay đổi, lưu mô phỏng, đọc kết quả. Đo: có hiểu "mô phỏng, chưa xác minh ngoài thực tế" không; thấy trạng thái "Đang lưu…" có tin không; lỗi/nhầm.
6. (1 phút) Hỏi tự do: chỗ nào khó đọc/khó chạm; có muốn chữ to hơn không. Ghi nguyên văn câu trả lời.
Ghi cho mỗi nhiệm vụ: thành công/không, thời gian, số lỗi, trích dẫn. Chỉ báo cáo số quan sát thật; không quy đổi thành điểm SUS khi chưa dùng bảng SUS đầy đủ với đủ người thử.
