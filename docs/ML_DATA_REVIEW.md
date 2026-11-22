# Duyệt dữ liệu ảnh — Giai đoạn 1

Chạy từ thư mục gốc repo bằng PowerShell. Công cụ chỉ dùng máy local, Python 3.13 và Pillow; không cần Gemini/API key, không gửi ảnh ra ngoài. Không train, chia tập hoặc tiền gán nhãn nguy cơ ở giai đoạn này.

## Mở công cụ duyệt

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/review_dataset.py
```

Mở **http://127.0.0.1:8765**. Nếu server đang chạy sẵn thì chỉ cần mở URL; không chạy hai server trên cùng thư mục review. Đóng terminal hoặc Ctrl+C để dừng server chạy thủ công. Nếu cổng bận, thêm `--port 8766` và dùng URL tương ứng được in ra.

1. Nhập tên người duyệt. Bộ lọc mặc định chỉ hiện ảnh chưa duyệt, ảnh có đề xuất xem xét ở trước.
2. Xem ảnh và cảnh báo; bấm hiển thị nếu ảnh art/nghi nhạy cảm bị che. Metadata chỉ là gợi ý, không phải kết luận về nội dung.
3. Chọn **Giữ (K)** nếu ảnh là ảnh chụp thật trong nhà ở, đúng phòng, đủ rõ, phù hợp để gán nhãn. Không giữ chỉ vì ảnh đẹp hoặc không thấy nguy cơ. Không có nguy cơ nhìn thấy không có nghĩa mọi nguy cơ đều âm tính.
4. Chọn **Loại (X)** cho tranh, bản vẽ, cảnh ngoài trời, tàu/toa tàu, bệnh viện, hầm, cảnh không phải nhà ở, nội dung không phù hợp, ảnh lỗi hoặc ảnh không phục vụ mục tiêu. Chọn **Cần thay (T)** nếu cần ảnh khác rõ hơn/đúng cảnh/đủ quyền sử dụng; ghi lý do.
5. Có người trong ảnh: kiểm tra sự phù hợp và quyền riêng tư/đồng ý; nếu không đủ căn cứ thì Cần thay. Công cụ chưa tự nhận diện người hoặc nội dung nhạy cảm từ pixel.
6. Dùng ←/→ hoặc nút Trước/Sau để bỏ qua tạm thời; chưa ghi quyết định thì vẫn chưa duyệt. Bộ lọc Tất cả/Đã giữ/Đã loại/Cần thay cho phép sửa quyết định; nút Đưa về chưa duyệt xóa trạng thái hiện tại và giữ lịch sử.

Các phím tắt không hoạt động khi đang nhập ghi chú/tên. Sau khi lưu thành công, ảnh tiếp theo được hiển thị. Quyết định lưu ngay xuống đĩa; reload hoặc khởi động server lại không mất tiến độ. Nếu hai tab xung đột, công cụ từ chối ghi đè và yêu cầu Nạp lại. Nội dung ghi chú chưa bấm lưu không được tự lưu khi chuyển ảnh.

**Giữ chỉ xác nhận cảnh.** Nhãn vật thể, nhãn nguy cơ và `human_risk_verified` chưa được thay đổi. Ảnh Giữ nhưng thiếu giấy phép hoặc sai checksum/file vẫn không được đưa vào ứng viên đủ điều kiện. Cờ `candidate_eligible` là kiểm tra metadata/file cho bước tiếp theo, không tự tạo bộ cuối hay quyền phân phối.

## File dữ liệu và khả năng khôi phục

| File | Ý nghĩa |
|---|---|
| `data/raw/` | Bản nguồn giải nén, không ghi đè ảnh/manifest/nhãn. Manifest SHA-256: `750ba47724261bd8cbb3b633c60032ea670d1d1709c9ca35db8bf0621d52c4ce`. |
| `data/review/audit.json`, `audit_images.csv` | Kích thước, SHA-256/dHash tính lại, lỗi, ứng viên trùng/gần trùng, lý do tiền lọc mỗi ảnh. |
| `data/review/decisions.json` | Nguồn quyết định chính: image ID, Keep/Reject/Replace, người duyệt, ghi chú, thời gian UTC, revision và lịch sử trước/sau. Chỉ được tạo sau quyết định đầu tiên. Gắn fingerprint manifest để tránh lẫn dataset. |
| `data/review/manifest_reviewed.csv` | Working manifest: giữ các cột nguồn; cập nhật `human_scene_verified` theo quyết định và thêm các cột review. Không thay thế manifest raw. |
| `data/review/shortfalls.json` | Tiến độ và số thiếu theo phòng, cập nhật mỗi lần lưu/xuất. |
| `reports/audit.md` | Báo cáo audit dữ liệu thật, gồm thống kê room/category/license, tình trạng nhãn và kịch bản thiếu ảnh. |
| `ATTRIBUTION.md` | Sinh tự động từ toàn bộ manifest nguồn; giữ credit/author/license nguồn, không phải danh sách bộ cuối đã duyệt. |

Trong working manifest: Giữ → `human_scene_verified=true`; Loại/Cần thay → `false`; chưa duyệt → ô trống (unknown). Chỉ chấp nhận đúng `true` khi lọc ảnh cho các giai đoạn tiếp theo; không dùng truthiness của chuỗi `"false"`. `dataset_split` vẫn là `evaluation`, không chuyển thành train/val/test. `human_risk_verified` và file nhãn raw giữ nguyên.

Sao lưu cả `data/raw/` và `data/review/` sang vị trí riêng do bạn quản lý; hai thư mục được Git ignore. Nếu mất working CSV, tái tạo từ quyết định bằng:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/review_dataset.py --export-only
```

