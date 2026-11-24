import { ExpertReviewStatus } from "./clinicalReviewTypes";

/**
 * ==============================================================================
 * VERSIONED RISK THRESHOLD CONFIGURATION SYSTEM (TASK A04)
 * ==============================================================================
 * Centralizes all numerical thresholds across environmental fall hazard rules.
 * Enforces unit validation, versioning, clinical citation sources, and changelog
 * rationale tracking.
 * ==============================================================================
 */

export interface ThresholdItem<T = number> {
  value: T;
  unit: "m" | "cm" | "mm" | "lux" | "ratio" | "count" | "kg" | "ptv";
  status: ExpertReviewStatus;
  clinicalSource: string;
  descriptionVn: string;
}

export interface RiskThresholdConfig {
  configVersion: string;
  effectiveDate: string;
  changelogRationale: string;
  thresholds: {
    // RISK-001: Rug
    rugMinDCOF: ThresholdItem<number>;
    rugMaxCurledEdgeMm: ThresholdItem<number>;

    // RISK-002: Cable
    cableMaxAllowedAcrossWalkway: ThresholdItem<number>;

    // RISK-003: Walkway Clearance
    walkwayClearWidthMinM: ThresholdItem<number>;
    walkwayClearWidthCriticalM: ThresholdItem<number>;

    // RISK-004: Night Lighting
    nighttimeLuxMinBedroom: ThresholdItem<number>;
    nighttimeLuxMinOtherRooms: ThresholdItem<number>;
    nighttimeLuxCriticalLow: ThresholdItem<number>;

    // RISK-005: Bathroom Slip Resistance
    floorSlipMinPTVWet: ThresholdItem<number>;
    floorSlipMinDCOF: ThresholdItem<number>;

    // RISK-006: Grab Bars
    grabBarMinBathroomCount: ThresholdItem<number>;
    grabBarMinLoadCapacityKg: ThresholdItem<number>;
    grabBarHeightMinCm: ThresholdItem<number>;
    grabBarHeightMaxCm: ThresholdItem<number>;

    // RISK-007: Threshold Step & Bed Heights
    thresholdStepMaxCm: ThresholdItem<number>;
    thresholdStepCriticalCm: ThresholdItem<number>;
    bedSurfaceHeightMinCm: ThresholdItem<number>;
    bedSurfaceHeightMaxCm: ThresholdItem<number>;

    // RISK-008: Bedside Reach
    bedsideReachMaxCm: ThresholdItem<number>;
  };
  penaltyWeights: {
    highHazardPenalty: number;
    mediumHazardPenalty: number;
    lowHazardPenalty: number;
    needsVerificationPenalty: number;
    baseScore: number;
    minScoreFloor: number;
  };
}

/**
 * Active Production Configuration (Version 2026.1)
 */
