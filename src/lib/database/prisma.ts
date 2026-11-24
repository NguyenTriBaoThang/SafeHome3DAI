import { PrismaClient } from "@prisma/client";
import { currentDatabaseScope } from "./scope";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const legacyClient =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = legacyClient;

// Resolve at each operation, never at module import: simultaneous accounts cannot
// overwrite each other's selected database. Existing legacy data is not adopted.
export const prisma: PrismaClient = new Proxy(legacyClient, {
  get(_target, property) {
    const client = currentDatabaseScope()?.database;
    if (!client && process.env.NODE_ENV !== "test") throw new Error("Database access requires an account scope");
    const selected = client || legacyClient;
    const value = Reflect.get(selected, property);
    return typeof value === "function" ? value.bind(selected) : value;
  },
});