Nút tải manifest trong UI xuất cùng dữ liệu này. Không sửa `decisions.json` bằng tay trong lúc server chạy. Không sửa working CSV để ghi tiến độ: lần xuất sau sẽ tái tạo từ quyết định.

## Cài lại môi trường và chạy lại audit

```powershell
python -m venv .venv-ml
.\.venv-ml\Scripts\python.exe -m pip install -r scripts/ml/requirements.txt
```

Lần nhập dataset mới, đích `data/raw/` phải chưa tồn tại. Script kiểm đường dẫn ZIP/symlink/trùng tên và giải nén vào staging trước; từ chối ghi đè dữ liệu hiện có:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/import_dataset.py 'C:\Users\ThangNTB\Desktop\SafeHome3DAI_500_images.zip'
```

Chạy audit hoặc cập nhật báo cáo sau khi duyệt:

```powershell
.\.venv-ml\Scripts\python.exe scripts/ml/audit_dataset.py
.\.venv-ml\Scripts\python.exe scripts/ml/review_dataset.py --export-only
```

Tham số tiền lọc tùy chọn: `--min-short-edge 384`, `--near-distance 4` (Hamming 0..64). Đây là ngưỡng chất lượng ảnh/near-duplicate, không phải ngưỡng y khoa. Thay đổi chúng làm thay đổi đề xuất, không thay quyết định đã lưu. Sau khi chạy lại audit, khởi động lại review server để đọc snapshot mới. Audit có thể chạy lại, không tạo quyết định duyệt.

## Đọc số ảnh còn thiếu

Mục tiêu gốc: bedroom 175, bathroom 175, hallway 150.

- `eligible_candidates`: ảnh đã được Giữ, file giải mã được, SHA/kích thước khớp và metadata giấy phép đủ theo kiểm tra hiện tại.
- `shortfall_confirmed_now`: mục tiêu trừ eligible_candidates. Khi chưa duyệt, con số này bao gồm cả ảnh đang chờ; không được hiểu là phải thu thập mới toàn bộ.
- `minimum_replacements_after_decisions`: mục tiêu trừ (Giữ + Chưa duyệt), chặn dưới bằng 0; cho biết ít nhất cần bù bao nhiêu do quyết định Loại/Cần thay. Chưa tính ảnh Giữ đang vướng metadata.
- Bảng “nếu loại mọi đề xuất” trong audit chỉ là kịch bản, không phải kết quả duyệt. Nhiều cảnh báo giấy phép có thể khắc phục bằng xác minh nguồn thay vì thay ảnh.

Chưa có ảnh bị con người loại thì chưa thể báo số cần thu thập mới cuối cùng. Khi duyệt xong, chạy lại audit để có bảng thiếu theo phòng tại thời điểm đó.

## Bổ sung ảnh và xác minh giấy phép

1. Wikimedia Commons: tìm ảnh chụp thật về `residential bedroom interior`, `home bathroom interior`, `residential hallway interior`. Mở trang file gốc, kiểm ảnh thực tế và giấy phép từng file; tránh category art/hospital/coach/ship/colonnade. Kết quả tìm kiếm không tự chứng minh quyền sử dụng.
2. Openverse: tìm theo các chủ đề trên; kiểm lại trang nguồn và giấy phép gốc thay vì chỉ tin bộ lọc. Lưu source_page, URL ảnh, tác giả, license_short, license_url và attribution nguyên văn.
3. Ảnh tự chụp: ưu tiên nhà ở Việt Nam, xin đồng ý của chủ nhà và người xuất hiện; tránh lộ giấy tờ, địa chỉ, khuôn mặt khi không cần thiết. Ghi rõ người chụp/quyền cho phép sử dụng; loại EXIF ở bản đưa vào pipeline, giữ chứng cứ đồng ý riêng.
4. Lưu ảnh bổ sung vào thư mục riêng, ví dụ `data/supplemental/`, đặt ID mới; không thay ảnh khác vào cùng ID/path raw và không trộn vào manifest gốc. Chạy cùng kiểm tra giải mã/hash/kích thước/trùng, license và duyệt cảnh trước khi hợp nhất ở bước được xác nhận tiếp theo.
5. Với các file thiếu author/URL hoặc public domain chưa có bằng chứng, mở trang nguồn để xác minh. Ghi bằng chứng và đề xuất sửa metadata vào hồ sơ riêng gắn image_id; không tự điền giấy phép dựa trên vẻ ngoài hoặc sửa raw. Các ảnh chưa rõ quyền vẫn bị chặn. Công cụ hiện chưa có giao diện duyệt sửa giấy phép; cần xử lý hồ sơ bổ sung trước bộ cuối.

Không cần tạo tình huống nguy hiểm thật chỉ để chụp ảnh. Nhãn hiện diện nguy cơ ở các bước sau phải giữ unknown khi thiếu bằng chứng; không đoán lux, ma sát hoặc chiều cao từ một ảnh.

Pillow 13.0.0 là dependency mới duy nhất, giấy phép lõi [MIT-CMU](https://github.com/python-pillow/Pillow/blob/13.0.0/LICENSE); các thông báo thư viện codec đi kèm nằm trong wheel. Giữ notice khi phân phối dependency. Không thêm hoặc tải model AI. Tham khảo chính thức về [CC BY 4.0 và attribution](https://creativecommons.org/licenses/by/4.0/deed.en), [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.en); metadata gate là bộ lọc thận trọng, không thay việc xác minh quyền từng ảnh.

## Kiểm thử

```powershell
.\.venv-ml\Scripts\python.exe -m unittest discover -s scripts/ml -p 'test_*.py' -v
node --check scripts/ml/review_ui/app.js
```

Test dùng ảnh/manifest tạm và quyết định giả trong thư mục tạm; không ghi quyết định vào 500 ảnh thật. Kiểm tra unknown, lưu/xuất/khôi phục review, raw bất biến, chặn metadata giấy phép, checksum/lỗi ảnh, near-duplicate, traversal ZIP, xung đột tab và yêu cầu HTTP không hợp lệ. Không cần chạy Vitest/Prisma để dùng công cụ độc lập này.

**Dừng Giai đoạn 1 để người dùng duyệt cảnh. Chưa triển khai Giai đoạn 2.**
