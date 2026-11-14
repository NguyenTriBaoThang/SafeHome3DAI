# TÍCH HỢP BẢN SAO SỐ 3D DIGITAL TWIN (RISK 3D INTEGRATION)
## SafeHome Risk Intelligence — Đồng Bộ Không Gian 3D & Tái Thẩm Định

### 1. Cầu Nối Giữa Dữ Liệu Nguy Cơ & Không Gian 3D

Mô-đun Risk Intelligence được liên kết trực tiếp với Bản sao số 3D (`useSimulationStore`) thông qua các cơ chế:

1. **Liên kết vật thể thực (`targetObjectId`)**:
   - Mỗi mối nguy được kích hoạt bởi một đồ vật cụ thể (ví dụ: tấm thảm `rug-1`, đoạn dây điện `cable-1`, ghế chắn lối đi `obstacle-1`) đều mang trường `targetObjectId`.
2. **Tọa độ không gian (`coordinates: [x, y, z]`)**:
   - Giúp camera 3D có thể lập tức xoay góc nhìn và zoom cận cảnh đến đúng tâm điểm của mối nguy trên mô hình số (`focusOnLocation(coordinates)`).
3. **Thao tác xử lý trực tiếp từ Bảng điều khiển (`fixObject`)**:
   - Khi bấm **"Xử lý trong 3D"** tại thẻ mối nguy, hệ thống kích hoạt hàm `fixObject(targetObjectId)` trong store mô phỏng (ví dụ: dán mép thảm, nẹp dây điện vào chân tường, hoặc cất ghế) và tự động kích hoạt tái thẩm định tức thì (`handleReassess()`).

---

### 2. Tái Thẩm Định Sau Can Thiệp 3D (`reassessScene`)

Quy trình tương tác hai chiều:

```
[ Chỉnh sửa vật thể trên 3D Digital Twin ]
                    │
                    ▼
[ Cập nhật RoomState trong useSimulationStore ]
                    │
                    ▼
[ Kích hoạt evaluateRoomHazards(newRoomState) ]
                    │
                    ▼
[ Sinh ra Bản chụp mới (Intervention Snapshot) ]
                    │
                    ▼
[ So sánh với Bản chụp gốc (Baseline Snapshot) ]
                    │
                    ▼
[ Cập nhật trạng thái sang RESOLVED_IN_MODEL hoặc NEW ]
```

---

### 3. Đồng Bộ Trạng Thái Hiển Thị Lớp Nguy Cơ (Hazard Overlay)

- Khi chế độ `showHazardOverlay` được bật trên 3D:
  - Các vật thể có mối nguy `HIGH` sẽ được viền sáng (Outline) màu đỏ (`#e11d48`) và hiển thị biểu tượng cảnh báo lơ lửng trên đầu vật thể.
  - Các vật thể có mối nguy `MEDIUM` hiển thị viền vàng cam (`#d97706`).
  - Lối đi thông thủy (`WalkingZone`) bị xâm lấn sẽ hiển thị dải highlight màu đỏ cảnh báo nghẽn luồng di chuyển.

