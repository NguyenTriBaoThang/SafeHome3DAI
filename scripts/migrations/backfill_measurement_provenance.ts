/**
 * SafeHome 3D AI — Measurement Provenance Backfill & Migration Script (Task A02)
 *
 * Scans legacy room state records and tags measurements without confirmed physical
 * audit trail as `isLegacyAssumed: true` and `sourceType: "simulated"`.
 * Guarantees that legacy or untyped data is NEVER falsely elevated to "measured".
 */

import {
  createLegacyAssumed,
  createUnknown,
  ProvenanceRecord,
} from "../../src/lib/provenance/measurementProvenance";

export interface MigrationResult {
  migratedRooms: number;
  migratedObjects: number;
  taggedLegacyAssumedCount: number;
  dryRun: boolean;
  timestamp: string;
}

export function migrateRoomStateToProvenance(
  legacyRoom: any,
  isDryRun: boolean = true
): { migrated: any; provenanceAudit: Record<string, ProvenanceRecord> } {
  const provenanceAudit: Record<string, ProvenanceRecord> = {};

  // 1. Lighting Level
  if (typeof legacyRoom.lightingLevel === "number") {
    provenanceAudit.lightingLevel = createLegacyAssumed(
      legacyRoom.lightingLevel,
      "lux",
      "legacy_mockRooms_constant"
    );
  } else {
    provenanceAudit.lightingLevel = createUnknown("lux", "Missing lighting measurement");
  }

  // 2. Dimensions
  if (legacyRoom.dimensions) {
    provenanceAudit.lengthM = createLegacyAssumed(
      legacyRoom.dimensions.length ?? 4.0,
      "m",
      "legacy_room_template"
    );
    provenanceAudit.widthM = createLegacyAssumed(
      legacyRoom.dimensions.width ?? 3.5,
      "m",
      "legacy_room_template"
    );
    provenanceAudit.heightM = createLegacyAssumed(
      legacyRoom.dimensions.height ?? 2.8,
      "m",
      "legacy_room_template"
    );
  }

  // 3. Walkway Clearance
  if (typeof legacyRoom.walkwayClearWidthM === "number") {
    provenanceAudit.walkwayClearWidthM = createLegacyAssumed(
      legacyRoom.walkwayClearWidthM,
      "m",
      "legacy_hardcoded_clearance"
    );
  } else {
    provenanceAudit.walkwayClearWidthM = createUnknown("m", "Unmeasured walkway clearance");
  }

  // 4. Floor Slip Resistance
  if (typeof legacyRoom.isSlipResistant === "boolean") {
    provenanceAudit.isSlipResistant = createLegacyAssumed(
      legacyRoom.isSlipResistant,
      "boolean",
      "legacy_unverified_flag"
    );
  } else {
    provenanceAudit.isSlipResistant = createUnknown("boolean", "Unverified slip resistance");
  }

  const migrated = {
    ...legacyRoom,
    provenanceAudit,
    hasLegacyAssumptions: Object.values(provenanceAudit).some((p) => p.isLegacyAssumed),
    migratedAt: new Date().toISOString(),
  };

  return { migrated, provenanceAudit };
}

