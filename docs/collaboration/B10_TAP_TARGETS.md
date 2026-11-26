# B10 - Vùng chạm trên mobile (P3)

## Cách đo
- `next dev` cổng 3105, `SAFEHOME_PRIVATE_DIR` tạm, đăng ký tài khoản demo cục bộ qua `/api/auth/register`, không gọi Gemini.
- Playwright (Chromium) ở viewport 375x844; đếm `button, a, input, select, summary, textarea, [role=button]` đang hiển thị có chiều rộng hoặc cao < 44 px / < 36 px. Ô tick được tính theo nhãn `<label>` bao quanh. Link nằm trong đoạn văn (ngoại lệ inline của WCAG) đếm riêng: 0 ở mọi trang. Phần tử trong canvas WebGL không phải DOM nên không tính.
- Script đo đặt ngoài repo. Ảnh: `docs/collaboration/b10-screenshots/TAP_before_375_*.png`, `TAP_after_375_*.png` (5 trang chính).

## Trước / sau (375 px)
| Trang | < 44 trước | < 44 sau | < 36 trước | < 36 sau |
|---|---|---|---|---|
| /ai-vision | 33 | 0 | 31 | 0 |
| /digital-twin | 34 | 0 | 29 | 0 |
| /ai-assistant | 17 | 0 | 16 | 0 |
| /risk-assessment | 9 | 0 | 9 | 0 |
| /experience | 28 | 7 | 22 | 7 |
| /explainability | 7 | 1 | 7 | 1 |
| /ai-guided-survey | 12 | 0 | 9 | 0 |
| /simulations | 10 | 0 | 6 | 0 |

Tràn ngang ở 375 px: 0 ở cả 8 trang, trước và sau. Ở 1440 px không tràn và bố cục không đổi (đã xem ảnh chụp).

## Đã đổi
- Thêm `min-h-11 sm:min-h-0` (nút chữ) hoặc `min-h-11 min-w-11 sm:min-h-0 sm:min-w-0` (nút chỉ có icon) vào các `button/a/select/input` trong `ai-vision`, `digital-twin`, `ai-assistant`, `risk-assessment`, `explainability`, `ai-guided-survey`, `simulations` và thanh công cụ 3D `RoomCanvas.tsx`. Từ `sm` (640 px) trở lên kích thước giữ nguyên như cũ.
- Nhãn ô tick ở thanh dưới 3D: `min-h-11 sm:min-h-0`.
- `experience.css` (khối `@media(max-width:760px)` thêm ở cuối): nút chính/phụ, lịch sử, viewbar, select/nút header, thanh công cụ cảnh, link cuối trang, nút Hiệu năng đạt 44 px.
- `globals.css`: nút điều khiển React Flow (zoom, fit, khóa) 44x44 dưới 640 px.
- Thêm `aria-label` cho nút icon-only đang chỉ có `title` (phóng to/thu nhỏ/khôi phục, xác nhận/sửa/từ chối nhãn, xóa/đổi tên hội thoại, bật/tắt bảng tra cứu, xóa phòng, xem báo cáo, bỏ qua giới thiệu). Hành vi không đổi.

## Còn lại và lý do
- `/experience` (7): nút điều hướng chương rộng 30 x cao 44 px. Đủ WCAG 2.5.8 (>= 24 px) nhưng < 44 theo chiều ngang; 7 nút x 44 px không vừa thanh chân trang 375 px cùng nhãn chương.
- `/explainability` (1): link "React Flow attribution" 53x12 do thư viện sinh ra, giữ lại theo giấy phép.
- `/digital-twin` sau lần đo cuối: 0 (ba nút Nhẹ/Vừa/Cao đã thêm `min-w-11`).
- Các nút trong khung 3D bố trí dày hơn trên mobile (thanh công cụ xuống nhiều dòng hơn); chấp nhận để đổi lấy vùng chạm.

## Kiểm tra
`npx tsc --noEmit`: 0 lỗi. `npm test`: 57 file, 486 passed, 1 skipped. `npm run test:experience`: 9 file, 64 passed.
