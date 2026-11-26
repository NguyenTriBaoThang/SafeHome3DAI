# KIẾN TRÚC HỆ THỐNG HIỆN TẠI (UPDATED SYSTEM ARCHITECTURE)
### SafeHome 3D AI — Nền Tảng Hỗ Trợ Sàng Lọc Nguy Cơ & Không Gian Sống An Toàn

Tài liệu này tổng hợp kiến trúc hiện hành của SafeHome 3D AI sau các chu kỳ hoàn thiện hệ thống (A01–A12, B01–B12 và đợt Kiểm toán Toàn Hệ thống 11/2026).

---

## 1. Cải Tiến Kiến Trúc Cốt Lõi (Key Architectural Upgrades)

### 1.1. Cô Lập Tài Khoản Hộ Gia Đình & Bảo Mật API (A06–A07)
- Xác thực bắt buộc qua `/sign-in` (`accounts.db` với mật khẩu băm có salt); mỗi tài khoản gia đình sở hữu **database SQLite (`31` Prisma models) và kho ảnh riêng trong `SAFEHOME_PRIVATE_DIR`**.
- Toàn bộ **59 business API routes** được bảo vệ bằng `withAccount()`, kiểm tra sở hữu tài nguyên (chống IDOR) và chặn mặc định (`default-deny`) truyền ảnh ra AI bên thứ ba nếu thiếu `ConsentRecord`.

### 1.2. Hợp Nhất Quy Trình 7 Bước (`/workflow`) & Tour Cinematic (`/experience`)
- Tuyến hành trình `/workflow` kết nối 7 bước tuần tự: Hồ sơ khảo sát ➔ Thu thập dữ liệu ➔ Thị giác AI + HITL ➔ Bản sao số 3D ➔ Đánh giá nguy cơ ➔ Mô phỏng What-If ➔ So sánh Trước/Sau & Báo cáo PDF/JSON.
- Phân hệ `/experience` cung cấp trải nghiệm tour 3D WebGL `6` chương (`Dollhouse`, `Mặt bằng`, `Nội thất`, `Đi bộ`, `Nguy cơ`, `So sánh Trước/Sau`), tích hợp `WebGLBoundary` fallback khi WebGL không khả dụng.

### 1.3. Thị Giác Đa Tầng & Chụp Camera Trực Tiếp (`LiveCameraCaptureModal`)
- `/ai-vision` và `/vision` (`AiRoomScannerWizard`) hỗ trợ tải ảnh nhị phân (`JPG/PNG/WebP`), hoặc chụp trực tiếp từ camera thiết bị thông qua `LiveCameraCaptureModal` (`getUserMedia`, đổi camera, cảnh báo ánh sáng yếu `< 50 Lux`).
- Loại bỏ các nhánh trả về phát hiện giả (`simulateVision`), phân tách rõ `PHOTO_DRAFT` (chỉ ước lượng hình học, không sinh điểm an toàn lâm sàng khi thiếu khảo sát xác nhận).

### 1.4. Tách Bạch Ánh Sáng 3D, Gom Cụm Nhãn & Decision Provenance
- Trong `RoomCanvas.tsx`, hệ thống tự động gom cụm cảnh báo nguy cơ trong bán kính `< 0.95m` để chống đè chữ.
- `lightingModel.ts` tách riêng ánh sáng hiển thị Three.js mô phỏng khỏi số đo lux vật lý thực tế.
- Chuỗi giải trình ở `/explainability` và `/risk-assessment/traceability` chuẩn hóa thành **Rule-Based Explainability / Decision Provenance** (tách biệt với model explainability nội tại của LLM).

### 1.5. Ranh Giới DEMO vs REAL & Lưu Trữ Bền Vững
- `POST /api/workflow/save-state` chủ đích trả HTTP `410 DEMO_WORKFLOW` để chặn ghi dữ liệu demo lẫn vào hồ sơ thật; toàn bộ dữ liệu thật của hộ gia đình được lưu bền vững qua Prisma transaction vào SQLite riêng của hộ (không ghi vào `prisma/dev.db` mẫu), kết hợp `RoomSnapshotRecord` (`v1`) bất biến cho đối chiếu Before/After.
