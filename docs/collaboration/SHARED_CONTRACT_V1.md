# HỢP ĐỒNG DỮ LIỆU CHUNG V1 (SHARED DATA CONTRACT V1)
**Dự án:** SafeHome 3D AI — Bản sao số phòng ngừa té ngã cho người cao tuổi  
**Phiên bản:** `1.0.0` | **Ngày phê duyệt:** 24/11/2026 | **Mã Sprint:** S0  
**Tài liệu tham chiếu:** `src/lib/contracts/sharedContractV1.ts`

---

## 1. Mục Đích & Nguyên Tắc Cốt Lõi

Hợp đồng dữ liệu chung V1 thiết lập nền tảng kỹ thuật thống nhất giữa **Thành viên 1** (Backend, Risk Engine, RAG, Security, CI) và **Thành viên 2** (Frontend, 3D Canvas, UI/UX, Vision Studio).

### Nguyên Tắc Bắt Buộc (Inviolable Rules):
1. **Nguồn gốc số đo minh bạch (Measurement Provenance):** Mọi thông số vật lý (chiều dài, chiều rộng, chiều cao, lux ánh sáng, lực tỳ tay) bắt buộc phải gắn nhãn nguồn gốc `sourceType`.
2. **Không biến số chưa đo thành an toàn (Fail-Safe Unknowns):** Trạng thái `unknown` tuyệt đối **không** được tự động gán giá trị mặc định "an toàn".
3. **Không tạo số liệu đo giả từ 3D/AI:** Cường độ ánh sáng dựng hình trong Three.js (light intensity) hoặc kích thước pixel bounding box của AI Vision **không** được công bố là "số đo thực tế tại hiện trường".
4. **Phân biệt rõ Đề xuất mô phỏng với Can thiệp thực tế:** Một phương án cải tạo chỉ được gắn nhãn `VERIFIED_POST_INTERVENTION` khi đã được khảo sát trực địa thực tế. Mọi kịch bản trên 3D là `PROPOSED_SCENARIO` (mang tính giả lập minh họa).
5. **Không đưa ra chẩn đoán y khoa:** Ứng dụng hỗ trợ sàng lọc rủi ro môi trường vật lý, không phải thiết bị y tế chẩn đoán hoặc cam kết loại bỏ 100% nguy cơ té ngã.

---

## 2. Quy Ước Chuẩn Hóa (Naming & Units)

### 2.1 Quy ước định danh (ID Prefixes)
| Đối tượng | Quy ước tiền tố | Ví dụ |
| :--- | :--- | :--- |
| **Không gian phòng** | `room-<loại>-<uuid/id>` | `room-bedroom-01`, `room-bathroom-02` |
| **Vật thể 3D** | `obj-<loại>-<uuid/id>` | `obj-bed-01`, `obj-rug-02` |
| **Nhận diện AI Vision** | `det-<uuid/id>` | `det-table-94a1`, `det-rug-88b2` |
| **Số đo vật lý** | `m-<field>-<uuid/id>` | `m-lux-night-01`, `m-walkway-width-02` |
| **Mối nguy phát hiện** | `finding-<ruleId>-<uuid/id>` | `finding-RISK-001-a1b2` |
| **Kết quả đánh giá** | `asmt-<uuid/id>` | `asmt-baseline-001` |
| **Bản chụp trạng thái** | `snap-<uuid/id>` | `snap-pre-intervention-01` |
| **So sánh Trước/Sau** | `cmp-<uuid/id>` | `cmp-scenario-01` |

### 2.2 Đơn vị đo lường chuẩn (Standard Units)
- **Kích thước phòng & lối đi:** Mét (`m`), làm tròn tối đa 2 chữ số thập phân (e.g. `0.85 m`).
- **Kích thước vật thể nhỏ / gờ cửa / độ cao thành giường:** Centimét (`cm`), (e.g. `48 cm`).
- **Độ rọi ánh sáng:** Lux (`lux`), đo ở mặt sàn dọc tuyến đường di chuyển.
- **Tải trọng thanh vịn:** Kilôgam (`kg`), tiêu chuẩn tối thiểu `150 kg`.
- **Góc nghiêng dốc / bậc thềm:** Độ (`deg`).

---

## 3. Cấu Trúc Dữ Liệu Chi Tiết (Data Contracts)

