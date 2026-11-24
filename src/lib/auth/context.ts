import { AsyncLocalStorage } from "node:async_hooks";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { registerScopeReader } from "@/lib/database/scope";

export type AccountScope = { id: string; email: string; database: PrismaClient };
const scopeState = globalThis as typeof globalThis & { safehomeAccountScope?: AsyncLocalStorage<AccountScope> };
export const accountScope = scopeState.safehomeAccountScope ||= new AsyncLocalStorage<AccountScope>();
registerScopeReader(() => accountScope.getStore());
export const privateRoot = () => path.resolve(process.env.SAFEHOME_PRIVATE_DIR || ".private");
export function accountDirectory(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error("Invalid account directory");
  return path.join(privateRoot(), "families", id);
}
export function currentAccountId() { return accountScope.getStore()?.id; }
