import type { PrismaClient } from "@prisma/client";
export type DatabaseScope = { id: string; email: string; database: PrismaClient };
type State = typeof globalThis & { safehomeScopeReader?: () => DatabaseScope | undefined };
// Browser imports of the legacy assessment helper must never bundle Node APIs.
export function registerScopeReader(reader: () => DatabaseScope | undefined) { (globalThis as State).safehomeScopeReader = reader; }
export function currentDatabaseScope() { return (globalThis as State).safehomeScopeReader?.(); }