### 3.1 Nguồn gốc số đo (`Measurement<T>`)
```typescript
type MeasurementSourceType = 
  | "measured"          // Đo bằng dụng cụ vật lý thực tế (thước laser, máy đo lux, thước dây)
  | "user_confirmed"    // Người cao tuổi hoặc người chăm sóc xác nhận qua bảng hỏi/khảo sát
  | "vision_estimated"  // AI Vision ước lượng từ ảnh 2D (kèm độ tin cậy confidence)
  | "simulated"         // Giá trị giả lập trong môi trường 3D Digital Twin
  | "unknown";          // Chưa có dữ liệu kiểm chứng (bắt buộc giữ nguyên cờ cảnh báo)

interface Measurement<T> {
  value: T | null;                     // Giá trị (null nếu là unknown)
  unit: "cm" | "m" | "lux" | "kg" | "deg" | "boolean" | "count" | "ratio";
  sourceType: MeasurementSourceType;   // Phân loại nguồn gốc
  confidence: number | null;           // 0.0 - 1.0 (cho AI/ước lượng)
  uncertainty: number | null;          // Khoảng sai số (±)
  method: string | null;               // Phương pháp thu thập
  updatedAt: string;                   // ISO 8601
  confirmedBy: string | null;          // Người/chuyên gia xác thực
  provenanceId: string | null;         // ID buổi khảo sát hoặc ảnh gốc
}
```

### 3.2 Hợp đồng Không gian Phòng (`RoomV1`)
```typescript
interface RoomV1 {
  id: string;                          // Bắt đầu bằng 'room-'
  homeId: string;
  name: string;
  roomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM";
  dimensions: {
    lengthM: Measurement<number>;
    widthM: Measurement<number>;
    heightM: Measurement<number>;
  };
  floor: {
    material: "WOOD" | "CERAMIC_TILE" | "NON_SLIP_VINYL" | "CARPET" | "CEMENT" | "UNKNOWN";
    isWet: Measurement<boolean>;
    isSlipResistant: Measurement<boolean>;
    hasThresholdStep: Measurement<boolean>;
    thresholdHeightCm: Measurement<number> | null;
  };
  lighting: {
    daytimeLux: Measurement<number>;
    nighttimeLux: Measurement<number>;
    nightLightPresent: Measurement<boolean>;
    nightLightType: "MOTION_SENSOR" | "CONTINUOUS" | "MANUAL_SWITCH" | "NONE" | "UNKNOWN";
  };
  walkwayClearanceM: Measurement<number>; // Chiều rộng lối đi thông thủy hẹp nhất
  grabBarsCount: Measurement<number>;
  updatedAt: string;
  schemaVersion: "1.0.0";
}
```

### 3.3 Hợp đồng Mối nguy & Đánh giá (`RiskFindingV1`, `AssessmentResultV1`)
```typescript
interface RiskFindingV1 {
  id: string;                          // 'finding-'
  ruleId: string;                      // 'RISK-001' .. 'RISK-008'
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  certainty: "CONFIRMED" | "PROVISIONAL" | "HYPOTHETICAL";
  requiresManualConfirmation: boolean; // True nếu AI phát hiện chưa có đo thực tế
  targetObjectId: string | null;       // ID vật thể 3D liên quan
  targetZone: string | null;           // Vị trí lối đi
  inputProvenance: Array<{
    field: string;
    sourceType: MeasurementSourceType;
    value: any;
    unit?: string;
  }>;
  recommendation: {
    title: string;
    steps: string[];
    estimatedCost: string | null;
    referenceIds: string[];            // ID tài liệu y tế WHO/CDC
  };
  status: "ACTIVE" | "RESOLVED" | "IGNORED";
}

interface AssessmentResultV1 {
  assessmentId: string;                // 'asmt-'
  roomId: string;
  scenarioId: string | null;
  isBaseline: boolean;
  findings: RiskFindingV1[];
  heuristicSafetyScore: number;        // Chỉ số an toàn trực quan 0-100 (Heuristic UI)
  missingInputs: string[];             // Danh mục thông số cần khảo sát thêm
  dataQuality: {
    measuredCount: number;
    userConfirmedCount: number;
    visionEstimatedCount: number;
    simulatedCount: number;
    unknownCount: number;
  };
  ruleVersion: string;                 // e.g. "2026.1"
  createdAt: string;
}
```

### 3.4 Hợp đồng So sánh Trước/Sau (`BeforeAfterComparisonV1`)
```typescript
interface BeforeAfterComparisonV1 {
  comparisonId: string;                // 'cmp-'
  roomId: string;
  baselineSnapshotId: string;          // ID trạng thái ban đầu
  interventionSnapshotId: string;      // ID trạng thái sau can thiệp
  resolvedFindings: RiskFindingV1[];   // Nguy cơ đã xử lý
  unresolvedFindings: RiskFindingV1[]; // Nguy cơ còn tồn đọng
  newFindings: RiskFindingV1[];        // Nguy cơ mới phát sinh
  baselineSafetyScore: number;
  interventionSafetyScore: number;
  deltaScore: number;
  canClaimVerifiedIntervention: boolean; // Bắt buộc FALSE nếu chỉ là mô phỏng 3D
  verificationNotes: string;
  auditTrail: string[];
}
```

