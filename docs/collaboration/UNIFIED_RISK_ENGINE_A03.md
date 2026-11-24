# SafeHome 3D AI — Unified Deterministic Risk Engine (Task A03)

**Author:** Thành viên 1 (Backend, Risk Core, RAG & Security)  
**Collaborator / Consumer:** Thành viên 2 (AI Vision, 3D Simulation & Frontend)  
**Status:** Implemented & Verified  
**Priority:** P0 (Sprint S1)  
**Branch:** `feature/a-03-unified-risk-engine`  

---

## 1. Mục tiêu & Nguyên lý kiến trúc

Trước Task A03, hệ thống tồn tại **hai nguồn logic suy luận rủi ro song song**:
1. **Engine Môi trường 3D / Khảo sát (`src/lib/risk/ruleEngine.ts`):** Sử dụng `ALL_VERSIONED_RULES`, sinh ra `AssessmentSnapshot` nhưng có `snapshotId` phụ thuộc vào thời gian chạy (`Date.now()`), thiếu phân định độ chắc chắn theo nguồn gốc dữ liệu, và trộn lẫn mức độ nghiêm trọng lâm sàng với mức độ ưu tiên can thiệp.
2. **Engine Thị giác AI (`src/lib/vision/imageRiskAssessment.ts` & `itemHazardAnalyzer.ts`):** Tự sinh ra các số đo mã cứng giả định (`200 Lux`, `40 Lux`, `0.72m`) để ép kích hoạt luật phòng, hoặc duy trì một bảng quy tắc nguy cơ độc lập (`HEURISTIC_KNOWLEDGE` 690 dòng) không liên kết với các mã quy tắc `RISK-001..008`.

**Mục tiêu của Task A03:**
Hợp nhất toàn bộ logic suy luận rủi ro té ngã về **MỘT LÕI DUY NHẤT (Single Source of Truth)** — hàm thuần `evaluateRoomHazardsCanonical`, bảo đảm tính tất định 100%, có truy vết luật minh bạch (`ruleTrace`), phân định rạch ròi giữa Mức độ nghiêm trọng (`severity`), Độ tin cậy dữ liệu (`certainty`), và Mức độ khẩn thiết (`priority`).

---

## 2. Bảng so sánh trước và sau khi hợp nhất (Before vs After)

| Tiêu chí | Trước Task A03 (Hai Engine rời rạc) | Sau Task A03 (Canonical Risk Engine) |
|---|---|---|
| **Số nguồn chân lý (Source of Truth)** | **2 nguồn:** `ruleEngine.ts` và `imageRiskAssessment.ts` / `itemHazardAnalyzer.ts`. | **1 nguồn duy nhất:** `evaluateRoomHazardsCanonical` trong `src/lib/risk/canonicalEngine.ts`. |
| **Tính tất định (Determinism)** | Không tất định: ID snapshot dùng `Date.now()`, thứ tự kết quả không được đảm bảo. | **Tất định 100%:** Hash SHA-256 từ nội dung phòng, ID finding cố định `finding-riskXXX-{roomId}`. |
| **Phân tách Severity & Certainty** | Đồng nhất `severityCategory` với `priority` ("HIGH", "MEDIUM", "LOW"). | Tách độc lập: `severity` (tác động lâm sàng), `certainty` (CONFIRMED / PROVISIONAL / HYPOTHETICAL), `priority` (thứ tự can thiệp). |
| **Xác nhận thủ công (`manual_confirmation`)** | Không có cờ báo động. AI đoán mò sàn trơn hoặc thảm dán mà không yêu cầu kiểm tra lại. | Tự động bật `requiresManualConfirmation: true` khi dữ liệu là ước lượng AI 2D, mô phỏng 3D hoặc yếu tố xúc giác (độ trơn, mép thảm, độ rọi). |
| **Hằng số giả định trong Vision** | Tự gán `nighttimeLux: 40`, `walkway: 0.72m`, `length: 4.5m`. | Loại bỏ việc chế số đo giả định; gán nhãn nguồn gốc `sourceType: "AI_VISION"` và độ tin cậy `PROVISIONAL`. |
| **Liên kết vật dụng (Item Hazard)** | Bảng quy tắc độc lập, không có mã `RISK-XXX`. | Ánh xạ trực tiếp mỗi nhóm vật dụng sang mã luật chuẩn (`getCanonicalRuleForItemCategory`). |
| **Tương thích ngược** | Nguy cơ vỡ giao diện nếu thay đổi cấu trúc trả về. | Cung cấp adapter `adaptCanonicalToLegacySnapshot`, toàn bộ UI cũ tiếp tục hoạt động không đổi. |

