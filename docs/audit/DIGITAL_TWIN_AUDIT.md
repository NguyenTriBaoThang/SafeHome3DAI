# BÁO CÁO KIỂM TOÁN DIGITAL TWIN 3D & AI RAG
### SafeHome 3D AI — Phiên bản Cinematic Interactive Experience

---

## 1. Kiểm Toán Digital Twin 3D Engine & Trải Nghiệm Cinematic Mới

### 1.1 Khả Năng Hiển Thị & Tương Tác Cốt Lõi
- **WebGL Engine**: `@react-three/fiber` kết hợp Three.js core, PBR Materials, Contact Shadows và Soft Directional Lighting.
- **Dựng hình nội thất (Procedural & GLB Models)**: Hỗ trợ nạp mô hình GLB photoreal (`double_bed_photoreal.glb`, `bathroom_vanity.glb`, `toilet_modern.glb`, `shower_enclosure.glb`, `walkin_closet_system.glb`, `safety_grab_bar.glb`,...) kết hợp Procedural Fallback Mesh.
- **Tương tác**: Cho phép người dùng nhấp chọn vật thể, đổi vị trí, xoay góc (TransformControls gizmo), thêm thiết bị hỗ trợ an toàn (tay vịn, thảm cao su chống trượt, đèn ngủ cảm ứng), khôi phục vị trí ban đầu.
- **Chống đè lấn nhãn 3D**: Smart Marker Clustering tự động gộp các cảnh báo lân cận (<0.95m khoảng cách không gian) vào badge H1-Hk kèm popover danh mục.

### 1.2 Phân Hệ Flagship Mới: Trải Nghiệm Kể Chuyện 3D Toàn Cảnh (`/experience`)
Lấy cảm hứng từ phong cách storytelling điện ảnh hiện đại (tương tự trải nghiệm tham chiếu canidine.com):
- **6 Chương kể chuyện tương tác (Interactive Narrative Chapters)**:
  1. *Chương 01 — Không Gian Sống Của Bạn (Your Home)*: Góc nhìn Isometric góc rộng hé lộ toàn bộ căn nhà 3 phòng chuẩn kiến trúc.
  2. *Chương 02 — Khám Phá Bên Trong (Look Inside)*: Camera hạ xuống tầm mắt người đi bộ trong phòng ngủ, quan sát cấu trúc vật thể thực tế.
  3. *Chương 03 — Điểm Nguy Cơ Tiềm Ẩn (Discover Risks)*: Zoom cận cảnh thảm trơn trượt mép giường, dây điện vắt ngang lối đi và sàn gạch ướt thiếu tay vịn. Hotspot 3D phát xung radar động.
  4. *Chương 04 — Tại Sao Lại Nguy Hiểm? (Understand Why)*: Đối chiếu bằng chứng y khoa CDC STEADI và WHO 2021 về suy giảm cảm thụ bản thể, thị lực và thăng bằng ở người cao tuổi.
  5. *Chương 05 — Cải Thiện Không Gian (Make It Safer)*: Mô phỏng What-If tức thời, gắn nẹp cố định thảm, giấu dây điện, lắp tay vịn bồn cầu và vòi sen.
  6. *Chương 06 — Đối Chiếu Kết Quả (Compare Results)*: Chế độ Split/Toggle Before-After trực quan, điểm an toàn bứt phá từ 28/100 lên 100/100.
- **Smooth Cinematic Camera Lerping**:
  - Không sử dụng bước nhảy camera giật cục. Mọi chuyển động camera đều nội suy mượt mà qua `Vector3.lerp` trong vòng lặp render `useFrame` với `lerpSpeed: 0.045`.
- **Chế độ Auto-play & Điều hướng linh hoạt**:
  - Tự động chuyển chương sau 8 giây kèm thanh tiến trình trực quan.
  - Hỗ trợ phím tắt điều hướng nhanh: Phím Mũi tên Trái/Phải (Next/Prev), Phím Space (Play/Pause).

### 1.3 Nâng Cấp Không Gian Bản Sao Số 3D (`/digital-twin`)
- **Scene 1 (The Home Reveal)**: Banner chào đón kính mờ nổi bật với 3 nút tác vụ: *Khám phá ngôi nhà*, *Xem nguy cơ*, *Bắt đầu đánh giá*, kèm tùy chọn *Bỏ qua giới thiệu (Skip Intro)*.
- **Scene 2 (6 Chế Độ Góc Nhìn Đầy Đủ)**:
  1. `Dollhouse`: Phối cảnh góc 3/4 Isometric bao quát toàn bộ ngôi nhà.
  2. `Tầm mắt` (`INTERIOR`): Đứng ngang tầm mắt bên trong phòng (1.45m - 1.6m).
  3. `Mặt bằng` (`TOP`): Chiếu đứng từ trên cao (Top-down floor plan).
  4. `Walkthrough` (`WASD`): Tự do đi bộ khám phá không gian bằng bàn phím.
  5. `Nguy cơ` (`SAFETY`): Tự động xoay và phóng to vào điểm có nguy cơ cao nhất.
  6. `Trước / Sau` (`COMPARISON`): Góc nhìn so sánh đối chiếu hiện trạng và sau can thiệp.
- **Scene 3 (Room Exploration Bar & Contextual Drawer)**:
  - Thanh chọn phân vùng: *Toàn cảnh ngôi nhà*, *Phòng ngủ chính*, *Khu thay đồ*, *Phòng tắm & WC*, *Hành lang kết nối*.
  - Drawer thông tin chi tiết: Diện tích, chủng loại sàn, danh mục đồ đạc trong vùng, số lượng nguy cơ phát hiện và khuyến cáo can thiệp tương ứng.

---

## 2. Kiểm Toán AI, Multimodal Vision & RAG Pipeline

### 2.1 Tính Trung Thực Của Mô Hình & Không Gian 2D/3D (Scientific Integrity)
- **Cam kết không bịa đặt (Zero Hallucination)**:
  - Thị giác AI từ ảnh 2D tĩnh tuyệt đối không khẳng định khoảng cách mét tuyệt đối khi chưa có hiệu chuẩn quang sai; mọi tọa độ 3D chuyển đổi từ 2D đều gắn nhãn minh bạch `isEstimate: true`.
  - Hệ thống không tự động suy đoán tình trạng đèn đêm từ ảnh chụp ban ngày; trường hợp này được gắn nhãn `SPATIAL_UNCERTAINTY` và hỏi lại người dùng qua câu hỏi làm rõ.
- **RAG & Trích dẫn nguồn (Source Traceability)**:
  - Tất cả các khuyến nghị can thiệp môi trường đều đối chiếu với tài liệu y tế chính thống:
    - **WHO (2021)**: Step Safety & Fall Prevention Guidelines for Older Adults.
    - **CDC STEADI (2019)**: The 30-60-90 Environmental Algorithm & Grab Bar Weight Capacity (250 lbs).
  - Không sinh URL hoặc tài liệu trích dẫn giả mạo; nếu thiếu dữ liệu, hệ thống thông báo minh bạch "Cần kiểm tra thêm".


