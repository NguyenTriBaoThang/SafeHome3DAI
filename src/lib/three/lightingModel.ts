import type { MeasurementSourceType } from "@/lib/contracts/sharedContractV1";
import { getRoomDimensionProvenance, isMeasurementSource, SOURCE_LABEL_VI } from "@/lib/reconstruction/sceneProvenance";
import type { RoomState } from "@/types";

export type QualityPreset = "LOW" | "MEDIUM" | "HIGH";
export type SimulatedLightingPreset = "MORNING" | "AFTERNOON" | "DAYLIGHT" | "EVENING" | "NIGHT" | "STUDIO";

export interface QualityPresetConfig {
  id: QualityPreset;
  labelVi: string;
  shortLabelVi: string;
  dpr: number | [number, number];
  shadows: boolean;
  shadowMapSize: number;
  antialias: boolean;
  useEnvironment: boolean;
  useContactShadows: boolean;
}

export const QUALITY_PRESET_CONFIG: Record<QualityPreset, QualityPresetConfig> = {
  LOW: {
    id: "LOW",
    labelVi: "Nhẹ (Máy phổ thông / Mobile yếu)",
    shortLabelVi: "Nhẹ",
    dpr: 1,
    shadows: false,
    shadowMapSize: 512,
    antialias: false,
    useEnvironment: false,
    useContactShadows: false,
  },
  MEDIUM: {
    id: "MEDIUM",
    labelVi: "Vừa (Cân bằng FPS & đổ bóng)",
    shortLabelVi: "Vừa",
    dpr: [1, 1.35],
    shadows: true,
    shadowMapSize: 768,
    antialias: true,
    useEnvironment: false,
    useContactShadows: false,
  },
  HIGH: {
    id: "HIGH",
    labelVi: "Cao (PBR + Contact Shadow)",
    shortLabelVi: "Cao",
    dpr: [1, 1.75],
    shadows: true,
    shadowMapSize: 1024,
    antialias: true,
    useEnvironment: true,
    useContactShadows: true,
  },
};

export interface SimulatedLightingConfig {
  preset: SimulatedLightingPreset;
  labelVi: string;
  /** Render-only visual intensity multiplier for Three.js lights (NOT physical lux). */
  sceneLightingIntensitySimulated: number;
  toneMappingExposure: number;
  ambientIntensity: number;
  directionalIntensity: number;
  disclaimerVi: string;
}

const SIMULATED_DISCLAIMER = "Ánh sáng hiển thị 3D mô phỏng; không phải số đo lux thật.";

export const SIMULATED_LIGHTING_CONFIG: Record<SimulatedLightingPreset, SimulatedLightingConfig> = {
  MORNING: {
    preset: "MORNING",
    labelVi: "Nắng sớm (mô phỏng 3D)",
    sceneLightingIntensitySimulated: 1.05,
    toneMappingExposure: 1.05,
    ambientIntensity: 0.65,
    directionalIntensity: 1.85,
    disclaimerVi: SIMULATED_DISCLAIMER,
  },
  AFTERNOON: {
    preset: "AFTERNOON",
    labelVi: "Ban ngày (mô phỏng 3D)",
    sceneLightingIntensitySimulated: 1.0,
    toneMappingExposure: 1.04,
    ambientIntensity: 0.75,
    directionalIntensity: 1.6,
    disclaimerVi: SIMULATED_DISCLAIMER,
  },
  DAYLIGHT: {
    preset: "DAYLIGHT",
    labelVi: "Ban ngày (mô phỏng 3D)",
    sceneLightingIntensitySimulated: 1.0,
    toneMappingExposure: 1.04,
    ambientIntensity: 0.75,
    directionalIntensity: 1.6,
    disclaimerVi: SIMULATED_DISCLAIMER,
  },
  EVENING: {
    preset: "EVENING",
    labelVi: "Chiều tối (mô phỏng 3D)",
    sceneLightingIntensitySimulated: 0.85,
    toneMappingExposure: 0.98,
    ambientIntensity: 0.5,
    directionalIntensity: 1.15,
    disclaimerVi: SIMULATED_DISCLAIMER,
  },
  NIGHT: {
    preset: "NIGHT",
    labelVi: "Ban đêm (mô phỏng 3D)",
    sceneLightingIntensitySimulated: 0.35,
    toneMappingExposure: 0.9,
    ambientIntensity: 0.14,
    directionalIntensity: 0.28,
    disclaimerVi: SIMULATED_DISCLAIMER,
  },
  STUDIO: {
    preset: "STUDIO",
    labelVi: "Studio (mô phỏng 3D)",
    sceneLightingIntensitySimulated: 1.0,
    toneMappingExposure: 1.02,
    ambientIntensity: 0.8,
    directionalIntensity: 1.2,
    disclaimerVi: SIMULATED_DISCLAIMER,
  },
};

