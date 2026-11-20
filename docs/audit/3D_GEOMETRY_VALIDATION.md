# SAFEHOME 3D AI — 3D DIGITAL TWIN GEOMETRY & REALISM VALIDATION

**Phiên bản kiểm toán:** 2.0.0-AUDIT  
**Ngày thực hiện:** 19/11/2026  
**Chuyên môn phụ trách:** Three.js / React Three Fiber Engineer & Principal Architect  
**Trạng thái kiểm định:** ĐÃ KIỂM ĐỊNH TOÀN DIỆN (10/10 Test Suites PASS)

---

## 1. TỔNG QUAN HỆ TỌA ĐỘ VÀ KHÔNG GIAN 3D (COORDINATE SYSTEM)

### 1.1. Chuẩn quy chiếu hình học Three.js
- **Trục thế giới (World Axis):**
  - Trục đứng: **Y-up** (Y hướng thẳng đứng lên trần).
  - Trục ngang: **X** (từ trái qua phải không gian phòng).
  - Trục sâu: **Z** (từ sau ra trước không gian phòng).
- **Gốc tọa độ thế giới (World Origin):**
  - Điểm $(0, 0, 0)$ được cố định tại **tâm hình học của mặt sàn căn phòng** ($Y = 0.000m$).
  - Phạm vi không gian căn phòng:
    $$X \in \left[-\frac{\text{width}}{2}, +\frac{\text{width}}{2}\right], \quad Y \in [0, \text{height}], \quad Z \in \left[-\frac{\text{length}}{2}, +\frac{\text{length}}{2}\right]$$
- **Đơn vị đo lường (Measurement Unit):** Mét ($m$), tương thích $1:1$ với đơn vị thực tế kiến trúc và tiêu chuẩn thiết kế nhân trắc học cho người cao tuổi.

### 1.2. Điều kiện tiếp xúc sàn (Floor Contact Condition)
Đối với toàn bộ vật dụng đặt sàn (giường, tủ, bàn, ghế, sofa, bồn cầu, giỏ đồ):
$$\left| y_{\text{objectWorldMin}} - y_{\text{floorWorld}} \right| \le \text{geometricTolerance}$$
- **Ngưỡng dung sai hình học:** $\text{geometricTolerance} = 0.035m$ ($3.5cm$).
- **Vật dụng phẳng mặt sàn (thảm trải sàn, nẹp dây điện):** Đặt tại $Y = 0.005m$ đến $0.008m$ để triệt tiêu hoàn toàn hiện tượng Z-fighting nhấp nháy bề mặt trong WebGL.
- **Vật thể lơ lửng (`FLOATING_OBJECT`):** $Y > 0.035m$ đối với vật thể sàn $\rightarrow$ Phát hiện lỗi và áp dụng auto-snap về $Y = 0$.
- **Vật thể chìm sàn (`FLOOR_PENETRATION`):** $Y < -0.035m \rightarrow$ Phát hiện lỗi và nâng đáy vật thể chạm mặt sàn.

### 1.3. Điều kiện neo tường & trần (Wall & Ceiling Anchors)
- **Thanh vịn an toàn (`grab_bar`):** Chiều cao khuyến nghị chuẩn WHO/CDC là $0.80m - 0.90m$ (mặc định neo tại $Y = 0.85m$). Khoảng cách tới bề mặt tường gần nhất $\le 0.15m$.
- **Gương & Lavabo (`sink`, `mirror`):** Cao độ chậu rửa $0.85m$, gương treo tường từ $1.20m - 1.80m$.
- **Tranh treo tường (`wall_art`):** Cao độ tầm mắt $Y = 1.55m$.
- **Quạt trần & Đèn trần (`ceiling_fan`, `pendant_light`):** Neo tại $Y = \text{roomHeight} - \text{fixtureHeight}$.

---

## 2. BỘ CÔNG CỤ SPATIAL VALIDATION ENGINE

Đã xây dựng và tích hợp mô-đun kiểm định hình học độc lập tại `src/lib/reconstruction/spatialValidationEngine.ts`:

