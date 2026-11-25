import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { accountDirectory, privateRoot } from "./context";

const scrypt = promisify(scryptCallback), run = promisify(execFile);
export const SESSION_COOKIE = "safehome_session";
const sessionAge = 7 * 24 * 60 * 60 * 1000;
type Account = { id: string; email: string; passwordHash: string; ready: number };
let storePromise: Promise<PrismaClient> | undefined;
export function authStore() {
  return storePromise ||= (async () => {
    await fs.mkdir(privateRoot(), { recursive: true, mode: 0o700 });
    const file = path.join(privateRoot(), "accounts.db");
    await fs.appendFile(file, "", { mode: 0o600 });
    const db = new PrismaClient({ datasources: { db: { url: `file:${file.replace(/\\/g, "/")}` } } });
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS Account (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL, ready INTEGER NOT NULL DEFAULT 0)');
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS Session (tokenHash TEXT PRIMARY KEY, accountId TEXT NOT NULL, expires INTEGER NOT NULL)');
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS session_account ON Session(accountId)');
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS RequestLimit (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)');
    return db;
  })();
}
export async function consumeLimit(key: string, limit: number, windowMs: number) {
  const db = await authStore(), now = Date.now();
  await db.$executeRaw`INSERT INTO RequestLimit(key,count,expires) VALUES (${key},1,${now + windowMs}) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires < ${now} THEN 1 ELSE count+1 END, expires=CASE WHEN expires < ${now} THEN ${now + windowMs} ELSE expires END`;
  const [row] = await db.$queryRaw<{ count: number }[]>`SELECT count FROM RequestLimit WHERE key=${key}`;
  return row.count <= limit;
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  const [salt, hex] = hash.split(":");
  const expected = Buffer.from(hex, "hex"), key = await scrypt(password, salt, 64) as Buffer;
  return expected.length === key.length && timingSafeEqual(expected, key);
}
const tenantClients = new Map<string, PrismaClient>();
export async function familyDatabase(id: string) {
  let client = tenantClients.get(id);
  if (!client) {
    const file = path.join(accountDirectory(id), "family.db");
    await fs.access(file); // Never silently initialize an empty database during a request.
    client = new PrismaClient({ datasources: { db: { url: `file:${file.replace(/\\/g, "/")}` } } });
    tenantClients.set(id, client);
  }
  return client;
}
export async function createAccount(email: string, password: string) {
  const db = await authStore(), id = randomUUID(), passwordHash = await hashPassword(password);
  await db.$executeRaw`INSERT INTO Account(id,email,passwordHash) VALUES (${id},${email},${passwordHash})`;
  const directory = accountDirectory(id), filename = path.join(directory, "family.db");
  try {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    await fs.writeFile(filename, "", { flag: "wx", mode: 0o600 });
    // New account only. Existing databases are migrated by an operator after backup.
    await run(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "db", "push", "--skip-generate", "--schema", path.resolve("prisma/schema.prisma")], {
      env: { ...process.env, DATABASE_URL: `file:${filename.replace(/\\/g, "/")}` }, timeout: 60000, windowsHide: true,
    });
    await db.$executeRaw`UPDATE Account SET ready=1 WHERE id=${id}`;
    return { id, email };
  } catch (error) {
    await db.$executeRaw`DELETE FROM Account WHERE id=${id} AND ready=0`;
    // Keep failed initialization files for diagnosis; never delete another family's files.
    throw error;
  }
}
export async function findAccount(email: string) {
  const db = await authStore();
  const [account] = await db.$queryRaw<Account[]>`SELECT * FROM Account WHERE email=${email} AND ready=1`;
  return account;
}
export async function createSession(accountId: string) {
  const token = randomBytes(32).toString("hex"), hash = createHash("sha256").update(token).digest("hex"), db = await authStore();
  await db.$executeRaw`DELETE FROM Session WHERE expires < ${Date.now()}`;
  await db.$executeRaw`INSERT INTO Session(tokenHash,accountId,expires) VALUES (${hash},${accountId},${Date.now() + sessionAge})`;
  return token;
}
export function requestToken(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export async function sessionAccount(request: Request) {
  const token = requestToken(request);
  if (!token) return null;
  const hash = createHash("sha256").update(token).digest("hex"), db = await authStore();
  const [account] = await db.$queryRaw<{ id: string; email: string }[]>`SELECT Account.id,Account.email FROM Account JOIN Session ON Session.accountId=Account.id WHERE Session.tokenHash=${hash} AND Session.expires > ${Date.now()} AND Account.ready=1`;
  return account || null;
}
export async function revokeSession(request: Request) {
  const token = requestToken(request); if (!token) return;
  const hash = createHash("sha256").update(token).digest("hex"), db = await authStore();
  await db.$executeRaw`DELETE FROM Session WHERE tokenHash=${hash}`;
}
export function sessionCookie(token: string, request: Request) {
  const secure = (process.env.SAFEHOME_APP_ORIGIN || request.url).startsWith("https:");
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? sessionAge / 1000 : 0}${secure ? "; Secure" : ""}`;
}

/** Disconnects a single tenant client safely before account deletion/cleanup. */
export async function disconnectTenantDatabase(id: string) {
  const client = tenantClients.get(id);
  if (client) {
    await client.$disconnect();
    tenantClients.delete(id);
  }
}

/** Maintenance/test shutdown; not exposed by any HTTP route. */
export async function disconnectAccountStores() {
  await Promise.all([...tenantClients.values()].map(db => db.$disconnect()));
  tenantClients.clear();
  if (storePromise) await (await storePromise).$disconnect();
  storePromise = undefined;
}