export function getSimulatedLightingConfig(
  preset: SimulatedLightingPreset,
  isNightMode?: boolean
): SimulatedLightingConfig {
  if (isNightMode) return SIMULATED_LIGHTING_CONFIG.NIGHT;
  return SIMULATED_LIGHTING_CONFIG[preset] ?? SIMULATED_LIGHTING_CONFIG.MORNING;
}

export interface IlluminanceDisplayState {
  /** Only non-null when recorded from an instrument measurement or explicit user/caregiver confirmation. */
  actualIlluminanceLux: number | null;
  sourceType: MeasurementSourceType;
  statusLabelVi: string;
  badgeTone: "measured" | "estimated" | "unmeasured";
}

/**
 * Separates rendered Three.js visual presets from verified physical illuminance.
 * Changing visual lighting presets must never produce an `actualIlluminanceLux` or claim "lux đo thật".
 */
export function resolveIlluminanceDisplay(
  room: Pick<RoomState, "lightingLevel" | "lightingProvenance" | "evidenceStatus">
): IlluminanceDisplayState {
  const source: MeasurementSourceType =
    room.lightingProvenance ?? (room.evidenceStatus === "PHOTO_DRAFT" ? "unknown" : "simulated");
  const hasNumeric = typeof room.lightingLevel === "number" && Number.isFinite(room.lightingLevel) && room.lightingLevel >= 0;

  if (source === "measured" && hasNumeric) {
    return {
      actualIlluminanceLux: room.lightingLevel,
      sourceType: "measured",
      statusLabelVi: `Lux đo bằng thiết bị: ${Math.round(room.lightingLevel)} lux`,
      badgeTone: "measured",
    };
  }

  if (source === "user_confirmed" && hasNumeric) {
    return {
      actualIlluminanceLux: room.lightingLevel,
      sourceType: "user_confirmed",
      statusLabelVi: `Lux người dùng xác nhận: ${Math.round(room.lightingLevel)} lux`,
      badgeTone: "measured",
    };
  }

  if (source === "vision_estimated" && hasNumeric) {
    return {
      actualIlluminanceLux: null,
      sourceType: "vision_estimated",
      statusLabelVi: `Chưa đo lux (ước lượng tham khảo ~${Math.round(room.lightingLevel)} lux)`,
      badgeTone: "estimated",
    };
  }

  return {
    actualIlluminanceLux: null,
    sourceType: source,
    statusLabelVi:
      source === "simulated" && hasNumeric
        ? `Chưa đo (giá trị phòng mẫu ~${Math.round(room.lightingLevel)} lux)`
        : "Chưa đo bằng lux kế / chưa xác nhận",
    badgeTone: "unmeasured",
  };
}

export interface RoomDimensionsDisplay {
  text: string;
  sourceType: MeasurementSourceType;
  sourceLabelVi: string;
}

export function describeRoomDimensionsWithProvenance(room: Pick<RoomState, "dimensions" | "dimensionProvenance">): RoomDimensionsDisplay {
  const dims = getRoomDimensionProvenance(room);
  const allMeasured = [dims.width, dims.length, dims.height].every((s) => s === "measured");
  const allConfirmedOrMeasured = [dims.width, dims.length, dims.height].every(isMeasurementSource);
  const sourceType: MeasurementSourceType = allMeasured
    ? "measured"
    : allConfirmedOrMeasured
    ? "user_confirmed"
    : dims.width;

  return {
    text: `${room.dimensions.width.toFixed(1)}×${room.dimensions.length.toFixed(1)}×${room.dimensions.height.toFixed(1)} m`,
    sourceType,
    sourceLabelVi: SOURCE_LABEL_VI[sourceType],
  };
}