### 2.1. Phân loại 10 dị tật hình học được giám sát tự động
| Mã kiểm tra | Loại lỗi hình học | Ngưỡng kích hoạt | Mức độ | Biện pháp tự động khắc phục |
|---|---|---|---|---|
| **SPAT-01** | `FLOATING_OBJECT` | $y_{\text{min}} > 0.035m$ | CRITICAL | Snap chân đế chạm mặt sàn ($Y=0$) |
| **SPAT-02** | `FLOOR_PENETRATION` | $y_{\text{min}} < -0.035m$ | CRITICAL | Nâng vật thể lên tiếp xúc mặt sàn |
| **SPAT-03** | `WALL_PENETRATION` | Đâm xuyên vách $\le 0.35m$ | HIGH | Dịch chuyển vào phòng, cách tường $8cm$ |
| **SPAT-04** | `OUT_OF_ROOM_BOUNDS` | Vượt ngoài phòng $> 0.35m$ | CRITICAL | Kéo toàn bộ bounding box về trong phòng |
| **SPAT-05** | `OBJECT_OVERLAP` | Thể tích lấn $> 0.04m^3$ | CRITICAL | Tách 2 vật thể rắn cách nhau tối thiểu $10cm$ |
| **SPAT-06** | `INVALID_SCALE` | Kích thước $\le 0$ hoặc tỷ lệ âm | CRITICAL | Khôi phục kích thước danh định chuẩn |
| **SPAT-07** | `INVALID_ROTATION` | Nghiêng trục $X, Z > 10^\circ$ | MEDIUM | Reset $rx=0, rz=0$, chỉ cho phép xoay trục $Y$ |
| **SPAT-08** | `INVALID_WALL_ATTACHMENT`| Thanh vịn $< 0.3m$ hoặc bay giữa phòng | CRITICAL | Gắn vào vách tường ở cao độ chuẩn $0.85m$ |
| **SPAT-09** | `BLOCKED_WALKWAY` | Vật cản lấn vào lối đi lưu thông | HIGH | Cảnh báo nguy cơ té ngã và đề xuất nẹp sát tường |
| **SPAT-10** | `UNSUPPORTED_PLACEMENT` | Đồ đặt trên bàn nhưng bàn bị dời | HIGH | Cân chỉnh lại vị trí đỡ |

---

## 3. KIỂM ĐỊNH TOÀN BỘ DANH MỤC VẬT DỤNG NỘI THẤT

| Vật dụng | Model Type | Tọa độ chuẩn $(X, Y, Z)$ | Trạng thái tiếp xúc | Kết quả kiểm định |
|---|---|---|---|---|
| **Giường đôi bọc nệm** | `bed` | $[-2.1, 0, -0.4]$ | Tiếp xúc sàn $Y=0$, đầu giường tựa vách | **ĐẠT CHUẨN** |
| **Tủ đầu giường** | `nightstand` | $[-0.6, 0, -1.8]$ | Đặt sàn $Y=0$, kề mép giường $15cm$ | **ĐẠT CHUẨN** |
| **Tủ quần áo cánh trượt** | `wardrobe` | $[-1.6, 0, 0.8]$ | Đặt sàn $Y=0$, sát tường trái | **ĐẠT CHUẨN** |
| **Thảm trải sàn** | `rug` | $[0.9, 0.005, 0.7]$ | Áp sàn $Y=0.005m$ chống Z-fighting | **ĐẠT CHUẨN** |
| **Dây điện quạt sàn** | `cable` | $[1.2, 0.008, 1.3]$ | Áp sàn $Y=0.008m$, phát hiện vắt lối đi | **ĐẠT CHUẨN** |
| **Bàn trà sofa** | `coffee_table`| $[-0.3, 0, 0.5]$ | Đặt sàn $Y=0$, chân vững chắc | **ĐẠT CHUẨN** |
| **Bồn cầu sứ tiêu chuẩn** | `toilet` | $[-0.9, 0, -0.8]$ | Đặt sàn $Y=0$, lưng sát tường WC | **ĐẠT CHUẨN** |
| **Lavabo gương soi** | `sink` | $[-0.9, 0, 0.7]$ | Đặt sàn/vách, cao độ chậu $0.85m$ | **ĐẠT CHUẨN** |
| **Buồng tắm đứng vòi sen**| `shower` | $[0.8, 0, -0.8]$ | Đặt sàn $Y=0$, buồng kính bao quanh | **ĐẠT CHUẨN** |
| **Thanh tay vịn trợ lực** | `grab_bar` | $[-0.6, 0.85, -0.8]$| Gắn tường chịu lực $Y=0.85m$ | **ĐẠT CHUẨN** |
| **Đèn ngủ cảm ứng** | `lamp` | $[1.6, 0.30, 1.0]$ | Chân tường $Y=0.30m$ rọi chân không lóa mắt | **ĐẠT CHUẨN** |

