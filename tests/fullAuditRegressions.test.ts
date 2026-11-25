import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

describe("Full System Audit Regression Suite (BUG-01..BUG-06)", () => {
  it("BUG-01: /api/surveys/.../photos never injects hardcoded simulateVision mock detections", async () => {
    const createMock = vi.fn().mockResolvedValue({
      id: "photo-1",
      roomId: "room-1",
      fileUrl: "/api/vision/images/img-1/file",
      caption: "Real photo",
      detectedObjects: null,
    });

    vi.doMock("@/lib/database/prisma", () => ({
      prisma: {
        surveyRoom: {
          findFirst: vi.fn().mockResolvedValue({ id: "room-1", surveyId: "survey-1" }),
        },
        visionAnalysis: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        surveyRoomPhoto: {
          create: createMock,
        },
      },
    }));

    const { POST } = await import("@/app/api/surveys/[id]/rooms/[roomId]/photos/route");
    const req = new NextRequest("http://localhost/api/surveys/survey-1/rooms/room-1/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({
        fileUrl: "/api/vision/images/img-1/file",
        caption: "Real photo",
        consent: true,
        simulateVision: true,
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "survey-1", roomId: "room-1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.photo.detectedObjects).toBeNull();
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ detectedObjects: null }),
      })
    );
    vi.doUnmock("@/lib/database/prisma");
  });

  it("BUG-01 UI: ai-guided-survey removes simulateVision mock upload and uses file input + consent", () => {
    const surveyPage = fs.readFileSync(path.resolve("src/app/ai-guided-survey/page.tsx"), "utf8");
    expect(surveyPage).not.toContain("simulateVision: true");
    expect(surveyPage).toContain('type="file"');
    expect(surveyPage).toContain("photoConsent");
  });

  it("BUG-02: buildSafeErrorPayload redacts Google API keys and email PII before HTTP error output", () => {
    const sensitiveErr = new Error(
      "Request failed for patient@family.vn with key AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456"
    );
    const safe = buildSafeErrorPayload(sensitiveErr, "Fallback", "ERR_CODE");
    expect(safe.error).not.toContain("patient@family.vn");
    expect(safe.error).not.toContain("AIzaSy");
    expect(safe.error).toContain("[REDACTED_EMAIL]");
    expect(safe.error).toContain("[REDACTED_GOOGLE_API_KEY]");
  });

  it("BUG-03: README matches package.json versions and does not claim 1:1 exact 3D scaling", () => {
    const readme = fs.readFileSync(path.resolve("README.md"), "utf8");
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
    expect(pkg.dependencies.next).toBe("15.5.29");
    expect(readme).toContain("15.5.29");
    expect(readme).toContain("19.1.0");
    expect(readme).toContain(">= 22.12.0");
    expect(readme).not.toContain("tỉ lệ 1:1");
  });

  it("BUG-06: ai-assistant skips fetching /api/ai/conversations/default-session", () => {
    const assistantPage = fs.readFileSync(path.resolve("src/app/ai-assistant/page.tsx"), "utf8");
    expect(assistantPage).toContain('currentConversationId !== "default-session"');
    expect(assistantPage).toContain('convId === "default-session"');
  });
});

