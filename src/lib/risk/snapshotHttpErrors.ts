import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/authorization";
import {
  CrossTenantAccessError,
  IdempotencyConflictError,
  PersistenceWriteError,
  ResourceNotFoundError,
} from "@/lib/persistence/reliablePersistence";
import { ConcurrencyConflictError, UnverifiedInputError } from "./snapshotManager";

/**
 * Maps snapshot persistence, concurrency, and authorization errors to consistent
 * HTTP responses with explicit persistenceStatus: "failed".
 */
export function snapshotErrorResponse(error: unknown, fallbackMessage: string) {
  if (
    error instanceof AuthorizationError ||
    error instanceof CrossTenantAccessError ||
    error instanceof ConcurrencyConflictError ||
    error instanceof IdempotencyConflictError ||
    error instanceof ResourceNotFoundError ||
    error instanceof UnverifiedInputError ||
    error instanceof PersistenceWriteError
  ) {
    return NextResponse.json(
      {
        success: false,
        persistenceStatus: "failed" as const,
        persisted: false,
        code: error.code,
        error: error.message,
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      success: false,
      persistenceStatus: "failed" as const,
      persisted: false,
      code: "SNAPSHOT_BAD_REQUEST",
      error: error instanceof Error ? error.message : fallbackMessage,
    },
    { status: 400 }
  );
}

