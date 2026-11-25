# B08 — Chất lượng 3D, LOD & Tách ánh sáng mô phỏng khỏi Lux đo thật

**Nhánh triển khai:** `feature/b-08-3d-lighting-lod-fallback`  
**Phạm vi:** `src/lib/three/lightingModel.ts`, `src/stores/useSimulationStore.ts`, `src/components/three/RoomCanvas.tsx`, `src/components/three/RoomEnvironment.tsx`, `src/components/three/ModelRenderer.tsx`, `src/types/index.ts`.

---

## 1. Tách 2 tầng ánh sáng (Chống đánh đồng render 3D với Lux đo thật)
| Tầng dữ liệu | Trường & Nguồn | Tác dụng & Nhãn hiển thị |
| :--- | :--- | :--- |
| **Tầng 1 — Render 3D mô phỏng** | `sceneLightingIntensitySimulated` (`MORNING` 1.05×, `AFTERNOON` 1.0×, `NIGHT` 0.35×, `STUDIO` 1.0×), `toneMappingExposure` | Chỉ điều chỉnh cường độ đèn Three.js & ACES Filmic exposure. **Không bao giờ ghi đè `room.lightingLevel` hoặc `lightingProvenance`**. UI hiển thị `3D: ... (mô phỏng 3D)`. |
| **Tầng 2 — Lux thực tế** | `room.lightingLevel` + `room.lightingProvenance` (`measured` / `user_confirmed` / `vision_estimated` / `simulated` / `unknown`) | Hàm `resolveIlluminanceDisplay()` chỉ trả `actualIlluminanceLux` khi `lightingProvenance` là `measured` hoặc `user_confirmed`. Nếu chưa đo hoặc đang dùng phòng mẫu, hiển thị rõ **"Chưa đo..."** — tuyệt đối không gắn nhãn `"lux đo thật"` khi bật/tắt preset đèn Three.js. |

---

## 2. Preset Chất lượng / LOD & Khả năng chịu lỗi WebGL / Asset
1. **3 mức chất lượng trong `RoomCanvas` (`Nhẹ / Vừa / Cao`):**
   - `LOW`: DPR `1`, tắt shadow map, tắt HDR `<Environment>` và `<ContactShadows>` cho máy cấu hình phổ thông / điện thoại yếu.
   - `MEDIUM`: DPR `[1, 1.35]`, shadow map `768px`, bật khử răng cưa, tắt `ContactShadows`.
   - `HIGH`: DPR `[1, 1.75]`, shadow map `1024px`, bật PBR `<Environment>` + `<ContactShadows>`.
2. **Chống crash khi thiếu WebGL hoặc thiếu/lỗi file `.glb`:**
   - `RoomCanvas` kiểm tra context WebGL trước khi mount `<Canvas>` và lắng nghe sự kiện `webglcontextlost` / `webglcontextrestored`, hạ cấp an toàn về `<WebGLFallback />` (giữ nguyên link sang bảng đánh giá nguy cơ & nút thử lại).
   - `ModelRenderer` bọc từng mô hình `.glb` và `ArchitecturalBed` trong `AssetErrorBoundary` để lỗi tải mesh rơi về `<ProceduralModelBody />` cục bộ thay vì làm sập toàn bộ khung 3D.
3. **Nâng cấp target chạm (B08 + B10):**
   - Nút chuyển ánh sáng 3D và chọn mức chất lượng LOD trên thanh công cụ `RoomCanvas` dùng `min-h-[44px]` trên mobile để dễ chạm.
   - Kích thước phòng (`room-dimensions-badge`) hiển thị kèm nhãn nguồn (`Đã đo` / `Người dùng xác nhận` / `Mô phỏng / mẫu`).

---

## 3. Bằng chứng đo hiệu năng WebGL tham chiếu & Kiểm thử B08
- Tham chiếu đo rAF 5 giây trên trình duyệt headless Edge (`ANGLE Intel(R) HD Graphics 620 Direct3D11`, nguồn [EXPERIENCE_PERFORMANCE.json](../EXPERIENCE_PERFORMANCE.json)):
  - `desktop-high` (1440×960, HIGH): `59.1 FPS` (`p95 = 17.6 ms`)
  - `desktop-low` (1440×960, LOW): `60.2 FPS` (`p95 = 17.0 ms`)
  - `mobile-emulation-low` (390×844, LOW): `60.1 FPS` (`p95 = 17.0 ms`)
  - *Giới hạn:* đây là số đo `requestAnimationFrame` trên Edge headless của máy phát triển, không phải benchmark thiết bị Android tầm trung ngoài thực địa.
- Bộ kiểm thử đơn vị mới [lightingLodFallbackB08.test.tsx](../../tests/lightingLodFallbackB08.test.tsx) xác minh:
  - Đổi `setLightingPreset` / `toggleNightMode` không ghi đè `lightingLevel` hay `lightingProvenance`.
  - `resolveIlluminanceDisplay` không gắn nhãn `"lux đo thật"` cho preset mô phỏng.
  - Cấu hình LOD `LOW/MEDIUM/HIGH`, nhãn provenance kích thước phòng, và `WebGLFallback` / `WebGLBoundary`.

