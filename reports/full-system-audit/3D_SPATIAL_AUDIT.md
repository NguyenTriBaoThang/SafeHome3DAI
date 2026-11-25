# SafeHome3DAI — 3D Graphics, Spatial Reconstruction & WebGL Audit

## 1. Khắc Phục Lỗi Nền Tảng React / Three.js (**BUG-05**)

- **Sự cố trước kiểm toán:** `node_modules` cục bộ chứa `react@18.3.1` và `@react-three/fiber@8.18.0`, xung đột với khai báo trong `package.json` & `package-lock.json` (`react@19.1.0`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, `three@0.165.0`). Lỗi gây sập client trên `/experience` (`ReactCurrentBatchConfig`) và báo lỗi console tại `/digital-twin`, `/scenario-simulator`.
- **Khắc phục & Xác minh:** Đồng bộ sạch qua `npm ci`, `npx prisma generate` và clean `npx next build`. Tái kiểm chứng trên Edge Headless: `/experience`, `/digital-twin`, `/scenario-simulator`, `/simulations` đạt `0` `consoleErrors`, `0` `pageErrors`, `hasClientError: false`.
- **Kiểm thử tự động liên quan:** `npm run test:experience` (`9/9` file, **`64/64 passed`**, `7.23s`), `tests/lightingLodFallbackB08.test.tsx` (`5/5 passed`).

---

## 2. Kiến Trúc Tái Dựng Không Gian & Quy Ước Đặt Vật Thể

### A. Tái dựng từ ảnh (`src/lib/reconstruction/spatialReconstructor.ts`)
- Sử dụng raycasting đơn giản từ bounding box 2D chuẩn hóa (`unprojectBboxTo3D`, giả định góc nghiêng `18°`, FOV dọc `65°`, cao độ camera `1.45 m`) về mặt phẳng sàn (`planeY = 0`) theo góc nhìn `ENTRANCE` hoặc `OPPOSITE_CORNER`.
- Các vật thể thuộc nhóm `TEMPLATE_SIZED_KINDS` (`light_switch`, `wall_art`, `ceiling_fan`, `air_conditioner`, `slat_partition`, `stool`) giữ kích thước mẫu thay vì suy sai từ bbox 2D.
- **Ranh giới độ chính xác:** Tái dựng từ ảnh một góc nhìn là ước lượng hình học (`PHOTO_DRAFT`), không thay thế thước đo/laser thực tế; `README.md` đã được sửa (`BUG-03`) để bỏ cụm `"tỉ lệ 1:1"` gây hiểu lầm. Endpoint `POST /api/risk-assessment/evaluate` từ chối chấm điểm lâm sàng với HTTP `422` (`NEEDS_VERIFICATION`) nếu đầu vào ở trạng thái `evidenceStatus === "PHOTO_DRAFT"`.

### B. Quy ước đặt, tựa vật thể & bám tường (`src/lib/reconstruction/scenePlacement.ts`)
- Hệ tọa độ: đơn vị mét (`y` hướng lên, tâm sàn là gốc `(0,0,0)`). Điểm tựa vật thể nằm ở tâm đáy (`position[1]` là cạnh dưới).
- `assignSupportParents()`: gắn các vật thể mặt bàn (`SURFACE_ITEM_MODELS`: `lamp`, `plant`, `box` chiều cao `<= 0.75 m`) lên vật nâng đỡ hợp lệ (`SUPPORT_MODELS`: `nightstand`, `side_table`, `table`, `desk`, `coffee_table`, `cabinet`, `media_console`, `bench`), và gắn `cable` / `electrical_cable` đè lên `rug` nếu giao footprint.
- `placeOne()`: tự động kẹp biên trong phòng, nâng thảm phẳng `RUG_LIFT_M = 0.005` tránh z-fighting, gắn trần (`CEILING_MOUNTED_MODELS`) hoặc xoay mặt vào phòng đối với vật gắn tường (`WALL_MOUNT_BOTTOM_M`: `grab_bar: 0.85 m`, `light_switch: 1.15 m`, `mirror: 1.0 m`, `wall_art: 1.45 m`, `window: 0.9 m`).
- Kiểm chứng qua `tests/modelPlacement.test.ts` (`5/5 pass` — gồm tải file `.glb` thực tế và xác nhận không quảng cáo LOD giả không tồn tại), `tests/spatialValidationEngine.test.ts` (`8/8 pass`), `tests/scenePlacementProvenance.test.ts` (`14/14 pass`), `tests/dollhouseReferenceScene.test.ts` (`5/5 pass`).

