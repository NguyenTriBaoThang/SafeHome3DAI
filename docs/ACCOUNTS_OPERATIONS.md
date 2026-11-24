# Tài khoản gia đình và vận hành

## Phạm vi triển khai

Ứng dụng hỗ trợ nhiều tài khoản. Mỗi tài khoản đại diện một gia đình, có SQLite và thư mục ảnh riêng; chưa có chức năng mời nhiều thành viên vào cùng một gia đình. Các request đồng thời chọn database bằng AsyncLocalStorage, không thay biến database toàn cục. Cache đánh giá nguy cơ cũng được phân vùng theo tài khoản.

Mô hình này dành cho một Node server có ổ đĩa bền vững. Không chạy trên filesystem tạm của serverless hoặc nhiều replica cùng ghi ổ đĩa cục bộ. Chưa có kiểm thử tải để xác định số gia đình đồng thời có thể phục vụ.

## Khởi động

1. Cài dependencies, tạo Prisma Client: `npm ci`, `npx prisma generate`.
2. Cấu hình `SAFEHOME_PRIVATE_DIR` tới volume riêng, không đưa thư mục đó vào public hoặc Git. Mặc định là `.private/`.
3. Khi dùng proxy/HTTPS, đặt `SAFEHOME_APP_ORIGIN=https://ten-mien-cua-ban` đúng origin công khai. Proxy phải giữ Cookie, Origin và không cache API riêng tư. Cookie dùng HttpOnly, SameSite=Strict và Secure khi origin là HTTPS.
4. Chạy `npm run build`, `npm start`. Mở `/sign-in`, đăng ký và đồng ý lưu hồ sơ. Mật khẩu tối thiểu 12 ký tự; server lưu scrypt với salt riêng. Phiên có thời hạn 7 ngày, chỉ lưu SHA-256 của token ngẫu nhiên trên server; đăng xuất thu hồi phiên.
5. Upload ảnh cần đồng ý riêng. Chọn Gemini sẽ gửi ảnh tới provider đó; local chỉ hoạt động khi có dịch vụ/model thật đủ điều kiện.

Máy chạy server cần có Prisma CLI và `prisma/schema.prisma` vì việc khởi tạo database gia đình mới sử dụng CLI trên một file mới. Không dùng `db push --accept-data-loss` cho database gia đình. Thay đổi schema trong tương lai phải có kế hoạch migration và sao lưu trước.

Giới hạn hiện tại: 5 đăng ký/phút toàn server; 60 lượt đăng nhập/phút toàn server và 10 lượt/15 phút cho mỗi email; 30 yêu cầu AI/giờ cho mỗi gia đình và tối đa 2 yêu cầu AI đang thực thi trên một Node process. Bộ đếm được lưu trong database tài khoản; số lượt đang thực thi nằm trong bộ nhớ. Không tự retry khi quota/provider lỗi.

Chưa có xác minh email, gửi thư khôi phục mật khẩu, MFA hay giao diện quản trị tài khoản. Vì vậy cần lưu mật khẩu an toàn và có người vận hành hỗ trợ; không coi bản này là dịch vụ tài khoản đại trà đã được kiểm định bảo mật.

## Dữ liệu cũ

`prisma/dev.db` và ảnh cũ trong `public/uploads/vision` được giữ nguyên. Chúng không tự thuộc về tài khoản đăng ký đầu tiên. Đường dẫn public `/uploads/*` bị chặn; ảnh mới chỉ đọc qua API có phiên đăng nhập và database đúng gia đình. Không chuyển dữ liệu cũ vào tài khoản bất kỳ khi chưa xác định chủ sở hữu.

Hai trường kích thước RoomImage cho phép null trong schema mới. Giá trị null nghĩa là chưa xác định được kích thước từ header, không thay bằng 1920×1080. Database cũ chưa được tự migration trong đợt sửa này.

## Sao lưu và khôi phục

Các bản sao chứa database tài khoản, hash mật khẩu, phiên và ảnh riêng tư. Giới hạn quyền truy cập thư mục bằng tài khoản hệ điều hành; trên Windows cần thiết lập ACL cho volume. Không upload bản sao lên nơi công khai.

1. Dừng Node server để database, journal và file ảnh nhất quán. `--offline` là xác nhận của người vận hành rằng server đã dừng, không phải công cụ tự phát hiện mọi tiến trình.
2. Chạy:

```powershell
node scripts/accounts/archive.cjs backup --source .private --destination G:/SafeHomeBackups/backup-20261122 --offline
```

3. Thư mục đích phải chưa tồn tại. Công cụ sao chép file và tạo manifest checksum; không xóa hoặc ghi đè nguồn.
4. Khôi phục sang thư mục mới:

```powershell
node scripts/accounts/archive.cjs restore --source G:/SafeHomeBackups/backup-20261122 --destination G:/SafeHomeRestored/private --offline
```

5. Chỉ sau khi kiểm tra checksum thành công, cấu hình `SAFEHOME_PRIVATE_DIR` tới thư mục đã khôi phục rồi khởi động server. Giữ bản gốc để có thể quay lại. Nên thu hồi phiên khi nghi ngờ bản sao bị lộ.

Các kiểm tra tự động chỉ dùng database/tài khoản tạm, không sao lưu hoặc thay thế dữ liệu người dùng thật. Xem kết quả trong `reports/completion/restore.json` sau khi chạy HTTP acceptance.

## Kiểm thử

`npm test` dùng SQLite mới dưới `.scratch/vitest`, không khởi tạo `dev.db`. Để chạy đúng bản nghiệm thu cục bộ:

```powershell
npm run build:completion
npm run test:completion:http
npm run test:completion:browser
npm run start:completion
```

Các lệnh này dùng `.scratch/completion-production`; có thể đặt `SAFEHOME_BUILD_DIR` cho các script kiểm tra, ví dụ `.next` trong CI. Browser acceptance cần Chromium/Edge/Chrome và chỉ dùng detector fixture, không chứng minh độ chính xác AI. Bản `start:completion` mặc định ở cổng 3210, mở `/sign-in`; `SAFEHOME_PREVIEW_PORT` có thể đổi cổng.
