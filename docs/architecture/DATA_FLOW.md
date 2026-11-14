# LUỒNG DỮ LIỆU TOÀN HỆ THỐNG (DATA FLOW ARCHITECTURE)
### SafeHome 3D AI — Đồng Bộ Hóa Xuyên Suốt Từ Khảo Sát Tới Digital Twin & Báo Cáo

Tài liệu này định nghĩa hợp đồng dữ liệu (Data Contracts), mô hình quan hệ cơ sở dữ liệu và cơ chế chuyển tiếp trạng thái giữa các phân hệ:

```text
Project
  └── Home
        └── Room (BEDROOM / BATHROOM)
              ├── SceneObjects (Vị trí 3D, kích thước, thuộc tính an toàn)
              ├── Assessment (Chỉ số an toàn, 8 Quy tắc, HazardFindings)
              └── SimulationScenario (Kịch bản can thiệp, SceneSnapshots)
```

Song song với chuỗi lưu trữ khảo sát:

```text
HomeSurvey
  └── SurveyRoom
        ├── SurveyAnswer (Câu trả lời từng mã câu hỏi BED_001..008)
        ├── SurveyRoomProfile (Hồ sơ phòng chuẩn hóa)
        ├── SurveyFinding (Sàng lọc nguy cơ ban đầu)
        └── RoomImage (Ảnh phòng, VisionAnalysis, ObjectDetection, VisionRoomFact)
```

---

## 1. Sơ Đồ Chuyển Tiếp Dữ Liệu Xuyên Suốt (End-to-End Data Pipeline)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người Dùng / Chuyên Viên
    participant Workflow as /workflow (7-Step Wizard)
    participant VisionAPI as /api/vision
    participant SyncAPI as /api/workflow/save-state
    participant RuleEng as Risk Intelligence (8 Rules)
    participant Scene3D as Digital Twin 3D (R3F Canvas)
    participant DB as SQLite (Prisma ORM)

    User->>Workflow: 1. Tạo Project & Khai Báo Người Cao Tuổi
    Workflow->>SyncAPI: Lưu Project & HomeSurvey ban đầu (CREATED)
    SyncAPI->>DB: Ghi bản ghi Project & HomeSurvey

    User->>Workflow: 2. Nhập Kích Thước & Checklist Nguy Cơ
    User->>Workflow: 3. Tải Ảnh Phòng & Chạy Thị Giác AI
    Workflow->>VisionAPI: Phân Tích Thực Thể (bed, rug, cable)
    VisionAPI-->>Workflow: Trả về Bounding Boxes & Confidence
    User->>Workflow: Xác nhận nhãn & Trả lời làm rõ (BED_007=NO)

    Workflow->>SyncAPI: 4. Chuyển đổi Profile thành 3D SceneDraft
    SyncAPI->>DB: Upsert Room & SceneObjects
    Workflow->>Scene3D: Dựng Không Gian 3D (Clustered Markers)

    Workflow->>RuleEng: 5. Kích Hoạt 8 Quy Tắc Nguy Cơ
    RuleEng-->>Workflow: Trả về HazardFindings & Điểm An Toàn Baseline (38/100)

    User->>Workflow: 6. Thực Hiện Quick-Fix (Dán thảm, Luồn dây, Lắp tay vịn)
    Workflow->>Scene3D: Cập nhật vị trí & Thêm vật thể an toàn
    Workflow->>RuleEng: Tái Thẩm Định Tức Thì (Reassessment)
    RuleEng-->>Workflow: Điểm An Toàn Mới (86/100) & Resolved Hazards

    User->>Workflow: 7. Xem Ma Trận Trước/Sau & Xuất Báo Cáo
    Workflow->>SyncAPI: Lưu Kịch Bản Can Thiệp & Snapshot
    SyncAPI->>DB: Ghi SimulationScenario & Assessment
    User->>Workflow: In Báo Cáo PDF / Tải File JSON
```

---

## 2. Các Hợp Đồng Dữ Liệu Chính (Key Data Contracts)

### 2.1 Trạng Thái Đối Tượng Không Gian 3D (`SceneObjectState`)
```typescript
export interface SceneObjectState {
  id: string;
  roomId: string;
  name: string;
  category: "FURNITURE" | "RUG" | "CABLE" | "LIGHTING" | "SAFETY_DEVICE" | "OBSTACLE";
  modelType: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  dimensions: { width: number; length: number; height: number };
  isWalkwayObstacle?: boolean;
  isFixed?: boolean;
  isLoose?: boolean;
  isSlippery?: boolean;
}
```

### 2.2 Kết Quả Đánh Giá Rủi Ro (`AssessmentResult`)
```typescript
export interface AssessmentResult {
  id: string;
  roomId: string;
  timestamp: string;
  totalHazards: number;
  resolvedHazards: number;
  remainingHazards: number;
  newHazards: number;
  safetyScore: number; // Thang đo heuristic nội bộ 0-100
  findings: HazardFindingResult[];
  notes?: string;
}
```

### 2.3 So Sánh Kịch Bản Trước/Sau (`ScenarioComparison`)
```typescript
export interface ScenarioComparison {
  baselineScenarioId: string;
  currentScenarioId: string;
  resolved: HazardFindingResult[];
  remaining: HazardFindingResult[];
  newlyIntroduced: HazardFindingResult[];
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
}
```
Mọi thông số so sánh đều được tính toán động dựa trên trạng thái thực tế của không gian 3D, đảm bảo không có bất kỳ con số hardcoded nào được sinh ra.