---

## 3. Danh mục 8 Quy tắc Lâm sàng Chuẩn (`RISK-001` đến `RISK-008`)

Mọi phân hệ (Khảo sát hiện trường, 3D Digital Twin, AI Vision, Item Analyzer) đều quy chiếu về 8 mã quy tắc:

| Mã quy tắc | Tên quy tắc lâm sàng | Ngưỡng kích hoạt | Severity | Căn cứ y học |
|:---:|---|---|:---:|---|
| **`RISK-001`** | Thảm trải sàn không cố định / quăn mép | Thảm lỏng lẻo nằm trên luồng di chuyển chính | **HIGH** | CDC STEADI (2019), WHO Guidelines Chapter 3 |
| **`RISK-002`** | Dây điện / cáp sạc vắt ngang lối đi | Dây không có ghen nẹp bảo vệ cắt ngang lối đi | **HIGH** | CDC STEADI Fall Prevention Checklist |
| **`RISK-003`** | Lối đi bị vật cản / thắt hẹp thông thủy | Khoảng thông thủy lối đi $< 0.90\text{ m}$ (hoặc $< 0.70\text{ m}$) | **HIGH** / **MED** | ADA Guidelines & Hướng dẫn Bộ Y tế VN |
| **`RISK-004`** | Chiếu sáng ban đêm không đủ | Độ rọi ban đêm $< 50\text{ Lux}$ hoặc thiếu đèn ngủ | **HIGH** | Illuminating Engineering Society (IES) RP-28 |
| **`RISK-005`** | Sàn nhà ướt / trơn trượt | Gạch men ướt thiếu thảm cao su giác hút DCOF $< 0.42$ | **HIGH** | Pendulum Test Value (BS 7976-2), CDC STEADI |
| **`RISK-006`** | Thiếu thanh vịn chịu lực nhà vệ sinh | Thiếu tay vịn tại bồn cầu hoặc khu vực tắm đứng | **HIGH** | WHO 2021 Clinical Recommendations |
| **`RISK-007`** | Gờ bậc cửa cao / Chiều cao nệm bất hợp lý | Gờ cửa $> 1.5\text{ cm}$ hoặc nệm giường ngoài $45 - 55\text{ cm}$ | **HIGH** / **MED** | AGS/BGS Guidelines, CDC STEADI |
| **`RISK-008`** | Công tắc đèn / vật dụng ngoài tầm với | Không với tới công tắc hoặc điện thoại từ giường | **MEDIUM** | CDC STEADI Home Safety Modifications |

---

## 4. Hợp đồng dữ liệu chuẩn (`AssessmentResultV1`)

```typescript
export interface AssessmentResultV1 {
  assessmentId: string;           // "asmt-{roomId}-{sha256}"
  roomId: string;
  scenarioId: string | null;      // null nếu là baseline, có ID nếu là mô phỏng 3D
  isBaseline: boolean;
  findings: RiskFindingV1[];
  heuristicSafetyScore: number;   // 0 - 100 (Điểm tuân thủ rào cản môi trường)
  missingInputs: string[];        // Danh sách trường còn thiếu cần khảo sát thêm
  dataQuality: {
    measuredCount: number;
    userConfirmedCount: number;
    visionEstimatedCount: number;
    simulatedCount: number;
    unknownCount: number;
  };
  ruleVersion: "2026.1";
  createdAt: string;              // ISO 8601
}
```

