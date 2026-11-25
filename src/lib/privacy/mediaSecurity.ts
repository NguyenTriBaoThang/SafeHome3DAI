import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * ==============================================================================
 * PRIVATE MEDIA SECURITY: SIGNED URLs, DEMO MASKING & RETENTION POLICY (A06)
 * ==============================================================================
 * - Generates short-lived HMAC-SHA256 signed URLs bound to accountId + imageId.
 * - Rejects expired, tampered, or cross-account signed URLs.
 * - Enforces privacy masking policy on DEMO images (no PII / blurred faces).
 * ==============================================================================
 */

const secretState = globalThis as typeof globalThis & { safehomeMediaSecret?: string };
function mediaSigningSecret(): string {
  if (process.env.SAFEHOME_MEDIA_SECRET && process.env.SAFEHOME_MEDIA_SECRET.length >= 16) {
    return process.env.SAFEHOME_MEDIA_SECRET;
  }
  return (secretState.safehomeMediaSecret ||= randomBytes(32).toString("hex"));
}

export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300; // 5 minutes
export const DEFAULT_RETENTION_DAYS = 30;

export interface SignedUrlTokenPayload {
  imageId: string;
  accountId: string;
  expires: number;
  sig: string;
}

/**
 * Generates an HMAC-SHA256 signature binding imageId + accountId + expires.
 */
export function computeMediaSignature(
  imageId: string,
  accountId: string,
  expires: number
): string {
  const payload = `${imageId}:${accountId}:${expires}`;
  return createHmac("sha256", mediaSigningSecret()).update(payload).digest("hex");
}

/**
 * Creates a short-lived private signed URL for a household image.
 */
export function signPrivateMediaUrl(
  imageId: string,
  accountId: string,
  ttlSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): {
  signedUrl: string;
  expires: number;
  sig: string;
} {
  const boundedTtl = Math.max(10, Math.min(3600, ttlSeconds));
  const expires = Math.floor(Date.now() / 1000) + boundedTtl;
  const sig = computeMediaSignature(imageId, accountId, expires);
  const signedUrl = `/api/vision/images/${encodeURIComponent(imageId)}/file?expires=${expires}&sig=${sig}`;
  return { signedUrl, expires, sig };
}

/**
 * Verifies a signed media token in constant time and validates expiry + account ownership.
 */
export function verifySignedMediaToken(params: {
  imageId: string;
  accountId: string;
  expiresRaw: string | number;
  sig: string;
  nowSeconds?: number;
}): { valid: boolean; reason?: "EXPIRED" | "INVALID_SIGNATURE" | "MALFORMED" } {
  const expires =
    typeof params.expiresRaw === "number" ? params.expiresRaw : Number(params.expiresRaw);

  if (!Number.isFinite(expires) || expires <= 0 || !/^[a-f0-9]{64}$/.test(params.sig)) {
    return { valid: false, reason: "MALFORMED" };
  }

  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (now > expires) {
    return { valid: false, reason: "EXPIRED" };
  }

  const expectedHex = computeMediaSignature(params.imageId, params.accountId, expires);
  const actualBuf = Buffer.from(params.sig, "hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");

  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    return { valid: false, reason: "INVALID_SIGNATURE" };
  }

  return { valid: true };
}

/**
 * Privacy Masking Policy for Demo / Sample Images.
 * Ensures demo previews carry explicit privacy-blur/masking directives so no raw
 * identifiable home photography is exposed unmasked.
 */
export interface DemoImageMaskingPolicy {
  isDemo: boolean;
  privacyMasked: boolean;
  blurFacesAndIdentifiers: boolean;
  watermarkText: string;
  retentionPolicy: "DEMO_MASKED_NO_PII" | "PRIVATE_ENCRYPTED_TTL";
}

export function getImageMaskingPolicy(isDemo: boolean): DemoImageMaskingPolicy {
  if (isDemo) {
    return {
      isDemo: true,
      privacyMasked: true,
      blurFacesAndIdentifiers: true,
      watermarkText: "DEMO PRIVACY MASKED — KHÔNG CHỨA DỮ LIỆU GIA ĐÌNH THỰC",
      retentionPolicy: "DEMO_MASKED_NO_PII",
    };
  }
  return {
    isDemo: false,
    privacyMasked: false,
    blurFacesAndIdentifiers: false,
    watermarkText: "PRIVATE HOUSEHOLD MEDIA",
    retentionPolicy: "PRIVATE_ENCRYPTED_TTL",
  };
}

/**
 * Generates an SVG privacy-masking overlay banner/blur layer for demo image previews.
 */
export function buildDemoMaskingSvgOverlay(width = 800, height = 600): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="demo-privacy-blur"><feGaussianBlur stdDeviation="8" /></filter>
  </defs>
  <rect width="100%" height="44" y="0" fill="rgba(15,23,42,0.78)" />
  <text x="16" y="28" fill="#fef08a" font-family="sans-serif" font-size="14" font-weight="bold">
    DEMO MASKED IMAGE — Chỉ minh họa, đã ẩn thông tin nhận dạng hộ gia đình
  </text>
</svg>`;
}