---

## 3. Tách Bạch Ánh Sáng Mô Phỏng, Cấu Hình Chất Lượng & WebGL Fallback (Task B08)

- **Tách bạch nguồn sáng (`src/lib/three/lightingModel.ts`):**
  - `SIMULATED_LIGHTING_CONFIG` cung cấp các preset (`MORNING`, `AFTERNOON`, `DAYLIGHT`, `EVENING`, `NIGHT`, `STUDIO`) chỉ điều khiển cường độ hiển thị Three.js (`sceneLightingIntensitySimulated`, `toneMappingExposure`, `ambientIntensity`, `directionalIntensity`) kèm thông báo `"Ánh sáng hiển thị 3D mô phỏng; không phải số đo lux thật."`
  - Không thay đổi giá trị đo lux thật hay làm sai lệch điểm an toàn (đã chứng minh trong `tests/lightingLodFallbackB08.test.tsx` và báo cáo trước đây tại `docs/EXPERIENCE_BROWSER_RESULTS.json`).
- **Cấu hình chất lượng (`QUALITY_PRESET_CONFIG`):**
  - `LOW` (`dpr: 1`, tắt shadows/antialias/Environment/ContactShadows), `MEDIUM` (`dpr: [1, 1.35]`, `shadowMapSize: 768`), `HIGH` (`dpr: [1, 1.75]`, `shadowMapSize: 1024`, PBR `Environment`, `ContactShadows`).
- **Xử lý sự cố WebGL (`src/components/three/WebGLBoundary.tsx`):**
  - `WebGLBoundary` + `WebGLFallback` bắt lỗi khởi tạo WebGL / crash R3F, giữ trải nghiệm dữ liệu (`/risk-assessment`, bảng phòng, mô phỏng không 3D) kèm nút `"Thử tải lại mô hình"`, không làm sập toàn trang (`next.config.mjs` cấu hình `reactStrictMode: false` và `transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"]`).

---

## 4. Số Liệu Hiệu Năng & Ràng Buộc Kiểm Chứng

- **Dữ liệu đo đạc hiệu năng 3D có sẵn (`docs/EXPERIENCE_PERFORMANCE.json` — đo trên Edge `157.0.4341.60`, Intel HD Graphics 620, 5s sampling):**
  - `desktop-high` (`1440x960`, `HIGH`): `meanRafFps = 59.1`, `p95FrameMs = 17.6`, canvas `979x752`.
  - `desktop-low` (`1440x960`, `LOW`): `meanRafFps = 60.2`, `p95FrameMs = 17`, canvas `979x752`.
  - `mobile-emulation-low` (`390x844`, `LOW`): `meanRafFps = 60.1`, `p95FrameMs = 17`, canvas `390x320`.
- **Giới hạn đã công bố:**
  - Bộ script `npm run test:experience:browser` (`scripts/verify_cinematic_experience.cjs`) chưa chạy lại trong phiên này vì môi trường không cài sẵn gói `playwright` (`node_modules/playwright` vắng mặt); tuyến `/experience` đã được xác nhận render khỏe (`textLen=2413`, `errors=[]`) trong Edge Headless Sweep.
  - Chỉ số trên là `requestAnimationFrame` giả lập trên host cục bộ, không thay thế đo FPS trên GPU điện thoại vật lý tầm trung.

