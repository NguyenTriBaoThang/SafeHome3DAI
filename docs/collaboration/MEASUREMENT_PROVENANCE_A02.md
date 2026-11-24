# SafeHome 3D AI — Measurement Provenance & Lineage Engine (Task A02)

**Author:** Thành viên 1 (Backend, Risk Core, RAG & Security)  
**Collaborator / Consumer:** Thành viên 2 (AI Vision, 3D Simulation & Frontend)  
**Status:** Implemented & Verified  
**Priority:** P0 (Sprint S1)  
**Branch:** `feature/a-02-measurement-provenance`  

---

## 1. Mục tiêu & Bối cảnh

Trong hệ thống hỗ trợ phòng ngừa té ngã cho người cao tuổi, **độ tin cậy của dữ liệu đo lường** quyết định tính sống còn và giá trị y học của toàn bộ các kết luận rủi ro. 

Trước Task A02, hệ thống tồn tại các giả định ngầm và nhập nhằng dữ liệu:
1. **Nhập nhằng chiều cao giường:** Chiều cao giường được biểu diễn dưới dạng 1 số vô hướng duy nhất (`0.7m` hoặc `70cm`). Trong công thái học lâm sàng (CDC STEADI / AGS-BGS), chiều cao mặt nệm ngồi (`bedSurfaceHeightCm`, 45–55cm) quyết định trực tiếp nguy cơ hạ huyết áp tư thế và té ngã khi đứng dậy, khác biệt hoàn toàn với chiều cao phủ bì đầu giường (`totalBedHeightCm`, 70–85cm).
2. **Nhập nhằng độ rọi vật lý và cường độ shader:** Cường độ ánh sáng trong Three.js (`intensity: 1.5`, hệ số vô thứ nguyên) bị đánh đồng hoặc nhầm lẫn với độ rọi vật lý bề mặt tính bằng Lux (cần tối thiểu 50–100 Lux theo chuẩn chiếu sáng sinh hoạt ban đêm).
3. **Giả định an toàn ngầm định khi thiếu dữ liệu:** Khi dữ liệu độ trơn trượt sàn hoặc độ rọi chưa được đo, hệ thống tự động gán mặc định an toàn (ví dụ: `isSlipResistant: profile.floor?.isSlipperyReported === false` dẫn đến việc nếu người dùng chưa khảo sát thì hệ thống coi như sàn chống trượt!).

Task A02 chuẩn hóa toàn bộ kiểu dữ liệu, nguồn gốc số đo (Data Provenance), đưa ra cơ chế gắn nhãn nguồn gốc 5 cấp độ và bảo đảm trạng thái `unknown` không bao giờ bị coi là an toàn.

---

## 2. Danh mục kiểm toán các hằng số mã cứng (Hardcoded Constants Audit Catalog)

| Hạng mục / Biến | File & Dòng | Giá trị mã cứng cũ | Phân loại & Rủi ro lâm sàng | Chuẩn hóa Task A02 |
|---|---|---|---|---|
| **Chiều cao giường (Bed Height)** | `ProceduralFurniture.tsx:12`, `mockRooms.ts:18` | `0.7m` / `70cm` | **Conflated Scalar:** Đồng nhất chiều cao thành giường với mặt nệm ngồi. Gây âm tính giả hoặc dương tính giả cho `RISK-007`. | Tách thành 2 trường độc lập: `bedSurfaceHeightCm` (mặt nệm) và `totalBedHeightCm` (đầu giường/thành giường). |
| **Độ rọi ban đêm (Night Lux)** | `mockRooms.ts:16` | `45 Lux` | **Demo Default:** Giá trị ngầm định trong mock data, chưa qua máy đo hoặc ảnh chụp thực tế. | Đánh nhãn `sourceType: "simulated"` và `isLegacyAssumed: true`. |
| **Độ rọi ban ngày (Day Lux)** | `imageRiskAssessment.ts:60` | `200 Lux` | **Heuristic Estimate:** Giá trị giả định trong module Vision khi phân tích ảnh. | Gán nhãn `sourceType: "vision_estimated"` kèm `confidence`. |
| **Độ rọi mô hình 3D (Scene Lux)** | `dollhouseReferenceScene.ts:52` | `320 Lux` | **Simulation Value:** Số đo ánh sáng môi trường trong scene dollhouse. | Gán nhãn `sourceType: "simulated"`, phân biệt với `threeJsRenderIntensity` (`unit: "ratio"`). |
| **Chiều rộng lối đi (Clearance Width)** | `mockRooms.ts:17`, `risk/types.ts:86` | `0.8m` / `0.9m` | **Untyped Constant:** Không có siêu dữ liệu dung sai sai số đo. | Chuẩn hóa sang `walkwayClearWidthM` với `unit: "m"`, lưu `uncertainty`. |
| **Độ chống trượt sàn (isSlipResistant)** | `inputAdapter.ts:74` | `isSlipperyReported === false` | **Implicit Safe Assumption:** Chưa khảo sát thì mặc định là chống trượt. Vi phạm an toàn y tế. | Thiếu dữ liệu thì phải giữ nguyên `sourceType: "unknown"`, `value: null`. Báo động trong `missingCriticalInputs`. |