export const THRESHOLD_CONFIG_V2026_1: RiskThresholdConfig = {
  configVersion: "2026.1",
  effectiveDate: "2026-11-24",
  changelogRationale:
    "Task A04 Baseline: Chuẩn hóa ngưỡng theo CDC STEADI 2019, WHO 2021, IES RP-28, AGS/BGS và ADA Standards. Tách riêng chiều cao mặt nệm ngồi 45-55cm theo Task A02.",
  thresholds: {
    rugMinDCOF: {
      value: 0.42,
      unit: "ratio",
      status: "REFERENCE_ONLY",
      clinicalSource: "ANSI A137.1 / ANSI A326.3; CDC STEADI",
      descriptionVn: "Hệ số ma sát động tối thiểu của đế thảm chống trượt",
    },
    rugMaxCurledEdgeMm: {
      value: 6.0,
      unit: "mm",
      status: "REFERENCE_ONLY",
      clinicalSource: "CDC STEADI (2019)",
      descriptionVn: "Độ cong vênh tối đa cho phép của mép viền thảm trước khi gây nguy cơ vấp ngã",
    },
    cableMaxAllowedAcrossWalkway: {
      value: 0,
      unit: "count",
      status: "REFERENCE_ONLY",
      clinicalSource: "CDC STEADI; Hướng dẫn Bộ Y tế VN (2020)",
      descriptionVn: "Số lượng dây điện trần cho phép cắt ngang lối đi thông thủy",
    },
    walkwayClearWidthMinM: {
      value: 0.85,
      unit: "m",
      status: "REFERENCE_ONLY",
      clinicalSource: "ADA Standards for Accessible Design 403.5.1; QCVN 10:2014/BXD",
      descriptionVn: "Bề rộng thông thủy lối đi tối thiểu cho người dùng gậy hoặc khung tập đi",
    },
    walkwayClearWidthCriticalM: {
      value: 0.70,
      unit: "m",
      status: "REFERENCE_ONLY",
      clinicalSource: "ADA Standards 403.5.1",
      descriptionVn: "Ngưỡng thông thủy thắt hẹp nghiêm trọng kích hoạt cảnh báo nguy cơ Cao",
    },
    nighttimeLuxMinBedroom: {
      value: 50,
      unit: "lux",
      status: "REFERENCE_ONLY",
      clinicalSource: "IES RP-28-20 Lighting for Older Adults; WHO (2021)",
      descriptionVn: "Độ rọi chiếu sáng tối thiểu trên lối đi phòng ngủ vào ban đêm",
    },
    nighttimeLuxMinOtherRooms: {
      value: 100,
      unit: "lux",
      status: "REFERENCE_ONLY",
      clinicalSource: "IES RP-28-20; WHO (2021)",
      descriptionVn: "Độ rọi chiếu sáng tối thiểu tại phòng tắm và hành lang ban đêm",
    },
    nighttimeLuxCriticalLow: {
      value: 40,
      unit: "lux",
      status: "REFERENCE_ONLY",
      clinicalSource: "IES RP-28-20",
      descriptionVn: "Mức độ rọi quá tối dưới ngưỡng nhận biết chướng ngại vật ở mắt lão hóa",
    },
    floorSlipMinPTVWet: {
      value: 36,
      unit: "ptv",
      status: "REFERENCE_ONLY",
      clinicalSource: "BS 7976-2 (Pendulum Test Value >= 36 wet: Low Slip Potential)",
      descriptionVn: "Chỉ số con lắc thử nghiệm trơn trượt tối thiểu trên bề mặt ướt",
    },
    floorSlipMinDCOF: {
      value: 0.42,
      unit: "ratio",
      status: "REFERENCE_ONLY",
      clinicalSource: "ANSI A137.1 / A326.3 Wet DCOF",
      descriptionVn: "Hệ số ma sát động tối thiểu của gạch sàn nhà tắm khi ướt",
    },
    grabBarMinBathroomCount: {
      value: 2,
      unit: "count",
      status: "REFERENCE_ONLY",
      clinicalSource: "WHO (2021) Fall Prevention Guidelines; ADA 609",
      descriptionVn: "Số lượng thanh tay vịn tối thiểu trong phòng tắm (1 cạnh bồn cầu và 1 trong buồng tắm)",
    },
    grabBarMinLoadCapacityKg: {
      value: 110,
      unit: "kg",
      status: "REFERENCE_ONLY",
      clinicalSource: "ADA Section 609.8 (Chịu lực tối thiểu 250 lbs ~ 113.4 kg)",
      descriptionVn: "Tải trọng chịu lực tĩnh tối thiểu của thanh tay vịn bắt vít vào tường",
    },
    grabBarHeightMinCm: {
      value: 75,
      unit: "cm",
      status: "REFERENCE_ONLY",
      clinicalSource: "ADA Section 609.4; Bộ Y tế VN",
      descriptionVn: "Chiều cao lắp thanh tay vịn tối thiểu so với mặt sàn hoàn thiện",
    },
    grabBarHeightMaxCm: {
      value: 85,
      unit: "cm",
      status: "REFERENCE_ONLY",
      clinicalSource: "ADA Section 609.4; Bộ Y tế VN",
      descriptionVn: "Chiều cao lắp thanh tay vịn tối đa so với mặt sàn hoàn thiện",
    },
    thresholdStepMaxCm: {
      value: 1.5,
      unit: "cm",
      status: "REFERENCE_ONLY",
      clinicalSource: "ADA Standards 303.2 (Beveled threshold <= 1/2 inch ~ 13-15mm); CDC STEADI",
      descriptionVn: "Độ chênh cao gờ bậc cửa tối đa cho phép trước khi bắt buộc phải có gờ vát dốc",
    },
    thresholdStepCriticalCm: {
      value: 3.5,
      unit: "cm",
      status: "REFERENCE_ONLY",
      clinicalSource: "CDC STEADI Environmental Hazards",
      descriptionVn: "Độ cao bậc thềm nguy hiểm cao kích hoạt cảnh báo nguy cơ Cao",
    },
    bedSurfaceHeightMinCm: {
      value: 45,
      unit: "cm",
      status: "REFERENCE_ONLY",
      clinicalSource: "AGS/BGS Clinical Practice Guideline (2020); CDC STEADI",
      descriptionVn: "Chiều cao mặt nệm ngồi an toàn tối thiểu (bàn chân chạm đất, gối góc 90 độ)",
    },
    bedSurfaceHeightMaxCm: {
      value: 55,
      unit: "cm",
      status: "REFERENCE_ONLY",
      clinicalSource: "AGS/BGS Clinical Practice Guideline (2020); CDC STEADI",
      descriptionVn: "Chiều cao mặt nệm ngồi an toàn tối đa (ngăn ngừa trượt rơi khi bước xuống giường)",
    },
    bedsideReachMaxCm: {
      value: 60,
      unit: "cm",
      status: "PROPOSED_INTERNAL",
      clinicalSource: "CDC STEADI Home Safety Modifications (Đề xuất nội bộ)",
      descriptionVn: "Khoảng cách tối đa từ tư thế nằm/ngồi trên giường đến công tắc đèn và điện thoại",
    },
  },
  penaltyWeights: {
    highHazardPenalty: 15,
    mediumHazardPenalty: 8,
    lowHazardPenalty: 4,
    needsVerificationPenalty: 3,
    baseScore: 100,
    minScoreFloor: 10,
  },
};

