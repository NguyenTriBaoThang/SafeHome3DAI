import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
describe("Legacy household media is blocked before public static routing", () => {
  it.each(["/uploads/vision/a.jpg", "/%75ploads/vision/a.jpg", "/uploads%2Fvision/a.jpg", "/%2575ploads/vision/a.jpg", "/Uploads/vision/a.jpg"])("blocks %s even with a session cookie", path => {
    expect(middleware(new NextRequest("http://localhost" + path, { headers: { cookie: "safehome_session=fixture" } })).status).toBe(404);
  });
});
