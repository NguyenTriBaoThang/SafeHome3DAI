import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { POST as register } from "@/app/api/auth/register/route";
import { GET as getConsent, POST as postConsent } from "@/app/api/auth/consent/route";
import { POST as revokeConsentRoute } from "@/app/api/auth/consent/revoke/route";
import { GET as getMe, DELETE as deleteMe } from "@/app/api/auth/me/route";
import { POST as uploadImage } from "@/app/api/vision/images/route";
import { GET as getImageFile } from "@/app/api/vision/images/[imageId]/file/route";
import { POST as analyzeImage } from "@/app/api/vision/images/[imageId]/analyze/route";
import { POST as scanPhoto } from "@/app/api/vision/scan-photo/route";
import { POST as assessItem } from "@/app/api/vision/assess-item/route";
import { POST as createSim } from "@/app/api/simulations/route";
import { DELETE as deleteSim } from "@/app/api/simulations/[id]/route";
import { GET as getSurvey } from "@/app/api/surveys/[id]/route";
import { authorizeObjectAccess, AuthorizationError } from "@/lib/auth/authorization";
import { disconnectAccountStores, familyDatabase } from "@/lib/auth/accounts";
import { accountScope } from "@/lib/auth/context";
import { prisma } from "@/lib/database/prisma";
import {
  buildDemoMaskingSvgOverlay,
  getImageMaskingPolicy,
  signPrivateMediaUrl,
  verifySignedMediaToken,
} from "@/lib/privacy/mediaSecurity";
import { imageFilePath } from "@/lib/vision/imageStorage";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";

const origin = "http://localhost";
const password = "StrongFixturePassword-2026!";
const scratch = path.resolve(".scratch");
const validJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9]);

let privateDir: string;
let userA: { id: string; email: string };
let userB: { id: string; email: string };
let cookieA: string;
let cookieB: string;

