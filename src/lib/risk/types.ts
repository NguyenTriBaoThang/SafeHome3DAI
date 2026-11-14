import { z } from "zod";

// =====================================================================
// TYPED EVALUATION STATES & PRIORITIES
// =====================================================================

export type RuleEvaluationState =
  | "DETECTED"           // Nguy cơ được xác nhận kích hoạt
  | "NOT_DETECTED"       // Điều kiện an toàn được thỏa mãn
  | "NEEDS_VERIFICATION" // Thiếu dữ liệu, cần bổ sung khảo sát/kiểm tra thực địa
  | "NOT_APPLICABLE";    // Quy tắc không áp dụng cho phòng này (ví dụ: tay vịn nhà tắm cho phòng ngủ)

export type FindingPriority =
  | "HIGH"               // Cần ưu tiên kiểm tra
  | "MEDIUM"             // Nên xem xét cải thiện
  | "LOW"                // Theo dõi hoặc cải thiện khi phù hợp
  | "UNKNOWN";           // Cần bổ sung thông tin (tương ứng NEEDS_VERIFICATION)

export type ActionCategory =
  | "REMOVE_OBSTACLE"        // Loại bỏ chướng ngại vật
  | "SECURE_RUG"            // Cố định hoặc loại bỏ thảm
  | "REROUTE_CABLE"         // Đi lại dây điện gọn gàng
  | "IMPROVE_LIGHTING"      // Bổ sung đèn ngủ / tăng độ rọi
  | "INSTALL_GRAB_BAR"      // Lắp đặt thanh tay vịn chịu lực
  | "ADD_NON_SLIP_MAT"      // Trang bị thảm chống trượt có giác hút
  | "RAMP_OR_MARK_THRESHOLD" // Lắp gờ dốc cao su / dán decal phản quang
  | "REORGANIZE_STORAGE";   // Sắp xếp vật dụng thiết yếu trong tầm với

export type RecommendationDifficulty = "EASY_DIY" | "MODERATE" | "PROFESSIONAL_INSTALL";
export type RecommendationStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DISMISSED";

// =====================================================================
// NORMALIZED ASSESSMENT INPUT
// =====================================================================

export interface AssessmentRoomDimensions {
  lengthM: number;
  widthM: number;
  heightM: number;
  source: "USER_MEASURED" | "USER_ESTIMATED" | "SYSTEM_DEFAULT";
}

export interface AssessmentFloorData {
  material: string;             // "Gỗ", "Gạch men", "Vinyl", "Bê tông"
  isWet: boolean;               // Có thường xuyên bị ướt không
  isSlipResistant: boolean;     // Sàn có tính năng chống trơn trượt không
  hasNonSlipMat?: boolean;      // Có thảm cao su chống trượt giác hút không
  levelDifferenceCm: number;    // Độ chênh lệch cao độ gờ bậc cửa (cm)
  thresholdStepPresent: boolean;// Có gờ bậc cửa ngăn phòng không
  hasThresholdRamp?: boolean;   // Có gờ dốc vát mép hoặc sơn phản quang không
}

export interface AssessmentLightingData {
  daytimeLux: number;
  nighttimeLux: number;
  nightLightPresent: boolean;          // Có đèn ngủ dịu nhẹ không
  motionSensorPresent: boolean;        // Có cảm biến chuyển động tự bật sáng không
  pathLightToBathroom: boolean;        // Lối đi từ giường đến nhà vệ sinh có đủ sáng không
  switchReachableFromEntrance: boolean;// Công tắc gần cửa ra vào
  switchReachableFromBed: boolean;     // Công tắc với tới được từ trên giường
}

export interface AssessmentRugItem {
  id: string;
  name: string;
  location: string;             // "Cạnh giường", "Cửa ra vào", "Hành lang"
  isSecured: boolean;           // Có băng keo hoặc lót cao su chống xê dịch
  edgesCurled: boolean;         // Mép thảm có bị quăn/vểnh lên không
  inWalkway: boolean;           // Nằm trực tiếp trên luồng di chuyển chính
}

export interface AssessmentCableItem {
  id: string;
  name: string;
  location: string;
  crossesWalkway: boolean;      // Cắt ngang lối đi bộ
  hasCordCover: boolean;        // Có ghen cao su bảo vệ vát mép
  hasSkirtingTrunking: boolean; // Đi nẹp men theo chân tường
}

export interface AssessmentObstacleItem {
  id: string;
  name: string;
  location: string;
  obstructsWalkway: boolean;
  clearanceWidthM: number;      // Khoảng thông thủy còn lại (m)
}

export interface AssessmentGrabBarData {
  present: boolean;
  count: number;
  toiletGrabBarPresent: boolean;
  showerGrabBarPresent: boolean;
  inspectedSecure: boolean;     // Đã kiểm tra độ bám chắc chắn chưa
}

export interface AssessmentAccessibilityData {
  lightSwitchReachableFromBed: boolean;
  essentialItemsReachableFromBed: boolean; // Điện thoại, nước, kính
  emergencyCallReachable: boolean;
}

