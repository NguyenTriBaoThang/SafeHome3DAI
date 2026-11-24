import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as upload } from "@/app/api/vision/images/route";
import { GET as file } from "@/app/api/vision/images/[imageId]/file/route";
import { DELETE as remove } from "@/app/api/vision/images/[imageId]/route";
import { GET as gallery } from "@/app/api/vision/rooms/[roomId]/images/route";
import { authStore, disconnectAccountStores, familyDatabase, consumeLimit } from "@/lib/auth/accounts";
import { accountScope } from "@/lib/auth/context";
import { prisma } from "@/lib/database/prisma";
import { cacheAssessmentSnapshot, getAssessmentSnapshotById } from "@/lib/risk/assessmentManager";
import { withAccount } from "@/lib/auth/withAccount";

const origin = "http://localhost", password = "Fixture-only-password-2026!";
const scratch = path.resolve(".scratch");
let directory: string, a: { id: string; email: string }, b: typeof a, cookieA: string, cookieB: string;
const request = (url: string, cookie?: string, body?: unknown) => new NextRequest(origin + url, {
  method: body ? "POST" : "GET", headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json", origin } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
beforeAll(async () => {
  fs.mkdirSync(scratch, { recursive: true }); directory = fs.mkdtempSync(path.join(scratch, "account-isolation-"));
  vi.stubEnv("SAFEHOME_PRIVATE_DIR", directory); vi.stubEnv("SAFEHOME_ISOLATED_TESTS", "0");
  for (const name of ["a", "b"]) {
    const response = await register(request("/api/auth/register", undefined, { email: `${name}@fixture.invalid`, password, consent: true }));
    expect(response.status).toBe(201);
    const account = (await response.json()).account, cookie = response.headers.get("set-cookie")!.split(";")[0];
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    if (name === "a") { a = account; cookieA = cookie; } else { b = account; cookieB = cookie; }
  }
}, 120000);
afterAll(async () => {
  await disconnectAccountStores(); vi.unstubAllEnvs();
  if (directory && path.dirname(directory) === scratch && path.basename(directory).startsWith("account-isolation-")) fs.rmSync(directory, { recursive: true, force: true });
});

describe("Two families, independent real SQLite databases and private image bytes", () => {
  it("stores salted password hashes and rejects invalid credentials", async () => {
    const rows = await (await authStore()).$queryRawUnsafe<{ passwordHash: string }[]>("SELECT passwordHash FROM Account");
    expect(rows).toHaveLength(2); expect(rows[0].passwordHash).not.toBe(rows[1].passwordHash);
    expect(JSON.stringify(rows)).not.toContain(password);
    expect((await login(request("/api/auth/login", undefined, { email: a.email, password: "incorrect" }))).status).toBe(401);
  });
  it("requires a session and rejects an Origin from another website", async () => {
    expect((await gallery(request("/api/vision/rooms/r/images"), { params: Promise.resolve({ roomId: "r" }) })).status).toBe(401);
    const response = await remove(new NextRequest(origin + "/api/vision/images/x", { method: "DELETE", headers: { cookie: cookieA, origin: "https://attacker.invalid" } }), { params: Promise.resolve({ imageId: "x" }) });
    expect(response.status).toBe(403);
  });
  it("never reads, deletes or lists another family's photo even with its exact ID", async () => {
    const form = new FormData(); form.set("file", new Blob([fs.readFileSync("public/reference/reference_room.jpg")], { type: "image/jpeg" }), "fixture.jpg");
    form.set("roomId", "same-room-id"); form.set("consent", "true");
    const response = await upload(new NextRequest(origin + "/api/vision/images", { method: "POST", headers: { cookie: cookieA, origin }, body: form }));
    expect(response.status).toBe(201);
    const image = (await response.json()).data;
    expect(image.fileUrl).toContain("/api/vision/images/"); expect(image.imageWidth).toBeGreaterThan(0);
    expect((await file(request(image.fileUrl, cookieA), { params: Promise.resolve({ imageId: image.id }) })).status).toBe(200);
    expect((await file(request(image.fileUrl, cookieB), { params: Promise.resolve({ imageId: image.id }) })).status).toBe(404);
    expect((await remove(new NextRequest(origin + "/api/vision/images/" + image.id, { method: "DELETE", headers: { cookie: cookieB, origin } }), { params: Promise.resolve({ imageId: image.id }) })).status).toBe(404);
    const listing = await gallery(request("/api/vision/rooms/same-room-id/images", cookieB), { params: Promise.resolve({ roomId: "same-room-id" }) });
    expect((await listing.json()).data).toEqual([]);
    expect((await file(request(image.fileUrl, cookieA), { params: Promise.resolve({ imageId: image.id }) })).status).toBe(200);
  });
  it("keeps request scopes and caches separate during interleaved operations", async () => {
    const dbA = await familyDatabase(a.id), dbB = await familyDatabase(b.id);
    const operations = [a, b].map((account, i) => accountScope.run({ ...account, database: i ? dbB : dbA }, async () => {
      await prisma.homeSurvey.create({ data: { id: "identical-id", name: account.email } });
      await new Promise(resolve => setTimeout(resolve, i ? 5 : 20));
      expect((await prisma.homeSurvey.findUniqueOrThrow({ where: { id: "identical-id" } })).name).toBe(account.email);
      if (!i) cacheAssessmentSnapshot({ id: "private-snapshot", roomId: "same-room-id" } as any);
      else expect(getAssessmentSnapshotById("private-snapshot")).toBeNull();
    }));
    await Promise.all(operations);
  });
  it("enforces persisted limits and revokes the session on logout", async () => {
    expect(await consumeLimit("test-limit", 1, 60000)).toBe(true); expect(await consumeLimit("test-limit", 1, 60000)).toBe(false);
    expect((await logout(request("/api/auth/logout", cookieA, {}))).status).toBe(200);
    expect((await gallery(request("/api/vision/rooms/r/images", cookieA), { params: Promise.resolve({ roomId: "r" }) })).status).toBe(401);
  });
  it("blocks stale-account writes, concurrent inference overflow and exhausted hourly quota", async () => {
    const switched = await gallery(new NextRequest(origin + "/api/vision/rooms/r/images", { headers: { cookie: cookieB, "X-SafeHome-Account": a.id } }), { params: Promise.resolve({ roomId: "r" }) });
    expect(switched.status).toBe(403); expect(switched.headers.get("X-SafeHome-Account-Changed")).toBe("1");
    let entered = 0, release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const handler = withAccount(async (_request: Request) => { entered++; await gate; return Response.json({ ok: true }); });
    const scan = () => request("/api/vision/scan-photo", cookieB, {});
    const running = [handler(scan()), handler(scan())];
    try {
      await vi.waitFor(() => expect(entered).toBe(2), { timeout: 10000 });
      expect((await handler(scan())).status).toBe(429);
    } finally { release(); await Promise.all(running); }
    const db = await authStore(), key = `ai:${b.id}`;
    await db.$executeRaw`UPDATE RequestLimit SET count=30 WHERE key=${key}`;
    expect((await handler(scan())).status).toBe(429);
    expect(entered).toBe(2);
  });
});
