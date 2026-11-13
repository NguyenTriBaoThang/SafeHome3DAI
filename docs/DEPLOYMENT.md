# SafeHome 3D AI — Hướng Dẫn Triển Khai (Deployment Guide)

## 1. Yêu cầu môi trường
- **Node.js**: v18.18.0 trở lên (khuyến nghị v20 LTS hoặc v24)
- **Hệ điều hành**: Windows 10/11, macOS, hoặc Linux (Ubuntu 22.04+)
- **Trình duyệt**: Hỗ trợ WebGL 2.0 (Google Chrome, Microsoft Edge, Firefox, Safari)

---

## 2. Triển khai cục bộ (Local Development)

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi tạo Prisma Client và cấu trúc SQLite
npm run db:generate
npm run db:push

# 3. Nạp dữ liệu mẫu ban đầu (Seeding)
npm run db:seed

# 4. Khởi chạy máy chủ phát triển
npm run dev
```

Ứng dụng sẽ hoạt động tại địa chỉ: `http://localhost:3000`.

---

## 3. Biên dịch cho môi trường Production (Production Build)

```bash
# Biên dịch tối ưu hóa
npm run build

# Khởi chạy dịch vụ production
npm run start
```

---

## 4. Triển khai trên Nền tảng Đám mây (Vercel / Docker)

### 4.1. Vercel
1. Kết nối repository Git với tài khoản Vercel.
2. Thiết lập Environment Variables trong bảng điều khiển Vercel:
   - `DATABASE_URL`: Sử dụng Vercel Postgres, Neon, hoặc Supabase PostgreSQL URL.
   - Thay đổi datasource trong `prisma/schema.prisma` sang `postgresql`:
     ```prisma
     datasource db {
       provider = "postgresql"
       url      = env("DATABASE_URL")
     }
     ```
3. Build Command: `prisma generate && next build`.

### 4.2. Dockerfile
Dự án có thể đóng gói container độc lập với cấu hình Node Alpine và chạy `node server.js` thông qua Next.js Standalone mode.