/**
 * Registry of Threshold Configurations across versions.
 */
export const THRESHOLD_CONFIG_REGISTRY: Record<string, RiskThresholdConfig> = {
  "2026.1": THRESHOLD_CONFIG_V2026_1,
};

/**
 * Retrieves active or specified threshold configuration.
 */
export function getRiskThresholdConfig(version: string = "2026.1"): RiskThresholdConfig {
  return THRESHOLD_CONFIG_REGISTRY[version] || THRESHOLD_CONFIG_V2026_1;
}

/**
 * Unit conversion & validation guards
 */
export function cmToM(cm: number): number {
  return cm / 100;
}

export function mToCm(m: number): number {
  return m * 100;
}

export function assertValidUnit(actualUnit: string, expectedUnit: string, fieldName: string) {
  if (actualUnit !== expectedUnit) {
    throw new Error(
      `Lỗi đơn vị đo tại trường "${fieldName}": Yêu cầu đơn vị "${expectedUnit}" nhưng nhận được "${actualUnit}".`
    );
  }
}

/**
 * Explainable Environmental Barrier Compliance Score calculation.
 */
export interface ScoreBreakdown {
  highHazardCount: number;
  mediumHazardCount: number;
  lowHazardCount: number;
  needsVerificationCount: number;
}

export interface ScoreCalculationResult {
  score: number;
  breakdown: {
    baseScore: number;
    highPenaltyTotal: number;
    mediumPenaltyTotal: number;
    lowPenaltyTotal: number;
    unverifiedPenaltyTotal: number;
  };
  formulaText: string;
  transparencyNotice: string;
}

export function calculateEnvironmentalBarrierScore(
  breakdown: ScoreBreakdown,
  config: RiskThresholdConfig = THRESHOLD_CONFIG_V2026_1
): ScoreCalculationResult {
  const { penaltyWeights } = config;
  const highPenaltyTotal = breakdown.highHazardCount * penaltyWeights.highHazardPenalty;
  const mediumPenaltyTotal = breakdown.mediumHazardCount * penaltyWeights.mediumHazardPenalty;
  const lowPenaltyTotal = breakdown.lowHazardCount * penaltyWeights.lowHazardPenalty;
  const unverifiedPenaltyTotal = breakdown.needsVerificationCount * penaltyWeights.needsVerificationPenalty;

  const rawScore =
    penaltyWeights.baseScore -
    highPenaltyTotal -
    mediumPenaltyTotal -
    lowPenaltyTotal -
    unverifiedPenaltyTotal;

  const score = Math.max(penaltyWeights.minScoreFloor, Math.min(penaltyWeights.baseScore, Math.round(rawScore)));

  const formulaText = `Score = 100 - (${breakdown.highHazardCount} × 15) - (${breakdown.mediumHazardCount} × 8) - (${breakdown.lowHazardCount} × 4) - (${breakdown.needsVerificationCount} × 3) = ${score}/100`;

  const transparencyNotice =
    "Điểm số là 'Chỉ số tuân thủ rào cản môi trường vật lý' (0-100) theo hướng dẫn CDC STEADI & WHO 2021. Điểm số KHÔNG cấu thành chẩn đoán y khoa, KHÔNG dự báo xác suất té ngã cá thể và KHÔNG khẳng định giảm tỷ lệ tai nạn ngoài đời thực.";

  return {
    score,
    breakdown: {
      baseScore: penaltyWeights.baseScore,
      highPenaltyTotal,
      mediumPenaltyTotal,
      lowPenaltyTotal,
      unverifiedPenaltyTotal,
    },
    formulaText,
    transparencyNotice,
  };
}