---

## 3. Mô hình nguồn gốc số đo (Provenance Schema)

### 3.1. Cấu trúc `ProvenanceRecord<T>`
```typescript
export interface ProvenanceRecord<T = any> {
  value: T | null;             // Giá trị thực tế (hoặc null nếu unknown)
  unit: MeasurementUnit;       // "cm" | "m" | "lux" | "ratio" | "degree" | "boolean"
  sourceType: MeasurementSourceType; // 5 cấp độ (xem mục 4)
  confidence: number | null;   // 0.0 - 1.0
  uncertainty: number | null;  // Dung sai sai số tuyệt đối (+/-)
  method: string | null;       // Công cụ / phương pháp đo (vd: "laser_meter", "survey")
  updatedAt: string;           // ISO 8601 Timestamp
  confirmedBy: string | null;  // Người chịu trách nhiệm xác nhận (KTS, Bác sĩ, Gia đình)
  evidenceId: string | null;   // ID ảnh hiện trường, chứng chỉ kiểm định, hoặc scenario 3D
  isLegacyAssumed: boolean;    // true nếu chuyển đổi từ hệ thống cũ chưa có nhật ký đo
}
```

### 3.2. Cấu trúc kích thước giường chuyên biệt `BedDimensionsProvenance`
```typescript
export interface BedDimensionsProvenance {
  bedSurfaceHeightCm: ProvenanceRecord<number>; // Mặt nệm ngồi (Chuẩn an toàn: 45-55cm)
  totalBedHeightCm: ProvenanceRecord<number>;   // Khung thành/đầu giường phủ bì (70-85cm)
  lengthCm: ProvenanceRecord<number>;
  widthCm: ProvenanceRecord<number>;
}
```

---

## 4. Bảng phân cấp nguồn gốc dữ liệu (Provenance Hierarchy & Rules Matrix)

| Cấp | Nguồn gốc (`sourceType`) | Độ tin cậy lâm sàng | Trọng số tin cậy | Giới hạn phát ngôn & Yêu cầu hiển thị |
|:---:|---|---|:---:|---|
| **1** | `measured` | **Rất cao (HIGH)** | `1.0` | Đo bằng công cụ vật lý hiệu chuẩn (thước laser, lux kế, con lắc PTV). Được phép khẳng định hiện trạng vật lý thực tế. |
| **2** | `user_confirmed` | **Cao (MEDIUM_HIGH)** | `0.85` | Khảo sát trực tiếp với gia đình/người cao tuổi. Được dùng làm dữ liệu đầu vào có xác nhận nhân thân. |
| **3** | `vision_estimated` | **Tạm thời (PROVISIONAL)** | `0.4` | Ước lượng từ bounding box và độ sâu 2D của AI Vision. Bắt buộc hiển thị nhãn "Ước lượng AI" kèm thanh độ tin cậy (`confidence`). |
| **4** | `simulated` | **Giả định (HYPOTHETICAL)** | `0.2` | Kết quả can thiệp trên Digital Twin 3D. **Không được tuyên bố giảm té ngã vật lý ngoài đời thực** khi chưa thi công nghiệm thu. |
| **5** | `unknown` | **Không có (NONE)** | `0.0` | Chưa khảo sát / không thể đo. **Tuyệt đối cấm tự động chuyển thành an toàn**. Tự động đưa vào `missingCriticalInputs`. |