function req(url: string, method: string, cookie?: string, body?: unknown, extraHeaders?: Record<string, string>) {
  return new NextRequest(origin + url, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json", origin } : {}),
      ...(extraHeaders || {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

beforeAll(async () => {
  fs.mkdirSync(scratch, { recursive: true });
  privateDir = fs.mkdtempSync(path.join(scratch, "a06-security-"));
  vi.stubEnv("SAFEHOME_PRIVATE_DIR", privateDir);
  vi.stubEnv("SAFEHOME_ISOLATED_TESTS", "0");

  for (const tag of ["alice", "bob"]) {
    const res = await register(
      req("/api/auth/register", "POST", undefined, {
        email: `${tag}@a06.invalid`,
        password,
        consent: true,
        allowImageStorage: true,
        allowThirdPartyAI: true,
      })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    const cookie = res.headers.get("set-cookie")!.split(";")[0];
    if (tag === "alice") {
      userA = json.account;
      cookieA = cookie;
    } else {
      userB = json.account;
      cookieB = cookie;
    }
  }
}, 120000);

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await disconnectAccountStores();
  vi.unstubAllEnvs();
  if (privateDir && path.dirname(privateDir) === scratch && path.basename(privateDir).startsWith("a06-security-")) {
    fs.rmSync(privateDir, { recursive: true, force: true });
  }
});

describe("Task A06 — Authentication, Object-Level Authorization, Consent & Deletion", () => {
  describe("1. Unauthenticated Rejections (401)", () => {
    it("rejects unauthenticated requests across protected endpoints with 401", async () => {
      expect((await getMe(req("/api/auth/me", "GET"))).status).toBe(401);
      expect((await getConsent(req("/api/auth/consent", "GET"))).status).toBe(401);
      expect((await deleteMe(req("/api/auth/me", "DELETE"))).status).toBe(401);
      expect(
        (
          await scanPhoto(
            new NextRequest(origin + "/api/vision/scan-photo", { method: "POST", body: validJpeg })
          )
        ).status
      ).toBe(401);
      expect(
        (
          await getSurvey(req("/api/surveys/any-id", "GET"), {
            params: Promise.resolve({ id: "any-id" }),
          })
        ).status
      ).toBe(401);
    });
  });

  describe("2. Object-Level Authorization, IDOR Protection & Signed Short-Lived URLs", () => {
    it("enforces short-lived HMAC signed URLs and blocks expired, tampered, and cross-user IDOR access", async () => {
      // User A uploads private room image
      const form = new FormData();
      form.set("file", new Blob([fs.readFileSync("public/reference/reference_room.jpg")], { type: "image/jpeg" }), "room.jpg");
      form.set("roomId", "room-a06-01");
      form.set("consent", "true");

      const uploadRes = await uploadImage(
        new NextRequest(origin + "/api/vision/images", {
          method: "POST",
          headers: { cookie: cookieA, origin },
          body: form,
        })
      );
      expect(uploadRes.status).toBe(201);
      const uploaded = (await uploadRes.json()).data;
      expect(uploaded.signedUrl).toContain("expires=");
      expect(uploaded.signedUrl).toContain("sig=");

      // 1. Valid signed URL works for owner User A
      const okFileRes = await getImageFile(req(uploaded.signedUrl, "GET", cookieA), {
        params: Promise.resolve({ imageId: uploaded.id }),
      });
      expect(okFileRes.status).toBe(200);
      expect(okFileRes.headers.get("X-Privacy-Policy")).toBe("PRIVATE_HOUSEHOLD_MEDIA");

      // 2. IDOR: User B tries User A's exact signedUrl -> 403 Invalid signed URL (signature bound to User A)
      const crossSignedRes = await getImageFile(req(uploaded.signedUrl, "GET", cookieB), {
        params: Promise.resolve({ imageId: uploaded.id }),
      });
      expect(crossSignedRes.status).toBe(403);

      // 3. Tampered signature -> 403
      const tamperedUrl = uploaded.signedUrl.replace(/sig=[a-f0-9]{64}/, "sig=" + "0".repeat(64));
      expect(
        (
          await getImageFile(req(tamperedUrl, "GET", cookieA), {
            params: Promise.resolve({ imageId: uploaded.id }),
          })
        ).status
      ).toBe(403);

      // 4. Expired signed token check
      const pastVerify = verifySignedMediaToken({
        imageId: uploaded.id,
        accountId: userA.id,
        expiresRaw: 1000,
        sig: signPrivateMediaUrl(uploaded.id, userA.id, 60).sig,
        nowSeconds: 9999999999,
      });
      expect(pastVerify.valid).toBe(false);
      expect(pastVerify.reason).toBe("EXPIRED");
    });

    it("enforces role and owner guards in authorizeObjectAccess and logs IDOR attempts", async () => {
      const dbB = await familyDatabase(userB.id);
      await accountScope.run({ ...userB, database: dbB }, async () => {
        await expect(
          authorizeObjectAccess({
            resourceType: "SURVEY",
            resourceId: "survey-owned-by-A",
            resourceOwnerId: userA.id,
            callerAccountId: userB.id,
            callerRole: "OWNER",
            action: "READ",
          })
        ).rejects.toBeInstanceOf(AuthorizationError);

        await expect(
          authorizeObjectAccess({
            resourceType: "SURVEY",
            resourceId: "survey-owned-by-A",
            resourceOwnerId: userA.id,
            callerAccountId: userB.id,
            callerRole: "CLINICAL_REVIEWER",
            action: "DELETE",
          })
        ).rejects.toBeInstanceOf(AuthorizationError);

        // Clinical reviewer may READ anonymized/reviewable targets when explicitly delegated
        await expect(
          authorizeObjectAccess({
            resourceType: "SURVEY",
            resourceId: "survey-owned-by-A",
            resourceOwnerId: userA.id,
            callerAccountId: userB.id,
            callerRole: "CLINICAL_REVIEWER",
            action: "READ",
          })
        ).resolves.toBe(true);
      });
    });
  });

  describe("3. Versioned Consent, Default-Deny Gemini Gate & Revocation Enforcement", () => {
    it("blocks Gemini processing when thirdPartyAI consent is missing or revoked", async () => {
      // Grant imageStorage ONLY (deny thirdPartyAI) for User B
      const grantRes = await postConsent(
        req("/api/auth/consent", "POST", cookieB, {
          consentVersion: "2026.1",
          allowImageStorage: true,
          allowThirdPartyAI: false,
          allowResearchUse: false,
        })
      );
      expect(grantRes.status).toBe(201);

      vi.stubEnv("VISION_PROVIDER", "gemini");
      vi.stubEnv("GEMINI_API_KEY", "dummy-key-must-never-be-called");
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // User B tries to scan-photo using Gemini without third_party_ai consent -> 403 BEFORE contacting Gemini
      const scanBlocked = await scanPhoto(
        new NextRequest(origin + "/api/vision/scan-photo", {
          method: "POST",
          headers: { cookie: cookieB, origin },
          body: validJpeg,
        })
      );
      expect(scanBlocked.status).toBe(403);
      const scanBody = await scanBlocked.json();
      expect(scanBody.code).toBe("CONSENT_REQUIRED");
      expect(fetchSpy).not.toHaveBeenCalled();

      // User B tries assess-item with photo without third_party_ai consent -> 403 BEFORE Gemini
      const assessBlocked = await assessItem(
        req("/api/vision/assess-item", "POST", cookieB, {
          imageBase64: Buffer.from(validJpeg).toString("base64"),
          itemHint: "rug",
        })
      );
      expect(assessBlocked.status).toBe(403);
      expect((await assessBlocked.json()).code).toBe("CONSENT_REQUIRED");

      // Now User A revokes all consent and verifies future image upload & analysis are blocked (403 CONSENT_REVOKED)
      const revokeRes = await revokeConsentRoute(
        req("/api/auth/consent/revoke", "POST", cookieA, {
          reason: "Không muốn chia sẻ ảnh nữa",
          purgeStoredImages: true,
        })
      );
      expect(revokeRes.status).toBe(200);
      const revokeBody = await revokeRes.json();
      expect(revokeBody.consent.status).toBe("REVOKED");
      expect(revokeBody.purgedImagesCount).toBeGreaterThanOrEqual(1);

      // Even if a stale request sends consent="true", REVOKED state in DB blocks upload!
      const form = new FormData();
      form.set("file", new Blob([validJpeg], { type: "image/jpeg" }), "after-revoke.jpg");
      form.set("roomId", "room-a06-01");
      form.set("consent", "true");
      const blockedUpload = await uploadImage(
        new NextRequest(origin + "/api/vision/images", {
          method: "POST",
          headers: { cookie: cookieA, origin },
          body: form,
        })
      );
      expect(blockedUpload.status).toBe(403);
      expect((await blockedUpload.json()).code).toBe("CONSENT_REVOKED");

      // Re-grant User A consent with retainOriginalImage=false to test ephemeral retention policy
      await postConsent(
        req("/api/auth/consent", "POST", cookieA, {
          allowImageStorage: true,
          allowThirdPartyAI: true,
          retainOriginalImage: false,
          retentionDays: 0,
        })
      );
      vi.stubEnv("VISION_PROVIDER", "local");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          Response.json({
            contract_version: 1,
            source: "LOCAL_FINE_TUNED_DETECTOR",
            risk_supported: false,
            model_sha256: "a".repeat(64),
            trained_classes: ["bed"],
            untrained_classes: Object.keys(CATEGORY_TAXONOMY).filter((c) => c !== "bed"),
            objects: [{ category: "bed", bbox: { xMin: 0.1, yMin: 0.1, xMax: 0.8, yMax: 0.8 }, confidence: 0.9 }],
          })
        )
      );

      const form2 = new FormData();
      form2.set("file", new Blob([fs.readFileSync("public/reference/reference_room.jpg")], { type: "image/jpeg" }), "ephemeral.jpg");
      form2.set("roomId", "room-a06-ephemeral");
      form2.set("consent", "true");
      const up2 = await uploadImage(
        new NextRequest(origin + "/api/vision/images", {
          method: "POST",
          headers: { cookie: cookieA, origin },
          body: form2,
        })
      );
      expect(up2.status).toBe(201);
      const uploaded2 = (await up2.json()).data;

      const analyzeRes = await analyzeImage(
        req(`/api/vision/images/${uploaded2.id}/analyze`, "POST", cookieA, {
          roomId: "room-a06-ephemeral",
          roomType: "BEDROOM",
          mode: "AI_VISION",
          consent: true,
        }),
        { params: Promise.resolve({ imageId: uploaded2.id }) }
      );
      expect(analyzeRes.status).toBe(200);
      const analyzeBody = await analyzeRes.json();
      // Ephemeral retention deleted the raw original image right after AI extraction!
      expect(analyzeBody.originalImageRetained).toBe(false);

      const dbA = await familyDatabase(userA.id);
      await accountScope.run({ ...userA, database: dbA }, async () => {
        expect(fs.existsSync(imageFilePath(uploaded2.storageKey))).toBe(false);
      });
    });
  });

  describe("4. Demo Image Privacy Masking Policy", () => {
    it("enforces privacy masking banner and blurred overlay on demo media", () => {
      const demoPolicy = getImageMaskingPolicy(true);
      expect(demoPolicy.privacyMasked).toBe(true);
      expect(demoPolicy.blurFacesAndIdentifiers).toBe(true);
      expect(demoPolicy.retentionPolicy).toBe("DEMO_MASKED_NO_PII");

      const svg = buildDemoMaskingSvgOverlay(800, 600);
      expect(svg).toContain("DEMO MASKED IMAGE");
      expect(svg).toContain("feGaussianBlur");
    });
  });

  describe("5. Cascade Deletion Proof (Room + Private Files + Entire Account)", () => {
    it("deletes room DB records, RoomImages, and private disk files in cascade", async () => {
      // Ensure User A has granted consent
      await postConsent(
        req("/api/auth/consent", "POST", cookieA, {
          allowImageStorage: true,
          allowThirdPartyAI: true,
          retainOriginalImage: true,
        })
      );

      // Create room via simulations API
      const simRes = await createSim(
        req("/api/simulations", "POST", cookieA, {
          name: "Phòng Cascade Delete Test",
          roomType: "BEDROOM",
        })
      );
      expect(simRes.status).toBe(201);
      const room = (await simRes.json()).data;

      // Upload a private image attached to this room
      const form = new FormData();
      form.set("file", new Blob([fs.readFileSync("public/reference/reference_room.jpg")], { type: "image/jpeg" }), "cascade.jpg");
      form.set("roomId", room.id);
      form.set("consent", "true");
      const upRes = await uploadImage(
        new NextRequest(origin + "/api/vision/images", {
          method: "POST",
          headers: { cookie: cookieA, origin },
          body: form,
        })
      );
      expect(upRes.status).toBe(201);
      const imgData = (await upRes.json()).data;

      let diskPath = "";
      const dbA = await familyDatabase(userA.id);
      await accountScope.run({ ...userA, database: dbA }, async () => {
        diskPath = imageFilePath(imgData.storageKey);
        expect(fs.existsSync(diskPath)).toBe(true);
      });

      // Delete the room via API -> must cascade DB rows AND unlink file on disk
      const delRes = await deleteSim(req(`/api/simulations/${room.id}`, "DELETE", cookieA), {
        params: Promise.resolve({ id: room.id }),
      });
      expect(delRes.status).toBe(200);
      const delBody = await delRes.json();
      expect(delBody.deletionReport.deletedDbRecords.images).toBe(1);
      expect(delBody.deletionReport.deletedFiles).toContain(imgData.storageKey);
      expect(delBody.deletionReport.cleanupPendingFiles).toEqual([]);
      expect(delBody.deletionReport.cacheInvalidated).toBe(true);
      expect(fs.existsSync(diskPath)).toBe(false);
    });

    it("deletes entire user account, revokes session, and removes private directory", async () => {
      // Register a disposable User C to verify full right-to-be-forgotten deletion
      const regC = await register(
        req("/api/auth/register", "POST", undefined, {
          email: "charlie@a06.invalid",
          password,
          consent: true,
        })
      );
      expect(regC.status).toBe(201);
      const userC = (await regC.json()).account;
      const cookieC = regC.headers.get("set-cookie")!.split(";")[0];

      const delAccountRes = await deleteMe(req("/api/auth/me", "DELETE", cookieC));
      expect(delAccountRes.status).toBe(200);
      const delBody = await delAccountRes.json();
      expect(delBody.success).toBe(true);
      expect(delBody.sessionsRevoked).toBe(true);
      expect(delBody.directoryRemoved).toBe(true);
      expect(delBody.cleanupPending).toBe(false);

      // Session is now revoked -> /api/auth/me returns 401
      expect((await getMe(req("/api/auth/me", "GET", cookieC))).status).toBe(401);
      expect(fs.existsSync(path.join(privateDir, "families", userC.id))).toBe(false);
    });
  });
});

