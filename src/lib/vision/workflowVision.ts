import type { NormalizedBoundingBox, VisionClarificationQuestion, VisionDetection } from "./types";

/**
 * Client-side helpers for /workflow step 3. Reuses the canonical vision APIs
 * (upload -> analyze -> PATCH detection); never fabricates detections.
 */

export type WorkflowVisionOutcome =
  | { kind: "no_consent"; message: string }
  | { kind: "unknown"; message: string; code?: string; retryable: boolean }
  | {
      kind: "ok";
      roomId: string;
      imageId: string;
      fileUrl: string;
      detections: VisionDetection[];
      clarifications: VisionClarificationQuestion[];
      modelId?: string;
      provider?: string;
      demo: boolean;
    };

export const NO_CONSENT_MESSAGE =
  "Chưa có đồng ý gửi ảnh cho AI bên thứ ba nên ảnh không được gửi đi. Bạn có thể tick đồng ý hoặc dùng checklist.";
export const UNKNOWN_MESSAGE_PREFIX = "Chưa xác định: ";

/** Detections always start unconfirmed; confirmation only comes from a user action. */
export function initialWorkflowDetections(): VisionDetection[] {
  return [];
}

export function toApiRoomType(roomType: string): "BEDROOM" | "BATHROOM" | "LIVING_ROOM" {
  return roomType === "BATHROOM" ? "BATHROOM" : roomType === "BEDROOM" ? "BEDROOM" : "LIVING_ROOM";
}

/** Mean model confidence over detections that are not rejected; null when there is no data. */
export function averageConfidence(detections: Pick<VisionDetection, "confidence" | "verificationStatus">[]): number | null {
  const live = detections.filter((d) => d.verificationStatus !== "REJECTED" && Number.isFinite(d.confidence));
  if (live.length === 0) return null;
  return live.reduce((sum, d) => sum + d.confidence, 0) / live.length;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Percent style of a normalized bbox. The overlay must sit in a box that has exactly the
 * rendered image's size (wrapper hugging an object-contain image), so percentages match pixels.
 */
export function bboxToPercentStyle(bbox: NormalizedBoundingBox) {
  const left = clamp01(bbox.xMin), top = clamp01(bbox.yMin);
  return {
    left: `${left * 100}%`,
    top: `${top * 100}%`,
    width: `${(clamp01(bbox.xMax) - left) * 100}%`,
    height: `${(clamp01(bbox.yMax) - top) * 100}%`,
  };
}

type FetchLike = typeof fetch;

function unknown(message: string, retryable: boolean, code?: string): WorkflowVisionOutcome {
  return { kind: "unknown", message: UNKNOWN_MESSAGE_PREFIX + message, code, retryable };
}

export async function runWorkflowVision(params: {
  file: File | Blob;
  roomId: string;
  roomType: string;
  viewpoint?: string;
  consent: boolean;
  fetchImpl?: FetchLike;
}): Promise<WorkflowVisionOutcome> {
  // No consent: nothing leaves the browser, no provider is called.
  if (!params.consent) return { kind: "no_consent", message: NO_CONSENT_MESSAGE };
  const doFetch = params.fetchImpl ?? fetch;
  const viewpoint = params.viewpoint ?? "ENTRANCE";
  try {
    const form = new FormData();
    form.set("file", params.file);
    form.set("roomId", params.roomId);
    form.set("viewpoint", viewpoint);
    form.set("consent", "true");
    const up = await doFetch("/api/vision/images", { method: "POST", body: form });
    const upBody = await up.json().catch(() => null);
    if (!up.ok || !upBody?.success || !upBody.data?.id) {
      if (up.status === 403) return { kind: "no_consent", message: upBody?.error || NO_CONSENT_MESSAGE };
      return unknown(upBody?.error || "không lưu được ảnh. Hãy thử lại.", up.status >= 500, upBody?.code);
    }
    const imageId: string = upBody.data.id;
    const res = await doFetch(`/api/vision/images/${encodeURIComponent(imageId)}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: params.roomId,
        roomType: toApiRoomType(params.roomType),
        viewpoint,
        mode: "AI_VISION",
        consent: true,
      }),
      signal: AbortSignal.timeout(135000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success || !body.data) {
      if (res.status === 403) return { kind: "no_consent", message: body?.error || NO_CONSENT_MESSAGE };
      // 429 / 500 / 503 / not configured: surface as unknown, never as boxes.
      return unknown(
        body?.error || `AI chưa phản hồi (HTTP ${res.status}).`,
        res.status === 429 || res.status >= 500,
        body?.code
      );
    }
    const detections: VisionDetection[] = (body.data.detections || []).map((d: VisionDetection) => ({
      ...d,
      // Whatever the provider says, the workflow never starts with a confirmed item.
      verificationStatus: "PENDING_REVIEW",
    }));
    return {
      kind: "ok",
      roomId: params.roomId,
      imageId,
      fileUrl: body.image?.fileUrl || upBody.data.fileUrl,
      detections,
      clarifications: body.data.clarifications || [],
      modelId: body.data.modelId,
      provider: body.data.provider,
      demo: detections.some((d) => d.source === "MOCK_DEMO"),
    };
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return unknown(timedOut ? "hết thời gian chờ AI." : "lỗi kết nối tới máy chủ.", true);
  }
}

/** Persist one user action on a detection (accept / edit / reject). */
export async function patchWorkflowDetection(
  id: string,
  body: { verificationStatus: "CONFIRMED" | "REJECTED" | "CORRECTED"; userLabel?: string; category?: string },
  fetchImpl: FetchLike = fetch
): Promise<Partial<VisionDetection>> {
  const res = await fetchImpl(`/api/vision/detections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || "Không lưu được thao tác xác nhận.");
  return json.data;
}