export interface AssessmentInput {
  roomId: string;
  roomName: string;
  roomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM" | "KITCHEN" | "HALLWAY";
  dimensions: AssessmentRoomDimensions;
  floor: AssessmentFloorData;
  lighting: AssessmentLightingData;
  rugs: {
    present: boolean | null;
    items: AssessmentRugItem[];
  };
  cables: {
    crossingWalkway: boolean | null;
    items: AssessmentCableItem[];
  };
  obstacles: {
    present: boolean | null;
    walkwayClearWidthM: number;
    items: AssessmentObstacleItem[];
  };
  grabBars: AssessmentGrabBarData;
  accessibility: AssessmentAccessibilityData;
  reportedConcerns?: string[];
  sourceType: "SURVEY_PROFILE" | "3D_SCENE" | "HYBRID";
}

// =====================================================================
// EVIDENCE & TRACEABILITY
// =====================================================================

export interface TraceabilityStep {
  stepIndex: number;
  stage:
  | "SURVEY_ANSWER"
  | "ROOM_PROFILE_FIELD"
  | "DETECTION_RULE"
  | "HAZARD_FINDING"
  | "PRIORITY_DECISION"
  | "EVIDENCE_SOURCE"
  | "RECOMMENDATION"
  | "REASSESSMENT";
  title: string;
  description: string;
  data: Record<string, any>;
}

export interface RuleEvidence {
  measuredValue: string;        // Giá trị đo đạc / ghi nhận
  threshold: string;            // Ngưỡng tiêu chuẩn an toàn
  rationale: string;            // Giải thích cơ chế nguy hại
  sourceFields: string[];       // Tên các trường dữ liệu đầu vào làm căn cứ
  missingFields?: string[];     // Các trường bị thiếu nếu ở trạng thái NEEDS_VERIFICATION
  affectedObjectId?: string;    // ID vật thể 3D liên kết (nếu có)
  affectedObjectName?: string;  // Tên vật thể 3D liên kết
  coordinates?: [number, number, number]; // Tọa độ không gian 3D [x, y, z]
}

// =====================================================================
// FINDINGS & RECOMMENDATIONS
// =====================================================================

export interface RiskFinding {
  id: string;
  ruleId: string;
  title: string;
  hazardType: string;
  description: string;
  severityCategory: FindingPriority;
  evidence: RuleEvidence;
  recommendationText: string;
  targetObjectId?: string;
  targetArea?: {
    min: [number, number, number];
    max: [number, number, number];
  };
  status: "ACTIVE" | "RESOLVED" | "NEEDS_VERIFICATION";
  referenceIds: string[];
  traceabilityTrail: TraceabilityStep[];
}

export interface RiskRecommendation {
  id: string;
  findingId: string;
  title: string;
  actionCategory: ActionCategory;
  priority: FindingPriority;
  practicalSteps: string[];
  estimatedCost: string;
  difficulty: RecommendationDifficulty;
  status: RecommendationStatus;
  referenceIds: string[];
}

// =====================================================================
// RULE EVALUATION RESULT
// =====================================================================

export interface RuleEvaluationResult {
  ruleId: string;               // e.g. "RISK-001"
  ruleName: string;             // e.g. "Thảm trải sàn không cố định mép"
  version: string;              // e.g. "1.0.0"
  state: RuleEvaluationState;
  priority: FindingPriority;
  priorityRationale: string;
  evidence: RuleEvidence;
  finding: RiskFinding | null;
  recommendation: RiskRecommendation | null;
  supportingSourceIds: string[];
}

// =====================================================================
// SNAPSHOTS & COMPARISON
// =====================================================================

export interface AssessmentSnapshot {
  id: string;
  roomId: string;
  roomName: string;
  roomType: string;
  snapshotType: "BASELINE" | "INTERVENTION" | "REASSESSMENT";
  createdAt: string;
  safetyScore: number;          // Điểm an toàn gợi ý (0-100)
  totalRulesEvaluated: number;
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

export type ComparisonCategory =
  | "NEW"                  // Mối nguy mới xuất hiện sau thay đổi
  | "PERSISTENT"           // Mối nguy vẫn tồn tại chưa khắc phục
  | "RESOLVED_IN_MODEL"    // Mối nguy đã được giải quyết thành công
  | "NEEDS_VERIFICATION"   // Cần kiểm tra thực địa lại
  | "CHANGED_PRIORITY";    // Mức độ ưu tiên thay đổi

export interface FindingComparisonItem {
  ruleId: string;
  ruleName: string;
  beforeState: RuleEvaluationState;
  afterState: RuleEvaluationState;
  beforePriority: FindingPriority;
  afterPriority: FindingPriority;
  comparisonCategory: ComparisonCategory;
  explanation: string;
  findingTitle: string;
}

export interface BeforeAfterComparisonResult {
  id: string;
  beforeSnapshotId: string;
  afterSnapshotId: string;
  roomName: string;
  beforeScore: number;
  afterScore: number;
  scoreDelta: number;
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
  evaluationsComparison: FindingComparisonItem[];
  generatedAt: string;
}

// =====================================================================
// REPORT STRUCTURE
// =====================================================================

export interface AssessmentReport {
  meta: {
    reportId: string;
    generatedAt: string;
    targetResident: string;
    roomName: string;
    roomType: string;
    engineVersion: string;
    disclaimer: string;
  };
  summary: {
    safetyScore: number;
    totalRulesEvaluated: number;
    detectedHazards: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    needsVerification: number;
  };
  findings: RiskFinding[];
  recommendations: RiskRecommendation[];
  ruleAudits: RuleEvaluationResult[];
  curatedSources: Array<{
    id: string;
    title: string;
    organization: string;
    year: string;
    url: string;
  }>;
}
