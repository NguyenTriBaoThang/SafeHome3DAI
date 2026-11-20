# SAFEHOME 3D AI — REMAINING LIMITATIONS & SCOPE BOUNDARIES

**Phiên bản kiểm toán:** 2.0.0-AUDIT  
**Ngày thực hiện:** 19/11/2026  
**Chuyên môn phụ trách:** Principal Software Architect & QA Specialist  
**Mục đích tài liệu:** Minh bạch hóa những ranh giới kỹ thuật, điều kiện tiên quyết và những giới hạn chưa thể kiểm định nếu thiếu phần cứng chuyên dụng hoặc dữ liệu thực địa.

---

## 1. GIỚI HẠN THỊ GIÁC ĐƠN ẢNH (MONOCULAR VISION & DEPTH ESTIMATION)

1. **Bản chất của thị giác 2D:**
   - Một bức ảnh chụp bằng camera điện thoại thông thường không chứa thông tin chiều sâu đo đạc trực tiếp (depth maps) như cảm biến LiDAR hoặc Time-of-Flight (ToF).
   - Hệ thống giải bài toán bằng phép xấp xỉ quang học hình nón (camera ray projection) kết hợp với nhận dạng danh mục vật thể và kích thước danh định từ thư viện Asset Registry.
2. **Sai số kích thước:**
   - Sai số kích thước ước lượng từ 1 ảnh đơn có thể dao động trong khoảng $\pm 10 - 15\%$ nếu không có vật thể chuẩn tỷ lệ trong phòng.
   - **Ranh giới:** Không tuyên bố bản dựng từ 1 ảnh là bản vẽ kỹ thuật kiến trúc $1:1$ khi người dùng chưa nhập kích thước phòng thực tế hoặc chưa đo đạc hiện trường.
   - **Giải pháp bắt buộc:** Cơ chế Human-in-the-Loop cho phép người dùng điều chỉnh kích thước phòng và kéo chỉnh đồ vật.

---

## 2. RANH GIỚI Y TẾ & ĐÁNH GIÁ NGUY CƠ LÂM SÀNG

1. **Phạm vi an toàn vật lý môi trường (Physical Environmental Fall Risk):**
   - SafeHome 3D AI tập trung đánh giá các yếu tố nguy cơ ngoại sinh trong không gian sống (thảm lỏng, dây điện, bóng tối, sàn ướt, thiếu điểm tựa).
2. **Không thay thế chẩn đoán y khoa nội sinh:**
   - Ứng dụng không đo lường được các yếu tố nội sinh phức tạp của người cao tuổi như: tụt huyết áp tư thế đứng, tác dụng phụ của thuốc an thần/hạ áp, suy giảm tiền đình ốc tai, thoái hóa tiểu não.
   - Các bài test vận động thể chất lâm sàng (như Timed Up and Go - TUG, 30-Second Chair Stand) cần được thực hiện trực tiếp bởi chuyên viên vật lý trị liệu hoặc bác sĩ.
3. **Ý nghĩa của Điểm An Toàn ($0 - 100$):**
   - Điểm số là **chỉ số sàng lọc và kế hoạch cải tạo không gian**, không phải xác suất phần trăm té ngã thực tế của cá nhân.

---

## 3. PHÂN BIỆT XỬ LÝ TRONG MÔ PHỎNG VÀ NGOÀI ĐỜI THỰC

1. **Trong mô phỏng (`RESOLVED_IN_SIMULATION`):**
   - Người dùng có thể xóa thảm, di dời dây điện, gắn thêm thanh vịn trên mô hình 3D và thấy điểm số tăng lên tức thì.
2. **Ngoài đời thực (`RESOLVED_IN_REAL_WORLD`):**
   - Sự an toàn chỉ thực sự đạt được khi gia đình hoặc thợ thi công đã thực tế dán keo mép thảm, nẹp dây điện vào tường hoặc khoan bắt vít thanh vịn chịu lực $\ge 150kg$ vào tường gạch/bê tông.
   - Hệ thống bắt buộc người dùng bấm xác nhận đã hoàn thành cải tạo thực tế trước khi xuất chứng nhận an toàn phòng ngừa té ngã.

---

## 4. YÊU CẦU PHẦN CỨNG & HIỆU NĂNG WEBGL

1. **Yêu cầu đồ họa:**
   - Trải nghiệm 3D Dollhouse tối ưu trên các thiết bị hỗ trợ WebGL 2.0 có tăng tốc phần cứng GPU (đạt $55 - 60$ FPS).
   - Trên các dòng điện thoại thông minh giá rẻ đời cũ không có GPU rời, tốc độ khung hình có thể giảm xuống $25 - 35$ FPS khi bật đồng thời bóng đổ PBR phức tạp.
   - Chế độ tự động hạ chất lượng ánh sáng (LOD Fallback) đã được tích hợp để duy trì tính mượt mà.

---

## 5. BẢO MẬT & QUYỀN RIÊNG TƯ DỮ LIỆU HÌNH ẢNH GIA ĐÌNH

1. **Bảo mật ảnh phòng ngủ:**
   - Ảnh chụp không gian riêng tư của người cao tuổi được loại bỏ siêu dữ liệu EXIF (kinh độ, vĩ độ GPS, model thiết bị) trước khi xử lý.
   - Ảnh lưu trữ tại thư mục bảo mật có kiểm soát quyền truy cập, không công khai tự do trên static CDN.
2. **Tuân thủ quy định:**
   - Yêu cầu người dùng bấm đồng thuận thu thập hình ảnh phục vụ đánh giá an toàn trước khi kích hoạt camera hoặc tải tệp lên.
