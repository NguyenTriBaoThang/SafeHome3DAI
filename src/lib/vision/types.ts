// =====================================================================
// SAFEHOME VISION INTELLIGENCE — DOMAIN TYPES & SCHEMAS
// =====================================================================

export type ViewpointType =
  | "ENTRANCE"          // Góc nhìn toàn cảnh từ cửa ra vào
  | "OPPOSITE_CORNER"   // Góc nhìn từ góc đối diện
  | "WALKWAY"           // Góc nhìn tập trung vào lối đi lại
  | "CLOSE_UP"          // Chụp cận cảnh vật thể nghi ngờ
  | "OTHER";            // Góc nhìn khác

export type DetectionCategory =
  | "bed"               // Giường ngủ
  | "chair"             // Ghế ngồi
  | "table"             // Bàn trà / bàn làm việc
  | "cabinet"           // Tủ quần áo / tủ đầu giường
  | "door"              // Cửa phòng / cửa WC
  | "toilet"            // Bồn cầu
  | "sink"              // Bồn rửa mặt / lavabo
  | "bathtub"           // Bồn tắm / khu sen tắm
  | "sofa"              // Ghế sofa
  | "rug"               // Thảm trải sàn
  | "electrical_cable"  // Dây điện / cáp thiết bị
  | "grab_bar"          // Thanh tay vịn an toàn
  | "obstacle_route"    // Vật cản chắn lối đi
  | "threshold_step"    // Gờ bậc cửa chênh lệch cao độ
  | "nightstand"        // Tủ tab đầu giường
  | "other";            // Vật thể khác

export type DetectionSource =
  | "OBJECT_DETECTOR"       // Mô hình nhận diện vật thể (CNN/YOLO)
  | "VISION_LANGUAGE_MODEL" // Mô hình ngôn ngữ thị giác đa phương thức (Gemini VLM - REAL_AI_INFERENCE)
  | "MANUAL_ANNOTATION"    // Người dùng tự vẽ gắn nhãn thủ công (MANUAL_REVIEW)
  | "MOCK_DEMO"             // Dữ liệu mẫu minh họa / Fallback khi không có API (MOCK_DEMO)
  | "HEURISTIC";            // Suy luận quy tắc hình học không gian (HEURISTIC)

export type VerificationStatus =
  | "PENDING_REVIEW"   // Chờ người dùng xác nhận
  | "CONFIRMED"        // Người dùng xác nhận đúng
  | "CORRECTED"        // Người dùng đã sửa lại nhãn
  | "REJECTED";        // Người dùng từ chối / loại bỏ

export type ObservationType =
  | "OBSTACLE_CANDIDATE"      // Vật cản tiềm ẩn trên luồng di chuyển
  | "RUG_OBSERVED"            // Phát hiện thảm trải sàn gần giường/lối đi
  | "CABLE_OBSERVED"          // Dây điện có thể vắt ngang đường đi
  | "GRAB_BAR_UNCERTAIN"      // Chưa rõ có tay vịn chịu lực hay không
  | "WET_SURFACE_UNCERTAIN"   // Bề mặt sàn có dấu hiệu ẩm ướt trơn trượt
  | "LEVEL_TRANSITION"        // Gờ bậc cửa giật cấp có thể gây vấp
  | "STORAGE_OUT_OF_REACH";   // Vật dụng thiết yếu có thể ngoài tầm với

export type UncertaintyType =
  | "SPATIAL_UNCERTAINTY"     // Chưa rõ khoảng cách thực tế (pixel không đo được mét)
  | "CONDITION_UNCERTAINTY"   // Không thể suy luận điều kiện vô hình (độ ma sát, ban đêm)
  | "OCCLUSION"               // Vật thể bị che khuất một phần
  | "UNVERIFIED_MEASUREMENT"; // Cần kiểm tra đo đạc thực tế

export interface NormalizedBoundingBox {
  xMin: number; // 0..1
  yMin: number; // 0..1
  xMax: number; // 0..1
  yMax: number; // 0..1
}

export interface VisionDetection {
  id: string;
  analysisId: string;
  imageId: string;
  category: DetectionCategory;
  originalLabel: string;
  /** More specific 3D asset for visually distinct items in the same risk category. */
  sceneModelType?: string;
  placementWall?: "left" | "back" | "right" | "free";
  userLabel?: string;
  confidence: number; // 0..1
  bbox: NormalizedBoundingBox;
  source: DetectionSource;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VisionObservation {
  id: string;
  analysisId: string;
  observationType: ObservationType;
  description: string;
  relatedDetectionIds: string[];
  evidenceJson?: Record<string, any>;
  uncertaintyType: UncertaintyType;
  requiresConfirmation: boolean;
  verificationStatus: VerificationStatus;
  surveyQuestionId?: string; // e.g. "BED_006", "BED_008", "BATH_005"
}

export interface VisionClarificationOption {
  value: string;
  label: string;
  isRiskTrigger?: boolean;
}

export interface VisionClarificationQuestion {
  id: string;
  roomId: string;
  observationId?: string;
  surveyQuestionId: string; // Map to Guided Survey question ID
  questionText: string;
  helpText?: string;
  options: VisionClarificationOption[];
  status: "PENDING" | "ANSWERED" | "DISMISSED";
  userResponse?: string;
  createdAt: string;
}

export interface VisionRoomFact {
  fieldPath: string; // e.g. "rugs.present", "rugs.secured", "cables.crossingWalkway"
  proposedValue: any;
  confirmedValue?: any;
  source: "AI_VISION_SUGGESTED" | "USER_CONFIRMED_VISION" | "USER_CORRECTED";
  verificationStatus: VerificationStatus;
  evidenceReference: string;
  updatedAt: string;
}

export interface ProcessedRoomImage {
  id: string;
  roomId: string;
  storageKey: string;
  fileUrl: string;
  imageWidth: number;
  imageHeight: number;
  viewpoint: ViewpointType;
  caption?: string;
  uploadedBy: string;
  createdAt: string;
}

export interface VisionAnalysisResult {
  id: string;
  roomId: string;
  imageId: string;
  modelId: string;
  modelVersion: string;
  analysisStatus: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  detections: VisionDetection[];
  observations: VisionObservation[];
  clarifications: VisionClarificationQuestion[];
  startedAt: string;
  completedAt?: string;
}

export interface SceneDraftFromVision {
  roomId: string;
  roomType: string;
  detectedObjects: Array<{
    id: string;
    category: DetectionCategory;
    name: string;
    estimatedPosition: [number, number, number];
    isEstimate: boolean;
    sourceImageId: string;
  }>;
  unresolvedObservations: string[];
  dimensionsEstimated: {
    lengthM: number;
    widthM: number;
    heightM: number;
    isEstimate: boolean;
  };
  generatedAt: string;
}