### Mỗi nguy cơ phát hiện (`RiskFindingV1`):
```typescript
export interface RiskFindingV1 {
  id: string;                     // "finding-risk001-{roomId}"
  ruleId: string;                 // "RISK-001"
  title: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  certainty: "CONFIRMED" | "PROVISIONAL" | "HYPOTHETICAL";
  requiresManualConfirmation: boolean;
  targetObjectId: string | null;
  targetZone: string | null;
  inputProvenance: Array<{
    field: string;
    sourceType: MeasurementSourceType;
    value: any;
  }>;
  recommendation: {
    title: string;
    steps: string[];
    estimatedCost: string | null;
    referenceIds: string[];
  };
  status: "ACTIVE" | "RESOLVED" | "IGNORED";
}
```

---

## 5. Hướng dẫn tích hợp cho Thành viên 2 (B09 - UI & B04/B07 - Vision/3D)

1. **Khi gọi đánh giá từ giao diện khảo sát hoặc bảng điều khiển:**
   - Sử dụng hàm canonical: `import { evaluateRoomHazardsCanonical } from "@/lib/risk/canonicalEngine";`
   - Nhận về `AssessmentResultV1` với cấu trúc `findings` chuẩn và `heuristicSafetyScore`.
2. **Khi hiển thị cảnh báo cho người dùng:**
   - Kiểm tra `finding.requiresManualConfirmation`: Nếu `true`, hiển thị huy hiệu *"Cần người dùng xác nhận thực địa"* thay vì kết luận tuyệt đối.
   - Kiểm tra `finding.certainty`:
     - `CONFIRMED`: Huy hiệu xanh lá (Đã đo đạc thực tế).
     - `PROVISIONAL`: Huy hiệu vàng cam (AI Vision ước lượng từ ảnh 2D).
     - `HYPOTHETICAL`: Huy hiệu tím (Mô phỏng Digital Twin 3D giả định).
3. **Khi phân tích từng vật thể từ ảnh:**
   - Hàm `analyzeItemHazardFromImage` nay luôn trả về trường `canonicalRuleId` (ví dụ `RISK-001`), cho phép click từ vật thể sang thẳng quy tắc phòng ngừa toàn diện.

---

## 6. Kết quả kiểm thử tự động (Verification & Test Evidence)

Đã xây dựng bộ kiểm thử chuyên biệt `tests/canonicalRiskEngine.test.ts` gồm 6 nhóm bài test:
- ✅ **100/100 vòng lặp tất định:** Chạy 100 lần liên tiếp với cùng dữ liệu đầu vào sinh ra kết quả giống nhau tuyệt đối từng byte.
- ✅ **Phủ đủ 22 golden fixtures:** Tất cả 22 kịch bản phòng (an toàn, nguy cơ đơn, nguy cơ kép, dữ liệu thiếu, đo thật, AI vision, 3D dollhouse) đều vượt qua kiểm tra Zod schema.
- ✅ **Phân tách rạch ròi:** Phân biệt chính xác giữa `CONFIRMED`, `PROVISIONAL`, `HYPOTHETICAL` và tự động gán `requiresManualConfirmation`.
- ✅ **Nhất quán giữa các phân hệ:** Adapter chuyển đổi tương thích 100% với các component giao diện hiện hữu mà không gây lệch điểm hay lệch mã finding.
- ✅ **Nguyên tắc Fail-Safe:** Phòng thiếu dữ liệu tự động ghi nhận vào `missingInputs` và không bao giờ đạt điểm 100.
- ✅ **Công thức điểm chuẩn xác:** Trừ điểm tuyến tính có kiểm soát (High: -15, Medium: -8, Low: -4, NeedsVerification: -3).

