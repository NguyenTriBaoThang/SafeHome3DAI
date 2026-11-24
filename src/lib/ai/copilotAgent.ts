import { z } from "zod";
import { COPILOT_TOOLS, executeCopilotTool, ToolExecutionResult } from "./copilotToolRegistry";
import { ConversationTurn } from "@/lib/rag/queryAnalysis";
import { RetrievedChunk } from "@/lib/rag/types";
import { FullSystemContext } from "./safeHomeContextService";

const searchParameters = z.object({ query: z.string().trim().min(1).max(1000) });

// All current tools have flat string/enum arguments. Derive the wire schema from
// the same Zod definitions used by the executor so the two cannot drift.
function parametersSchema(parameters: z.ZodObject) {
  const properties: Record<string, { type: string; description?: string; enum?: string[] }> = {};
  const required: string[] = [];
  for (const [name, field] of Object.entries(parameters.shape) as [string, z.ZodTypeAny][]) {
    const value = field instanceof z.ZodOptional ? field.unwrap() : field;
    if (!(value instanceof z.ZodString) && !(value instanceof z.ZodEnum)) {
      throw new Error(`Unsupported tool parameter: ${name}`);
    }
    properties[name] = {
      type: "STRING",
      description: field.description || value.description,
      ...(value instanceof z.ZodEnum ? { enum: value.options.map(String) } : {}),
    };
    if (!field.isOptional()) required.push(name);
  }
  return { type: "OBJECT", properties, ...(required.length ? { required } : {}) };
}

export function getAgentFunctionDeclarations() {
  return [
    ...COPILOT_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: parametersSchema(tool.parameters),
    })),
    {
      name: "searchKnowledge",
      description: "Tra cứu thêm bằng chứng trong kho tài liệu đã thẩm định. Dùng khi cần làm rõ hoặc bổ sung căn cứ; giữ nguyên số trích dẫn trả về.",
      parameters: parametersSchema(searchParameters),
    },
  ];
}

interface FunctionCall {
  name: string;
  args?: unknown;
  id?: string;
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
  functionCall?: FunctionCall;
  functionResponse?: { name: string; id?: string; response: ToolExecutionResult };
  // Preserve provider metadata, including thought signatures, on round trips.
  [key: string]: unknown;
}

interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

interface AgentOptions {
  message: string;
  history: ConversationTurn[];
  roomId?: string;
  systemContext: FullSystemContext;
  systemInstruction: string;
  apiKey: string;
  model: string;
  toolInvocations: ToolExecutionResult[];
  searchKnowledge: (query: string) => RetrievedChunk[];
  signal?: AbortSignal;
}

function boundedSetting(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback;
}

function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/** Bounded model -> tools -> observations loop. Client actions remain proposals
 * which the user opens using the existing action cards. */
export async function runCopilotAgent(options: AgentOptions): Promise<string> {
  const maxSteps = boundedSetting("AI_AGENT_MAX_STEPS", 4, 1, 8);
  const timeoutMs = boundedSetting("AI_AGENT_TIMEOUT_MS", 20000, 1000, 60000);
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  const contents: GeminiContent[] = options.history
    .filter((turn) => turn.role !== "system")
    .slice(-6)
    .map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] }));
  contents.push({ role: "user", parts: [{ text: options.message }] });
  const cache = new Map<string, ToolExecutionResult>();
  let callCount = 0;

  try {
    // Reserve one final generation with tools disabled after the tool rounds.
    for (let step = 0; step <= maxSteps; step++) {
      controller.signal.throwIfAborted();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(options.model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": options.apiKey },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: options.systemInstruction }] },
            tools: [{ functionDeclarations: getAgentFunctionDeclarations() }],
            toolConfig: { functionCallingConfig: { mode: step === maxSteps ? "NONE" : "AUTO" } },
            generationConfig: { temperature: 0.2, maxOutputTokens: 1600 },
          }),
        }
      );
      if (!response.ok) throw new Error(`LLM_HTTP_${response.status}`);
      const body = await response.json();
      controller.signal.throwIfAborted();
      const candidate = body.candidates?.[0];
      const content = candidate?.content as GeminiContent | undefined;
      if (!content || !Array.isArray(content.parts) || candidate.finishReason === "SAFETY") {
        throw new Error("LLM_EMPTY_OR_BLOCKED");
      }
      const calls = content.parts.flatMap((part) => part.functionCall ? [part.functionCall] : []);
      if (!calls.length) {
        const answer = content.parts.filter((part) => !part.thought).map((part) => part.text || "").join("").trim();
        if (!answer || (candidate.finishReason && candidate.finishReason !== "STOP")) {
          throw new Error("LLM_INCOMPLETE_ANSWER");
        }
        return answer;
      }
      if (step === maxSteps || callCount + calls.length > 8) throw new Error("AGENT_TOOL_LIMIT");
      callCount += calls.length;
      contents.push({ ...content, role: "model" });
      const observations: GeminiPart[] = [];
      for (const call of calls) {
        controller.signal.throwIfAborted();
        const args = call.args ?? {};
        const cacheKey = JSON.stringify([call.name, args && typeof args === "object"
          ? Object.entries(args).sort(([a], [b]) => a.localeCompare(b)) : args]);
        let result = cache.get(cacheKey);
        if (!result) {
          if (call.name === "searchKnowledge") {
            const parsed = searchParameters.strict().safeParse(args);
            if (!parsed.success) {
              result = { tool: call.name, success: false, message: "Truy vấn tra cứu không hợp lệ." };
            } else {
              const chunks = options.searchKnowledge(parsed.data.query);
              result = {
                tool: call.name,
                success: true,
                message: `Đã tìm thấy ${chunks.length} đoạn bằng chứng.`,
                data: chunks.map((chunk) => ({
                  citationNumber: chunk.citationIndex,
                  documentTitle: chunk.documentTitle,
                  publisher: chunk.publisher,
                  text: chunk.chunkText,
                })),
              };
            }
          } else {
            try {
              result = await abortable(executeCopilotTool(call.name, args, options.roomId, options.systemContext), controller.signal);
            } catch {
              result = { tool: call.name, success: false, message: "Không thể truy xuất dữ liệu công cụ lúc này." };
            }
          }
          controller.signal.throwIfAborted();
          cache.set(cacheKey, result);
          options.toolInvocations.push(result);
        }
        observations.push({ functionResponse: {
          name: call.name,
          ...(call.id ? { id: call.id } : {}),
          response: result,
        } });
      }
      contents.push({ role: "user", parts: observations });
    }
    throw new Error("AGENT_STEP_LIMIT");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
