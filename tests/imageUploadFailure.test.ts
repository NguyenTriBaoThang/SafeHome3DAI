import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/vision/images/route";
const db = vi.hoisted(() => ({ roomImage: { create: vi.fn() } }));
const files = vi.hoisted(() => ({ saveImageFile: vi.fn().mockResolvedValue({ filename: "fixture.jpg", fileUrl: "/api/vision/images/fixture/file" }), deleteImageFile: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/database/prisma", () => ({ prisma: db }));
vi.mock("@/lib/vision/imageStorage", () => files);
afterEach(() => { vi.clearAllMocks(); });
const upload = (consent = true) => {
  const form = new FormData(); form.set("file", new Blob([new Uint8Array([255,216,255,224,0,2,255,217])]), "fixture.jpg");
  form.set("roomId", "fixture-room"); if (consent) form.set("consent", "true");
  return new NextRequest("http://localhost/api/vision/images", { method: "POST", body: form });
};
describe("Upload errors never become successful synthetic records", () => {
  it("removes newly written bytes and returns 503 after database failure", async () => {
    db.roomImage.create.mockRejectedValue(new Error("fixture database failure"));
    const response = await POST(upload());
    expect(response.status).toBe(503); expect((await response.json()).success).toBe(false);
    expect(files.deleteImageFile).toHaveBeenCalledWith("fixture.jpg");
    expect(db.roomImage.create.mock.calls[0][0].data.imageWidth).toBeNull();
  });
  it("requires explicit photo consent before writing files", async () => {
    expect((await POST(upload(false))).status).toBe(400);
    expect(files.saveImageFile).not.toHaveBeenCalled();
  });
});
