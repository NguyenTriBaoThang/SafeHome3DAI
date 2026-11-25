import { z } from "zod";

/**
 * ==============================================================================
 * DEMO vs REAL DATA BOUNDARY & EXPORT GUARD (TASK A05)
 * ==============================================================================
 * Strictly isolates demonstration fixtures from real family clinical profiles
 * and research statistics. Browser-safe pure TypeScript module.
 * ==============================================================================
 */

export const DataPartitionSchema = z.enum(["REAL", "DEMO"]);
export type DataPartition = z.infer<typeof DataPartitionSchema>;

export const PersistenceStatusSchema = z.enum(["saved", "pending", "failed"]);
export type PersistenceStatus = z.infer<typeof PersistenceStatusSchema>;

export const DEMO_NAMESPACE_PREFIX = "demo-";

/**
 * Canonical registry of seeded/mocked demonstration IDs from mockRooms.ts & seed.js
 */
export const DEMO_ROOM_IDS = new Set<string>([
  "room-bedroom-01",
  "room-bathroom-01",
  "room-living-01",
  "room-accessible-suite-01",
  "room-photoreal-dollhouse-01",
  "room-dollhouse-01",
]);

export const DEMO_HOME_IDS = new Set<string>(["home-bac-nam"]);
export const DEMO_PROJECT_IDS = new Set<string>(["proj-safehome-vietnam"]);

export interface DemoBanner {
  isDemo: boolean;
  dataPartition: DataPartition;
  bannerCode: "DEMO_DATA_BANNER" | null;
  bannerText: string | null;
}

export class DemoDataExportBlockedError extends Error {
  public readonly code = "DEMO_EXPORT_BLOCKED";
  public readonly statusCode = 403;

  constructor(
    message: string = "Không thể xuất dữ liệu trình diễn (DEMO) như bằng chứng khảo sát thực địa."
  ) {
    super(message);
    this.name = "DemoDataExportBlockedError";
  }
}

/**
 * Classifies any room, assessment, project, home, or survey record as REAL or DEMO.
 */
export function classifyDataPartition(record: any): DataPartition {
  if (!record || typeof record !== "object") return "REAL";

  if (record.dataPartition === "DEMO" || record.isDemo === true) {
    return "DEMO";
  }

  const candidateIds = [
    record.id,
    record.roomId,
    record.homeId,
    record.projectId,
    record.surveyId,
    record.assessmentId,
  ].filter((v): v is string => typeof v === "string");

  for (const id of candidateIds) {
    if (
      id.startsWith(DEMO_NAMESPACE_PREFIX) ||
      DEMO_ROOM_IDS.has(id) ||
      DEMO_HOME_IDS.has(id) ||
      DEMO_PROJECT_IDS.has(id)
    ) {
      return "DEMO";
    }
  }

  if (record.home && classifyDataPartition(record.home) === "DEMO") {
    return "DEMO";
  }
  if (record.room && classifyDataPartition(record.room) === "DEMO") {
    return "DEMO";
  }

  return "REAL";
}

export function isDemoRecord(record: any): boolean {
  return classifyDataPartition(record) === "DEMO";
}

/**
 * Generates an explicit DEMO banner when data belongs to the DEMO partition.
 */
export function buildDemoBanner(record: any): DemoBanner {
  const partition = classifyDataPartition(record);
  if (partition === "DEMO") {
    return {
      isDemo: true,
      dataPartition: "DEMO",
      bannerCode: "DEMO_DATA_BANNER",
      bannerText:
        "DỮ LIỆU TRÌNH DIỄN (DEMO) — Chỉ dùng cho mục đích minh họa và đào tạo; không phải hồ sơ khảo sát thực địa hoặc bằng chứng y tế.",
    };
  }

  return {
    isDemo: false,
    dataPartition: "REAL",
    bannerCode: null,
    bannerText: null,
  };
}

/**
 * Filters out DEMO records so they never pollute real family profiles or research stats.
 */
export function excludeDemoFromRealQueries<T>(records: T[]): T[] {
  return records.filter((item) => classifyDataPartition(item) === "REAL");
}

/**
 * Guard preventing DEMO reports or surveys from being exported as verified field evidence.
 */
export function assertRealFieldEvidenceForReport(
  record: any,
  options?: { allowDemoPreview?: boolean }
): DemoBanner {
  const banner = buildDemoBanner(record);
  if (banner.isDemo && !options?.allowDemoPreview) {
    throw new DemoDataExportBlockedError(
      "Bị chặn bởi DemoBoundaryGuard: Dữ liệu thuộc phân vùng DEMO không được phép xuất thành báo cáo bằng chứng thực địa chính thức."
    );
  }
  return banner;
}

