# Asset provenance — Cinematic Experience

Ngày kiểm tra: 21/11/2026. Phân biệt nguồn do repository khai báo với nguồn đã được xác minh độc lập.

## Tài sản tạo trong thay đổi này

| Tài sản | Source | Nguồn/quyền sử dụng |
| --- | --- | --- |
| Giường, gối, khung, chăn dạng lưới cong | `src/components/three/ArchitecturalBed.tsx` | Hình học gốc viết trong repository; theo LICENSE MIT của dự án |
| Toilet, lavabo, gương, vòi nước | `src/components/three/ArchitecturalFixtures.tsx` | Hình học gốc viết trong repository; MIT |
| Environment light cards | `src/components/three/RoomEnvironment.tsx` | Tạo bằng Drei Lightformer; không tải HDRI bên ngoài |
| Roof reveal/cutaway, UI và camera timeline | Source experience/three | Code gốc; MIT |

Không có ảnh, texture hoặc model mới tải từ internet trong thay đổi này. Ảnh tham chiếu của người dùng và website tham chiếu chỉ hướng dẫn bố cục, ánh sáng và cách kể chuyện; không được chép thành asset phân phối.

## GLB và texture đã có trong repository

Toàn bộ 12 đường dẫn GLB trong `src/data/assetRegistry.ts` tồn tại và được parse geometry trong test. Các thay đổi chủ yếu nằm ở renderer/normalization; không thay thế binary bằng download bên ngoài.

| Registry ID | Nhãn giấy phép đang có |
| --- | --- |
| `double_bed_photoreal` | SafeHome Custom 3D |
| `bedside_table_lamp` | SafeHome Custom 3D |
| `side_table` | SafeHome Custom 3D |
| `walkin_closet_system` | SafeHome Custom 3D |
| `drawer_cabinet` | PolyHaven CC0 |
| `toilet_modern` | SafeHome Custom 3D |
| `bathroom_vanity` | SafeHome Custom 3D |
| `shower_enclosure` | SafeHome Custom 3D |
| `potted_plant` | PolyHaven CC0 |
| `framed_wall_art` | SafeHome Custom 3D |
| `modern_window` | SafeHome Custom 3D |
| `safety_grab_bar` | SafeHome Custom 3D |

Repository có `scripts/generate_furniture_glbs.py` và LICENSE MIT (Copyright 2026 Nguyễn Trí Bảo Thắng). Tuy nhiên, sự tồn tại của generator và nhãn registry không đủ chứng minh lịch sử từng binary. Hai nhãn PolyHaven CC0 là dữ liệu có sẵn, không phải kết quả xác minh một trang asset upstream trong nhiệm vụ này.

Texture sàn gỗ, đá/gạch và linen dùng từ `public/textures/` đã có. Tên file hoặc tên preset không tự chứng minh giấy phép. **PARTIAL:** chưa có manifest đầy đủ liên kết từng texture/GLB với tác giả, URL nguồn, phiên bản và bằng chứng giấy phép. Cần bổ sung bằng chứng upstream cho các tài sản cũ trước khi tuyên bố toàn bộ thư viện đã được kiểm toán quyền phân phối.

## Physical contract

- Đơn vị mét, trục Y hướng lên; asset GLB đo transformed mesh bounds thật trước khi fit theo dimensions của object.
- `ASSET_PHYSICAL_SPECS` chứa semantic class, anchor, mounting surfaces, orientation, collision bounds và danh sách LOD.
- Không quảng cáo LOD không có file: `lodAvailable=false`, `lodUrls=[]` cho các model hiện tại.
- Wall art, window và grab bar khai báo WALL; các entry khác là assembly theo floor coordinate. Vanity có bộ phận treo trong assembly; metadata chưa diễn tả chi tiết từng mounting point.
- Các ceiling/surface primitives ngoài 12 entry vẫn theo hệ thống model/placement sẵn có. Chưa có contract và chứng nhận lắp đặt đầy đủ cho mọi assembly.

Giới hạn này được phản ánh trong ma trận nghiệm thu tại [CINEMATIC_EXPERIENCE_REPORT.md](CINEMATIC_EXPERIENCE_REPORT.md).
