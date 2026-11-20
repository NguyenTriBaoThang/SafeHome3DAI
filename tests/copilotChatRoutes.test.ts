import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postChat } from "@/app/api/ai/chat/route";
import { POST as postStream } from "@/app/api/ai/chat/stream/route";
import { processCopilotChat } from "@/lib/ai/geminiChatService";
import { saveAssistantMessage, saveUserMessage } from "@/lib/ai/conversationManager";
import { INITIAL_ROOMS } from "@/data/mockRooms";

vi.mock("@/lib/ai/geminiChatService", () => ({ processCopilotChat: vi.fn() }));
vi.mock("@/lib/ai/conversationManager", () => ({
  getRecentConversationTurns: vi.fn(async () => [{ role: "user", content: "Kiểm tra phòng này" }]),
  saveAssistantMessage: vi.fn(async () => ({})),
  saveUserMessage: vi.fn(async () => ({})),
}));

const reply = {
  answer: "Cần cố định thảm [1].",
  evidenceStatus: "SUPPORTED",
  responseMode: "LLM_GENERATED",
  citations: [],
  modelProvider: "Google-Gemini",
  modelName: "test-model",
  suggestedFollowUps: [],
  toolInvocations: [{ tool: "focus3DObject", success: true, message: "Sẵn sàng mở đồ vật", clientAction: { type: "FOCUS_3D_OBJECT" as const, payload: { objectId: "obj-rug-01" } } }],
  warnings: [],
};

describe.each([["JSON", postChat], ["SSE", postStream]] as const)("Copilot %s API", (_name, post) => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processCopilotChat).mockResolvedValue(reply);
  });

  it.each([{ message: "  " }, { message: "x".repeat(3001) }, { message: "kiểm tra", roomState: {} },
    { message: "kiểm tra", roomId: "wrong-room", roomState: INITIAL_ROOMS[0] }])("rejects invalid requests before invoking the agent", async (body) => {
    const response = await post(new Request("http://localhost/api/ai/chat", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
    expect(processCopilotChat).not.toHaveBeenCalled();
    expect(saveUserMessage).not.toHaveBeenCalled();
  });

  it("passes validated state, memory and cancellation to the agent and returns its actions", async () => {
    const room = INITIAL_ROOMS[0];
    const request = new Request("http://localhost/api/ai/chat", { method: "POST", body: JSON.stringify({
      message: " Xem thảm trên 3D ", roomId: room.id, roomState: room, conversationId: "test-conversation",
    }) });
    const response = await post(request);
    expect(response.status).toBe(200);
    expect(processCopilotChat).toHaveBeenCalledWith(expect.objectContaining({
      message: "Xem thảm trên 3D", roomId: room.id,
      roomState: expect.objectContaining({ id: room.id, lightingLevel: room.lightingLevel }),
      history: [{ role: "user", content: "Kiểm tra phòng này" }], signal: request.signal,
    }));
    expect(saveAssistantMessage).toHaveBeenCalledWith("test-conversation", expect.objectContaining({ answer: reply.answer }));
    if (response.headers.get("Content-Type")?.startsWith("text/event-stream")) {
      const events = (await response.text()).trim().split("\n\n").map((line) => JSON.parse(line.slice(6)));
      expect(events[0]).toMatchObject({ type: "meta", response_mode: "LLM_GENERATED" });
      expect(events.find((event) => event.type === "tools").tool_invocations).toEqual(reply.toolInvocations);
      expect(events.filter((event) => event.type === "chunk").map((event) => event.content).join("")).toBe(reply.answer);
      expect(events.at(-1)).toMatchObject({ type: "done", conversation_id: "test-conversation", tool_invocations: reply.toolInvocations });
    } else {
      expect(await response.json()).toMatchObject({ answer: reply.answer, tool_invocations: reply.toolInvocations });
    }
  });
});
