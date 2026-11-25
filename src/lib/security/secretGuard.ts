/**
 * ==============================================================================
 * SERVER-ONLY SECRET GUARD & PII/SECRET LOG REDACTION (TASK A07)
 * ==============================================================================
 * Ensures API keys never leak to client bundles, HTTP error responses, or logs.
 * Redacts base64 image blobs, API keys, emails, phone numbers, and addresses.
 * ==============================================================================
 */

export const SECRET_PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  {
    name: "GOOGLE_GEMINI_KEY",
    regex: /AIza[0-9A-Za-z_-]{20,60}/g,
    replacement: "[REDACTED_GOOGLE_API_KEY]",
  },
  {
    name: "OPENAI_OR_SECRET_KEY",
    regex: /\bsk-[a-zA-Z0-9_-]{16,80}\b/g,
    replacement: "[REDACTED_API_KEY]",
  },
  {
    name: "BEARER_TOKEN",
    regex: /Bearer\s+[A-Za-z0-9._-]{16,}/gi,
    replacement: "Bearer [REDACTED_TOKEN]",
  },
  {
    name: "DATA_URI_BASE64_IMAGE",
    regex: /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]{24,}/g,
    replacement: "[REDACTED_BASE64_IMAGE]",
  },
  {
    name: "RAW_BASE64_BLOB",
    regex: /\b[A-Za-z0-9+/]{128,}={0,2}\b/g,
    replacement: "[REDACTED_BASE64_PAYLOAD]",
  },
  {
    name: "EMAIL_PII",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    name: "VIETNAM_PHONE_PII",
    regex: /(?:\+84|0)(?:3|5|7|8|9)[0-9]{8}\b/g,
    replacement: "[REDACTED_PHONE]",
  },
];

/**
 * Prevents accessing sensitive API secrets from browser/client bundles.
 */
export function assertServerOnlySecretAccess(secretName: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`SecurityViolation: Không được phép đọc bí mật "${secretName}" từ môi trường client.`);
  }
  if (secretName.startsWith("NEXT_PUBLIC_")) {
    throw new Error(
      `SecurityViolation: Bí mật "${secretName}" không được mang tiền tố NEXT_PUBLIC_.`
    );
  }
}

export function getServerOnlySecret(envName: "GEMINI_API_KEY" | "OPENAI_API_KEY" | "SAFEHOME_MEDIA_SECRET"): string | undefined {
  assertServerOnlySecretAccess(envName);
  const val = process.env[envName];
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : undefined;
}

/**
 * Redacts API keys, session tokens, base64 image payloads, and PII from strings/errors.
 */
export function redactSecretsAndPII(input: unknown): string {
  let text: string;
  if (typeof input === "string") {
    text = input;
  } else if (input instanceof Error) {
    text = input.message || "Unknown error";
  } else {
    try {
      text = JSON.stringify(input) ?? "";
    } catch {
      text = String(input);
    }
  }

  // Redact explicit env secret values if set in current runtime
  for (const envKey of ["GEMINI_API_KEY", "OPENAI_API_KEY", "SAFEHOME_MEDIA_SECRET"]) {
    const val = process.env[envKey];
    if (val && val.length >= 8) {
      text = text.split(val).join(`[REDACTED_${envKey}]`);
    }
  }

  // Redact JSON address fields
  text = text.replace(
    /("(?:address|homeAddress|streetAddress)"\s*:\s*)"[^"]*"/gi,
    '$1"[REDACTED_ADDRESS]"'
  );

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern.regex, pattern.replacement);
  }

  return text;
}

/**
 * Scans source code text for accidental hardcoded secrets or exposed NEXT_PUBLIC keys.
 */
export function scanTextForPotentialSecrets(
  sourceText: string
): Array<{ rule: string; line: number; snippet: string }> {
  const findings: Array<{ rule: string; line: number; snippet: string }> = [];
  const lines = sourceText.split(/\r?\n/);

  lines.forEach((lineText, idx) => {
    if (/NEXT_PUBLIC_.*(?:KEY|SECRET|TOKEN|PASSWORD)/i.test(lineText)) {
      findings.push({
        rule: "EXPOSED_NEXT_PUBLIC_SECRET",
        line: idx + 1,
        snippet: lineText.trim().slice(0, 80),
      });
    }
    if (/AIza[0-9A-Za-z_-]{30,}/.test(lineText)) {
      findings.push({
        rule: "HARDCODED_GOOGLE_API_KEY",
        line: idx + 1,
        snippet: "[REDACTED_MATCH]",
      });
    }
    if (/\bsk-(?:proj-|live-)?[a-zA-Z0-9]{24,}\b/.test(lineText)) {
      findings.push({
        rule: "HARDCODED_OPENAI_KEY",
        line: idx + 1,
        snippet: "[REDACTED_MATCH]",
      });
    }
  });

  return findings;
}