---

## 5. Động cơ đánh giá chất lượng dữ liệu (`computeDataQuality`)

Hàm `computeDataQuality` phân tích toàn bộ danh mục thông số đầu vào của phòng và tính toán:
1. Phân bổ số lượng theo từng nguồn gốc: `measuredCount`, `userConfirmedCount`, `visionEstimatedCount`, `simulatedCount`, `unknownCount`.
2. `trustScore`: Điểm tin cậy dữ liệu (0–100%) dựa trên trọng số phân cấp lâm sàng.
3. `missingCriticalInputs`: Danh sách các thông số then chốt bị thiếu (như thiếu độ rọi ban đêm, thiếu chiều cao nệm giường, thiếu tình trạng sàn ướt/trơn).

---

## 6. Hướng dẫn tích hợp cho Thành viên 2 (AI Vision & 3D Simulation)

### 6.1. Dành cho Phân hệ AI Vision (B01 / Multimodal Vision):
- Khi phát hiện đồ vật (giường, bàn, thảm, dây điện) từ ảnh:
  - Sử dụng `createVisionEstimated(value, unit, confidence, method, evidenceImageId)`.
  - Không tự gán `sourceType: "measured"` vì AI Vision ước lượng từ ảnh 2D không có thước chuẩn đo lường lập thể.
  - Luôn cung cấp `evidenceId` trỏ đến `imageId` hoặc `detectionId` của ảnh chụp hiện trường.

### 6.2. Dành cho Phân hệ Mô phỏng 3D Digital Twin (B06 / Procedural Furniture):
- **Phân tách chiều cao:**
  - Khi render nhân vật 3D thực hiện động tác đứng lên / ngồi xuống (Sit-to-Stand kinematics), **bắt buộc** lấy độ cao từ `bedDimensions.bedSurfaceHeightCm` (ví dụ `0.48m`).
  - Khung viền và đầu giường tiếp tục dùng `totalBedHeightCm` (ví dụ `0.70m`).
- **Phân biệt ánh sáng:**
  - Shader `directionalLight.intensity` và `pointLight.intensity` dùng đơn vị `ratio` (hệ số render Three.js), không gán đơn vị là `lux`.
  - Độ rọi phòng hiển thị trong bảng điều khiển phải đọc từ `lighting.nighttimeLux` có đơn vị là `lux`.

---

## 7. Migration & Backfill Dữ liệu Cũ

Module `scripts/migrations/backfill_measurement_provenance.ts` cung cấp hàm `migrateRoomStateToProvenance`:
- Tất cả các trường dữ liệu trước đây trong `mockRooms.ts` chưa có nhật ký đo đạc được tự động gán cờ `isLegacyAssumed: true`.
- Kiểu nguồn gốc bị hạ xuống `simulated`, ngăn chặn việc dữ liệu giả định cũ bị nhầm là số đo thực địa đã kiểm chứng.

---

## 8. Kết quả kiểm thử tự động (Verification & Test Evidence)

Đã xây dựng bộ kiểm thử chuyên biệt `tests/measurementProvenance.test.ts` (7/7 test cases đạt 100%):
- ✅ Phân biệt rõ `bedSurfaceHeightCm` (48cm an toàn) và `totalBedHeightCm` (70cm đầu giường).
- ✅ Phát hiện chính xác giường có mặt nệm quá thấp nguy hiểm (36cm) mà không bị che khuất bởi đầu giường (75cm).
- ✅ Phân biệt độ rọi vật lý (35 Lux) với hệ số shader Three.js (1.5).
- ✅ Xác nhận giá trị `unknown` về chống trượt sàn không bao giờ được coi là an toàn.
- ✅ Tính toán chính xác `trustScore` và bắt lỗi `missingCriticalInputs` đối với các thông số bắt buộc.
- ✅ Khởi tạo và phân cấp theo `PROVENANCE_SOURCE_HIERARCHY`.
- ✅ Di chuyển dữ liệu cũ thành công với cờ `isLegacyAssumed: true` và nguồn gốc `simulated`.

