import { redactSecretsAndPII } from "./secretGuard";

/**
 * ==============================================================================
 * RESILIENCE ENGINE: TIMEOUT, BOUNDED RETRY, CIRCUIT BREAKER & SAFE ERRORS (A07)
 * ==============================================================================
 */

export class ExternalServiceCircuitOpenError extends Error {
  public readonly code = "PROVIDER_CIRCUIT_OPEN";
  public readonly statusCode = 503;

  constructor(providerName: string) {
    super(`Dịch vụ AI (${providerName}) tạm thời ngắt mạch bảo vệ do lỗi liên tiếp. Vui lòng thử lại sau giây lát.`);
    this.name = "ExternalServiceCircuitOpenError";
  }
}

export class ExternalServiceTimeoutError extends Error {
  public readonly code = "PROVIDER_TIMEOUT";
  public readonly statusCode = 504;

  constructor(providerName: string, timeoutMs: number) {
    super(`Yêu cầu tới ${providerName} vượt quá giới hạn thời gian (${timeoutMs}ms).`);
    this.name = "ExternalServiceTimeoutError";
  }
}

export interface CircuitState {
  consecutiveFailures: number;
  openedAt: number | null;
}

const circuitStore = globalThis as typeof globalThis & {
  safehomeCircuits?: Map<string, CircuitState>;
};

function getCircuits(): Map<string, CircuitState> {
  return (circuitStore.safehomeCircuits ||= new Map<string, CircuitState>());
}

export function resetAllCircuitsForTest(): void {
  getCircuits().clear();
}

export function getCircuitState(providerName: string): CircuitState {
  const circuits = getCircuits();
  let state = circuits.get(providerName);
  if (!state) {
    state = { consecutiveFailures: 0, openedAt: null };
    circuits.set(providerName, state);
  }
  return state;
}

export function isTransientHttpOrNetworkError(error: any): boolean {
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  const msg = String(error?.message || "");
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("503") ||
    msg.includes("timeout") ||
    msg.includes("TimeoutError") ||
    error?.name === "TimeoutError"
  );
}

/**
 * Executes an external AI provider call protected by:
 * - Circuit breaker (fails fast after N consecutive transient failures)
 * - Strict timeout via Promise.race / AbortSignal
 * - Bounded retry (at most maxRetries attempts on transient 429/500/503 errors)
 */
export async function executeWithResilience<T>(
  providerName: string,
  operation: (signal: AbortSignal) => Promise<T>,
  options?: {
    timeoutMs?: number;
    maxRetries?: number;
    failureThreshold?: number;
    cooldownMs?: number;
    retryDelayMs?: number;
  }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const maxRetries = Math.max(0, Math.min(2, options?.maxRetries ?? 1));
  const failureThreshold = options?.failureThreshold ?? 3;
  const cooldownMs = options?.cooldownMs ?? 30000;
  const retryDelayMs = options?.retryDelayMs ?? 50;

  const state = getCircuitState(providerName);
  if (state.openedAt !== null) {
    const elapsed = Date.now() - state.openedAt;
    if (elapsed < cooldownMs) {
      throw new ExternalServiceCircuitOpenError(providerName);
    }
    // Half-open probe after cooldown
    state.openedAt = null;
    state.consecutiveFailures = Math.max(0, failureThreshold - 1);
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new ExternalServiceTimeoutError(providerName, timeoutMs)), timeoutMs);

    try {
      const result = await Promise.race([
        operation(controller.signal),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(new ExternalServiceTimeoutError(providerName, timeoutMs)),
            { once: true }
          );
        }),
      ]);
      // Reset circuit on success
      state.consecutiveFailures = 0;
      state.openedAt = null;
      return result;
    } catch (error: any) {
      lastError = error;
      const transient = isTransientHttpOrNetworkError(error);
      if (attempt < maxRetries && transient) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
        continue;
      }

      // Update circuit breaker failure count
      state.consecutiveFailures += 1;
      if (state.consecutiveFailures >= failureThreshold) {
        state.openedAt = Date.now();
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

/**
 * Formats a safe, PII-redacted, stack-free HTTP error payload.
 */
export function buildSafeErrorPayload(
  error: unknown,
  fallbackMessage: string,
  defaultCode = "INTERNAL_ERROR"
): { success: false; code: string; error: string } {
  const errObj = error as any;
  const code = typeof errObj?.code === "string" && /^[A-Z0-9_]+$/.test(errObj.code) ? errObj.code : defaultCode;
  const rawMessage = typeof errObj?.message === "string" ? errObj.message : fallbackMessage;
  const redacted = redactSecretsAndPII(rawMessage).slice(0, 300);

  return {
    success: false,
    code,
    error: redacted || fallbackMessage,
  };
}

