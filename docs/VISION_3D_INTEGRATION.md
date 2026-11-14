# Tích Hợp Thị Giác Vào Bản Sao Số 3D (Vision to 3D Scene Draft)

Tài liệu này mô tả cách phân hệ Thị giác AI chuyển đổi các phát hiện hộp giới hạn 2D thành bản thảo bố trí không gian 3D sơ bộ (**RoomSceneDraft**) cho mô hình Digital Twin Three.js.

---

## 1. Nguyên Tắc Khoa Học Và Giới Hạn Không Gian 2D-to-3D

> [!WARNING] Cảnh Báo An Toàn & Chuẩn Mực Kỹ Thuật
> Ảnh 2D từ camera điện thoại thông thường không có dữ liệu đo chiều sâu (Depth LiDAR) hoặc hiệu chuẩn quang sai thấu kính (Intrinsic Camera Matrix). Do đó:
> 1. Mọi vị trí tọa độ `(x, y, z)` và kích thước `(sx, sy, sz)` trích xuất từ 2D Bounding Box **bắt buộc phải gắn cờ `isEstimate: true`**.
> 2. Hệ thống **tuyệt đối không** tự ý khẳng định số đo khoảng cách thực tế (ví dụ: "lối đi rộng chính xác 65cm") nếu chưa được người dùng xác thực hoặc hiệu chuẩn với vật chuẩn.

---

## 2. Quy Trình Ánh Xạ Tọa Độ Tương Đối

Mô hình phòng 3D chuẩn có kích thước mặc định:
- Phòng ngủ: `4.0m x 4.0m x 2.8m` (Tâm phòng đặt tại gốc tọa độ `(0, 0, 0)`)
- Phòng tắm: `2.5m x 2.5m x 2.6m`

Thuật toán chuyển đổi từ tọa độ chuẩn hóa `NormalizedBoundingBox` `[ymin, xmin, ymax, xmax]` sang không gian 3D:
- Tọa độ X trong 3D: `posX = (center2DX - 0.5) * roomWidth`
- Tọa độ Z trong 3D: `posZ = (center2DY - 0.5) * roomLength`
- Độ cao Y (áp sàn): `posY = objectHeight / 2`
- Chiều rộng ước tính: `scaleX = (xMax - xMin) * roomWidth`
- Chiều sâu ước tính: `scaleZ = (yMax - yMin) * roomLength`

---

## 3. Bản Thảo Dữ Liệu 3D Sơ Bộ (`SceneDraftFromVision`)

```typescript
export interface SceneDraftFromVision {
  roomId: string;
  roomType: "BEDROOM" | "BATHROOM";
  roomDimensions: { width: number; length: number; height: number };
  detectedObjects: Array<{
    category: DetectionCategory;
    name: string;
    position: [number, number, number];
    scale: [number, number, number];
    confidence: number;
    isEstimate: boolean;
    verificationStatus: string;
  }>;
  suggestedHazards3D: Array<{
    hazardId: string;
    targetObjectId?: string;
    position: [number, number, number];
    title: string;
    severity: string;
  }>;
}
```
Bản thảo này cung cấp điểm khởi đầu trực quan để người dùng chuyển thẳng sang chế độ mô phỏng không gian 3D (`/digital-twin`), tinh chỉnh vị trí nội thất và thực hiện cải tạo giả lập.

