# HỢP ĐỒNG DỮ LIỆU ĐẦU VÀO & ĐẦU RA (RISK DATA CONTRACT)
## SafeHome Risk Intelligence — Đặc Tả Giao Diện Lập Trình & Kiểu Dữ Liệu

### 1. Đầu Vào Chuẩn Hóa: `AssessmentInput`

Mọi luồng dữ liệu (từ khảo sát, mô hình 3D, hoặc API) đều được chuẩn hóa qua hàm `normalizeRoomAssessmentInput` về giao diện `AssessmentInput`:

```typescript
export interface AssessmentInput {
  roomId: string;
  roomName: string;
  roomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM" | "KITCHEN" | "HALLWAY";
  dimensions: {
    lengthM: number;
    widthM: number;
    heightM: number;
    source: "USER_MEASURED" | "USER_ESTIMATED" | "SYSTEM_DEFAULT";
  };
  floor: {
    material: string;             // "Gỗ", "Gạch men", "Vinyl"
    isWet: boolean;
    isSlipResistant: boolean;
    hasNonSlipMat?: boolean;
    levelDifferenceCm: number;    // Độ chênh cốt gờ cửa (cm)
    thresholdStepPresent: boolean;
    hasThresholdRamp?: boolean;
  };
  lighting: {
    daytimeLux: number;
    nighttimeLux: number;
    nightLightPresent: boolean;
    motionSensorPresent: boolean;
    pathLightToBathroom: boolean;
    switchReachableFromEntrance: boolean;
    switchReachableFromBed: boolean;
  };
  rugs: {
    present: boolean | null;
    items: Array<{
      id: string;
      name: string;
      location: string;
      isSecured: boolean;
      edgesCurled: boolean;
      inWalkway: boolean;
    }>;
  };
  cables: {
    crossingWalkway: boolean | null;
    items: Array<{
      id: string;
      name: string;
      location: string;
      crossesWalkway: boolean;
      hasCordCover: boolean;
      hasSkirtingTrunking: boolean;
    }>;
  };
  obstacles: {
    present: boolean | null;
    walkwayClearWidthM: number;
    items: Array<{
      id: string;
      name: string;
      location: string;
      obstructsWalkway: boolean;
      clearanceWidthM: number;
    }>;
  };
  grabBars: {
    present: boolean;
    count: number;
    toiletGrabBarPresent: boolean;
    showerGrabBarPresent: boolean;
    inspectedSecure: boolean;
  };
  accessibility: {
    lightSwitchReachableFromBed: boolean;
    essentialItemsReachableFromBed: boolean;
    emergencyCallReachable: boolean;
  };
  sourceType: "SURVEY_PROFILE" | "3D_SCENE" | "HYBRID";
}
```

---

### 2. Đầu Ra: Bản Chụp Thẩm Định Bất Biến (`AssessmentSnapshot`)

```typescript
export interface AssessmentSnapshot {
  id: string;                    // snapshot-room-xxx-timestamp
  roomId: string;
  roomName: string;
  roomType: string;
  snapshotType: "BASELINE" | "INTERVENTION" | "REASSESSMENT";
  createdAt: string;             // ISO 8601
  safetyScore: number;           // 0 - 100
  totalRulesEvaluated: number;   // 8
  detectedCount: number;
  needsVerificationCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  ruleEvaluations: RuleEvaluationResult[];
  findings: RiskFinding[];
  recommendations: RiskRecommendation[];
  input: AssessmentInput;
}
```

---

### 3. Kết Quả Đối Chiếu Trước / Sau (`BeforeAfterComparisonResult`)

```typescript
export interface BeforeAfterComparisonResult {
  id: string;
  beforeSnapshotId: string;
  afterSnapshotId: string;
  roomName: string;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;            // afterScore - beforeScore
  summary: {
    totalBeforeDetected: number;
    totalAfterDetected: number;
    highPriorityReduction: number;
    resolvedCount: number;
    newCount: number;
    persistentCount: number;
    changedPriorityCount: number;
    needsVerificationCount: number;
  };
  evaluationsComparison: Array<{
    ruleId: string;
    ruleName: string;
    beforeState: RuleEvaluationState;
    afterState: RuleEvaluationState;
    beforePriority: FindingPriority;
    afterPriority: FindingPriority;
    comparisonCategory: "NEW" | "PERSISTENT" | "RESOLVED_IN_MODEL" | "NEEDS_VERIFICATION" | "CHANGED_PRIORITY";
    explanation: string;
    findingTitle: string;
  }>;
  generatedAt: string;
}
```

