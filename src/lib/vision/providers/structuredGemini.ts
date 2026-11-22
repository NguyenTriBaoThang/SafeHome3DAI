import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { CATEGORY_TAXONOMY } from "../taxonomy";
import { RISK_IDS, VisionProviderError, type PhotoRisk, type RiskId } from "./contracts";
import config from "./structuredConfig.json";

export type ServingRoom = keyof typeof config.rooms;
export interface RiskCandidate extends PhotoRisk { visible: boolean | "unknown"; applicable: boolean }
export interface StructuredRequest { image: Buffer; mimeType: string; room: ServingRoom; model: string; timeoutMs: number }
export interface StructuredResponse { payload: unknown; modelVersion: string }
export type StructuredGenerator = (request: StructuredRequest) => Promise<StructuredResponse>;
export const STRUCTURED_CONFIG = config;

const tri = z.union([z.boolean(), z.literal("unknown")]);
const riskSchema = z.object({ present: tri, visible: tri, applicable: z.boolean(),
  severity: z.enum(["HIGH", "MEDIUM", "LOW", "UNKNOWN"]), evidence: z.string().trim().min(1) }).strict();
const finite = z.number().finite().min(0).max(1);
const objectSchema = z.object({ category: z.enum(Object.keys(CATEGORY_TAXONOMY) as [string, ...string[]]),
  bbox: z.object({ xMin: finite, yMin: finite, xMax: finite, yMax: finite }).strict()
    .refine(b => b.xMin < b.xMax && b.yMin < b.yMax, "Bbox phải có diện tích dương."),
  confidence: finite, evidence: z.string().trim().min(1) }).strict();
const schema = z.object({ objects: z.array(objectSchema).max(200),
  risks: z.object(Object.fromEntries(RISK_IDS.map(id => [id, riskSchema]))).strict() }).strict();

export function validateStructuredResponse(payload: unknown, room: ServingRoom) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new VisionProviderError("INVALID_RESPONSE", "Phản hồi Gemini không đúng schema vật thể/nguy cơ.");
  const risks = parsed.data.risks as Record<RiskId, RiskCandidate>;
  for (const id of RISK_IDS) {
    const risk = risks[id];
    if (risk.applicable !== config.rooms[room].applicable[id] ||
        ((risk.visible !== true || !risk.applicable || ["RISK-003", "RISK-004", "RISK-005", "RISK-007", "RISK-008"].includes(id)) && risk.present !== "unknown") ||
        (risk.present === "unknown" && risk.severity !== "UNKNOWN")) {
      throw new VisionProviderError("INVALID_RESPONSE", "Phản hồi suy đoán điều kiện chưa quan sát hoặc chưa đo được.");
    }
  }
  return { objects: parsed.data.objects, risks };
}

/** Same structured prompt/schema/seed/threshold as the frozen recipe; no test images included. */
export const generateStructuredRoom: StructuredGenerator = async request => {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: { timeout: request.timeoutMs, retryOptions: { attempts: 1 } } });
  const response = await client.models.generateContent({ model: request.model,
    contents: [{ role: "user", parts: [{ text: config.rooms[request.room].prompt },
      { inlineData: { mimeType: request.mimeType, data: request.image.toString("base64") } }] }],
    config: { responseMimeType: "application/json", responseJsonSchema: config.rooms[request.room].schema,
      seed: config.seed, temperature: config.temperature, maxOutputTokens: config.max_output_tokens,
      abortSignal: AbortSignal.timeout(request.timeoutMs) } });
  if (response.candidates?.[0]?.finishReason !== "STOP" || !response.text) {
    throw new VisionProviderError("INVALID_RESPONSE", "Gemini chưa trả JSON đầy đủ hoặc không thể xử lý ảnh.");
  }
  try { return { payload: JSON.parse(response.text), modelVersion: response.modelVersion || request.model }; }
  catch { throw new VisionProviderError("INVALID_RESPONSE", "Phản hồi Gemini không phải JSON hợp lệ."); }
};