---

## 4. Danh Mục Nguy Cơ Chuẩn Hóa (Hazard Catalog)

Hệ thống thống nhất duy nhất 1 bộ quy tắc thẩm định chuẩn (`RISK-001` đến `RISK-008`):

| Mã Luật | Tên Mối Nguy | Mức Độ | Ngưỡng Kích Hoạt | Nguồn Tham Chiếu |
| :--- | :--- | :--- | :--- | :--- |
| **RISK-001** | Thảm trải sàn không cố định / cong mép | HIGH | `isSlipResistant == false` hoặc thảm rời lối đi | CDC STEADI, WHO 2021 |
| **RISK-002** | Dây điện vắt ngang mặt sàn lối đi | HIGH | Dây điện hở trên lối đi | CDC STEADI |
| **RISK-003** | Lối đi bị vật cản / hẹp dưới chuẩn | HIGH | Chiều rộng thông thủy `< 0.80 m` | ADA Standards, CDC |
| **RISK-004** | Ánh sáng ban đêm không đạt chuẩn | HIGH | Độ rọi đêm `< 30 lux` hoặc thiếu đèn cảm ứng | WHO Age-Friendly |
| **RISK-005** | Sàn nhà tắm trơn trượt / ngập nước | HIGH | Sàn gạch trơn dính nước không chống trượt | Bộ Y tế VN, CDC |
| **RISK-006** | Thiếu thanh vịn tại bồn cầu và buồng tắm | HIGH | Nhà vệ sinh thiếu thanh vịn chịu lực | CDC STEADI, WHO |
| **RISK-007** | Chiều cao mặt giường ngủ không phù hợp | MEDIUM | Mặt nệm `< 45 cm` hoặc `> 55 cm` | CDC Fall Prevention |
| **RISK-008** | Gờ cửa / bậc tam cấp chênh cốt cao | MEDIUM | Bậc chênh lệch `> 1.5 cm` không có dốc thoải | ADA, CDC STEADI |

---

## 5. Phân Định Quyền Sở Hữu Mã Nguồn (File Ownership Matrix)

| Khu vực / Module | Thành viên 1 (Backend/Risk/Security) | Thành viên 2 (Frontend/3D/Vision UI) |
| :--- | :--- | :--- |
| `src/lib/risk/**` | **Owner chính** (Logic đánh giá, luật, so sánh) | Consumer (Chỉ gọi API/Adapter, không sửa luật) |
| `src/lib/contracts/**` | **Owner chính** (Định nghĩa Schema, Zod) | Consumer (Tuân thủ kiểu dữ liệu) |
| `src/lib/rag/**` | **Owner chính** (Embeddings, RAG, Citation) | Consumer |
| `src/lib/database/**`, `prisma/**` | **Owner chính** (DB Schema, Migrations) | Consumer |
| `src/app/api/**` | **Owner chính** (REST APIs, Auth, Validation) | Consumer |
| `src/components/three/**` | Reviewer | **Owner chính** (Canvas, 3D Models, Shaders) |
| `src/app/ai-vision/**` (UI) | Reviewer (Chỉ cấp API adapter) | **Owner chính** (Giao diện Studio, camera) |
| `src/app/digital-twin/**` | Reviewer | **Owner chính** (Tương tác bản sao số) |
| `src/stores/useSimulationStore.ts` | Đồng sở hữu (Phần tính toán risk) | **Owner chính** (Phần tương tác UI 3D) |

---

## 6. Quy Trình Phối Hợp & Tiêu Chí Release (Quality Gates)

### 6.1 Quy ước nhánh (Branch Conventions)
- **Thành viên 1:** `feature/a-<task-id>-<slug>` (Ví dụ: `feature/a-01-baseline-contract`, `feature/a-03-unified-risk-engine`).
- **Thành viên 2:** `feature/b-<task-id>-<slug>` (Ví dụ: `feature/b-01-ui-contract-sync`, `feature/b-04-vision-ui`).
- Tuyệt đối **không** commit trực tiếp vào `main`. Mọi tích hợp thông qua Pull Request có review chéo.

### 6.2 Tiêu chí hoàn thành (Definition of Done)
1. Mã nguồn thực tế có unit test tương ứng chạy thực tế (không giả lập kết quả).
2. Typecheck không lỗi: `npx tsc --noEmit` hoàn thành với 0 lỗi.
3. Test suite vượt qua: `npm test -- --run` đạt 100% PASS.
4. Tuân thủ `.github/pull_request_template.md` kèm đầy đủ bằng chứng câu lệnh và log thực tế.
5. Không có lỗi bảo mật P0 (không lộ secret, không vi phạm IDOR trên server).