---

## 4. KẾT QUẢ KIỂM THỬ TRỰC QUAN TRÊN 10 PHÒNG THỬ NGHIỆM (ROOMS A – J)

Kiểm thử tự động thực thi thông qua Vitest suite `tests/spatialValidationEngine.test.ts`:

1. **Phòng A (Phòng ngủ chuẩn):** Đạt chuẩn, $0$ lỗi nghiêm trọng, hệ tọa độ chuẩn xác.
2. **Phòng B (Phòng ngủ có vật thể lơ lửng):** Phát hiện ghế đẩu lơ lửng $45cm$ (`FLOATING_OBJECT`, độ lệch $0.45m$), tự động hạ chân đế chạm sàn $Y=0$.
3. **Phòng C (Phòng có vật chìm sàn):** Phát hiện giường ngủ chìm $-25cm$ (`FLOOR_PENETRATION`), tự động nâng lên mặt sàn phẳng.
4. **Phòng D (Phòng có tủ đâm xuyên tường):** Phát hiện tủ quần áo vượt ra ngoài biên phòng $3.2m / 2.0m$ (`OUT_OF_ROOM_BOUNDS`), tự động co kéo về khoảng cách an toàn $8cm$ cách vách.
5. **Phòng E (Phòng vệ sinh thanh vịn đặt sai):** Phát hiện thanh vịn đặt sát sàn $5cm$ (`INVALID_WALL_ATTACHMENT`), tự động nâng lên cao độ tiêu chuẩn $0.85m$.
6. **Phòng F (Phòng có bàn đè lên giường):** Phát hiện $0.054m^3$ va chạm hình học (`OBJECT_OVERLAP`).
7. **Phòng G (Phòng có kích thước hoặc tỷ lệ âm):** Phát hiện `scaleY = -1` và `height = -0.8` (`INVALID_SCALE`).
8. **Phòng H (Dollhouse Reference Scene đa phân vùng):** $0$ lỗi nghiêm trọng trên toàn bộ không gian phòng ngủ, walk-in closet và phòng tắm ($7.5m \times 5.2m$).
9. **Phòng I (Phòng dựng từ AI Vision):** Tọa độ raycasting unprojection khớp với bounding box camera.
10. **Phòng J (Phòng có chướng ngại vật lối đi):** Phát hiện chính xác `BLOCKED_WALKWAY` với khoảng cách cản đường $< 0.45m$.

---

## 5. CAMERA, RENDERING & AUTO-FIX TƯƠNG TÁC

- **Lỗi đã sửa tại `src/components/three/RoomCanvas.tsx`:**
  - *Trước sửa:* Khi người dùng kéo thả vật thể bằng gizmo TransformControls, tọa độ Y bị ép cứng về `0`, làm các thiết bị gắn tường (thanh vịn, tranh, gương) bị rơi tụt xuống sàn.
  - *Sau sửa:* Đã phân loại `isElevated`, bảo toàn cao độ tường chuẩn ($Y = 0.85m$ cho thanh vịn, $1.55m$ cho tranh), chỉ snap về $0$ cho vật dụng đặt sàn và $0.005m$ cho thảm.
- **Hệ thống Undo / Redo:**
  - Tích hợp ngăn xếp `undoStack` và `redoStack` (giới hạn 20 trạng thái) tại `src/stores/useSimulationStore.ts`.
  - Hỗ trợ hoàn tác / làm lại tức thì cho mọi hành động di chuyển, sửa chữa, thêm thanh vịn hoặc auto-fix hình học.
