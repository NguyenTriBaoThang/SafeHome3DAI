/**
 * ==============================================================================
 * ENVIRONMENT CONFIGURATION & PRODUCTION SAFETY GUARDS (TASK A05)
 * ==============================================================================
 * Enforces explicit dev/test/prod separation and prevents destructive database
 * operations (seed resets, mock fallbacks) from executing in production.
 * ==============================================================================
 */

export type RuntimeEnvironment = "development" | "test" | "production";

export class ProductionGuardError extends Error {
  public readonly code = "PRODUCTION_GUARD_VIOLATION";
  public readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = "ProductionGuardError";
  }
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const env = process.env.NODE_ENV;
  if (env === "production") return "production";
  if (env === "test") return "test";
  return "development";
}

export function isProductionEnv(): boolean {
  return getRuntimeEnvironment() === "production";
}

export function isTestEnv(): boolean {
  return getRuntimeEnvironment() === "test";
}

/**
 * Prevents running destructive seed / reset scripts against production databases.
 */
export function assertSafeForDestructiveSeed(operationName: string = "seed_reset"): void {
  if (isProductionEnv() && process.env.SAFEHOME_FORCE_DESTRUCTIVE_SEED !== "ALLOW_AT_OWN_RISK") {
    throw new ProductionGuardError(
      `Bị chặn bởi ProductionGuard: Không được phép chạy thao tác phá hủy dữ liệu "${operationName}" trên môi trường production.`
    );
  }
}

/**
 * Validates database configuration for the active environment.
 */
export function getEnvironmentConfig() {
  const environment = getRuntimeEnvironment();
  const databaseUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const allowDemoSeed = environment !== "production" || process.env.SAFEHOME_ALLOW_DEMO_SEED === "1";

  return {
    environment,
    databaseUrl,
    allowDemoSeed,
    isolatedTests: process.env.SAFEHOME_ISOLATED_TESTS === "1",
    appOrigin: process.env.SAFEHOME_APP_ORIGIN || "http://localhost:3000",
  };
}

