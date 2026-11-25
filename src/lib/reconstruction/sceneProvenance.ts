import type { MeasurementSourceType } from "@/lib/contracts/sharedContractV1";
import { createMeasured, createSimulated, createUnknown, createUserConfirmed, createVisionEstimated, type ProvenanceRecord } from "@/lib/provenance/measurementProvenance";
import type { RoomState, SceneObjectProvenance, SceneObjectState } from "@/types";

/**
 * Provenance helpers for 3D scene elements. The enum is A02's `MeasurementSourceType`;
 * only `measured` / `user_confirmed` count as measurements (see CONTEXT.md).
 */
export const APPROX_ROOM_LABEL = "Mô hình phòng (mô phỏng gần đúng)";
export const CONFIRMED_ROOM_LABEL = "Mô hình phòng (số đo đã xác nhận)";

export const SOURCE_LABEL_VI: Record<MeasurementSourceType, string> = {
  measured: "Đã đo",
  user_confirmed: "Người dùng xác nhận",
  vision_estimated: "Ước lượng từ ảnh",
  simulated: "Mô phỏng / mẫu",
  unknown: "Chưa có số liệu",
};

export const isMeasurementSource = (s: MeasurementSourceType | undefined): boolean =>
  s === "measured" || s === "user_confirmed";

const ALL_SIMULATED: SceneObjectProvenance = { width: "simulated", length: "simulated", height: "simulated", position: "simulated" };

/** Missing provenance means template/default values, never a measurement. */
export const getObjectProvenance = (obj: Pick<SceneObjectState, "provenance">): SceneObjectProvenance =>
  obj.provenance ?? ALL_SIMULATED;

export const getRoomDimensionProvenance = (room: Pick<RoomState, "dimensionProvenance">) =>
  room.dimensionProvenance ?? { width: "simulated" as const, length: "simulated" as const, height: "simulated" as const };

/** True unless the room size AND every object's size/position are measured or user-confirmed. */
export function isApproximateRoomModel(room: RoomState): boolean {
  const dims = getRoomDimensionProvenance(room);
  if (![dims.width, dims.length, dims.height].every(isMeasurementSource)) return true;
  if (room.evidenceStatus === "PHOTO_DRAFT") return true;
  return room.objects.some((o) => {
    const p = getObjectProvenance(o);
    return ![p.width, p.length, p.height, p.position].every(isMeasurementSource);
  });
}

export const roomModelLabel = (room: RoomState) => (isApproximateRoomModel(room) ? APPROX_ROOM_LABEL : CONFIRMED_ROOM_LABEL);

/** `obj-<type>-<id>` (Shared Contract V1 §2.1). A source `det-…` id keeps its suffix so det <-> obj stays traceable. */
export function makeObjectId(modelType: string, sourceId: string): string {
  const type = modelType.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "item";
  const suffix = sourceId.replace(/^(det|obj)[-_]/, "");
  return `obj-${type}-${suffix}`;
}

/** The `det-*` id a scene object was built from, or null for template objects. */
export const detectionIdOf = (obj: Pick<SceneObjectState, "detectionId" | "customProperties">): string | null =>
  obj.detectionId ?? (obj.customProperties?.sourceDetectionId as string | undefined) ?? null;

// ---- Bed heights: mattress top (what the sit-to-stand rule needs) != total height incl. headboard ----

/** Mattress top of the procedural bed template sits at ~54.5% of its total height (ArchitecturalBed geometry). */
export const TEMPLATE_BED_SURFACE_RATIO = 0.545;

export interface BedHeights {
  /** Mattress top, cm. This is the value for the bed-height rule. */
  bedSurfaceHeightCm: number;
  surfaceSource: MeasurementSourceType;
  /** Whole bed incl. headboard, cm. Never used for the sit-height rule. */
  totalBedHeightCm: number;
  totalSource: MeasurementSourceType;
}

export function getBedHeights(bed: SceneObjectState): BedHeights {
  const p = getObjectProvenance(bed);
  const total = Math.round(bed.dimensions.height * 100);
  const explicit = bed.customProperties?.bedSurfaceHeightCm;
  const hasExplicit = typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0;
  return {
    bedSurfaceHeightCm: hasExplicit ? explicit : Math.round(total * TEMPLATE_BED_SURFACE_RATIO),
    surfaceSource: hasExplicit ? (p.bedSurfaceHeight ?? "user_confirmed") : "simulated",
    totalBedHeightCm: total,
    totalSource: p.height,
  };
}

/** Bed-height rule input: always the mattress surface, with its provenance. */
export function bedHeightRuleInput(bed: SceneObjectState): ProvenanceRecord<number> {
  const { bedSurfaceHeightCm: v, surfaceSource } = getBedHeights(bed);
  switch (surfaceSource) {
    case "measured": return createMeasured(v, "cm", "user_entered_instrument_value", undefined, undefined, bed.id);
    case "user_confirmed": return createUserConfirmed(v, "cm", "bed_surface_height", "user", bed.id);
    case "vision_estimated": return createVisionEstimated(v, "cm", bed.confidence ?? 0.4, "bbox_template_estimate", bed.id);
    case "unknown": return createUnknown<number>("cm", "bed_surface_height_missing");
    default: return createSimulated(v, "cm", bed.id, "template_bed_surface_ratio");
  }
}

// ---- Inspector rows ----

export interface InspectorRow { key: string; label: string; value: string; source: MeasurementSourceType }

export function describeObjectValues(obj: SceneObjectState): InspectorRow[] {
  const p = getObjectProvenance(obj);
  const m = (v: number) => `${v.toFixed(2)} m`;
  const rows: InspectorRow[] = [
    { key: "width", label: "Rộng", value: m(obj.dimensions.width), source: p.width },
    { key: "length", label: "Dài", value: m(obj.dimensions.length), source: p.length },
  ];
  if (obj.modelType === "bed") {
    const h = getBedHeights(obj);
    rows.push(
      { key: "bedSurfaceHeight", label: "Cao mặt nệm", value: `${h.bedSurfaceHeightCm} cm`, source: h.surfaceSource },
      { key: "totalBedHeight", label: "Tổng cao (cả đầu giường)", value: `${h.totalBedHeightCm} cm`, source: h.totalSource },
    );
  } else {
    rows.push({ key: "height", label: "Cao", value: m(obj.dimensions.height), source: p.height });
  }
  rows.push({
    key: "position",
    label: "Vị trí",
    value: `x ${obj.position[0].toFixed(2)}, y ${obj.position[1].toFixed(2)}, z ${obj.position[2].toFixed(2)} m`,
    source: p.position,
  });
  return rows;
}
