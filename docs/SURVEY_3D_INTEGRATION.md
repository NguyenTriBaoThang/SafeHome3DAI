# Tích Hợp Mô Hình 3D Digital Twin — Survey 3D Integration

Tài liệu này hướng dẫn cách chuyển tiếp dữ liệu hồ sơ phòng (`RoomProfile`) từ SafeHome AI Guided Survey sang Không gian số 3D (`SceneDraft`) trong SafeHome 3D AI.

---

## 1. Cơ Chế Chuyển Đổi (Adapter Mechanism)

Module `src/lib/survey/sceneDraftAdapter.ts` cung cấp hàm adapter chuẩn hóa:

```typescript
export function convertRoomProfileToSceneDraft(profile: RoomProfile): SceneDraft
```

Hàm này thực hiện:
1. **Phân giải kích thước không gian**:
   - Nếu người dùng cung cấp kích thước (`profile.dimensions.lengthM` và `widthM`), sử dụng chính xác kích thước này và gán xuất xứ dữ liệu `USER_ESTIMATED` / `USER_SELECTED`.
   - Nếu người dùng chọn "Chưa rõ kích thước", hệ thống áp dụng kích thước mẫu tiêu chuẩn (Phòng ngủ: 5.0m x 4.0m x 2.8m; Nhà vệ sinh: 2.5m x 2.0m x 2.6m), đánh dấu `isDemoFallback: true` và ghi nhận rõ trong mảng `unresolvedMeasurements`.
2. **Tổng hợp vật thể 3D tương thích**:
   - Đối với Phòng ngủ: Tự động khởi tạo Giường ngủ (`bed`), Tủ đầu giường (`nightstand`). Nếu khảo sát ghi nhận có thảm, tạo tấm thảm 3D (`rug`) cạnh giường. Nếu ghi nhận có dây điện trên lối đi, tạo mô hình dây điện vắt ngang (`cable`) và gắn cờ `isHazardSource: true`. Nếu ghi nhận có vật cản, tạo các khối hộp hoặc ghế tương ứng.
   - Đối với Nhà vệ sinh: Tạo bồn cầu (`toilet`), buồng tắm (`shower`). Nếu khảo sát ghi nhận có tay vịn, tạo thanh tay vịn 3D (`grab_bar`) gắn tường.
3. **Thuộc tính môi trường (Environmental Properties)**:
   - Gán mức độ chiếu sáng `lightingLux`: Nếu khảo sát ghi nhận ban đêm thiếu sáng, đặt giá trị ánh sáng mô phỏng là 50 lux (tối/nguy hiểm); nếu đủ sáng hoặc có đèn ngủ, đặt từ 100 - 150 lux.
   - Gán tình trạng sàn: `isWet` và `isSlippery` dựa trên câu trả lời khảo sát thực tế.

---

## 2. Cấu Trúc Dữ Liệu `SceneDraft`

```typescript
export interface SceneDraft {
  roomId: string;
  roomType: string;
  roomName: string;
  approximateDimensions: {
    length: number;
    width: number;
    height: number;
    isDemoFallback: boolean;
  };
  objects: SceneDraftObject[];
  environmentalProperties: {
    lightingLux: number;
    floorMaterial: string;
    isWet: boolean;
    isSlippery: boolean;
  };
  objectPlacementStatus: "DRAFT_AUTO_GENERATED" | "USER_CONFIRMED";
  unresolvedMeasurements: string[];
  dataProvenance: Record<string, AnswerSource>;
}
```

---

## 3. Điều Hướng Người Dùng Từ Khảo Sát Sang 3D

Khi người dùng hoàn tất khảo sát hoặc muốn xem trước mô hình không gian:
- Giao diện khảo sát cung cấp nút bấm **"Mô hình 3D Digital Twin"** trỏ tới `/digital-twin`.
- API endpoint `GET /api/surveys/[id]/rooms/[roomId]/profile` trả về đồng thời cả `profile` và `sceneDraft`.
- Hệ thống không tự ý bịa đặt tọa độ cm chính xác của đồ đạc mà luôn gắn cờ `requiresPlacementConfirmation: true` để người dùng có thể kéo thả và tinh chỉnh tự do trong không gian 3D.

