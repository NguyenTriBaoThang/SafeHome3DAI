#!/usr/bin/env node
/**
 * ==============================================================================
 * TASK A12: AUTOMATED CI QUALITY GATES
 * ==============================================================================
 * Fails non-zero on:
 * 1. Hardcoded secrets or NEXT_PUBLIC_* secret exposures in src/, scripts/, .github/
 * 2. Invalid or destructive Prisma SQLite/SQL migrations
 * 3. Shared contract v1 export drift
 * 4. Business API routes missing withAccount() authentication & tenant boundary
 * 5. Overclaimed medical/fall-reduction claims in README.md
 * ==============================================================================
 */
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const failures = [];

function walkFiles(dir, exts, list = []) {
  if (!fs.existsSync(dir)) return list;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", ".scratch", ".venv-stage5"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, exts, list);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      list.push(full);
    }
  }
  return list;
}

// -----------------------------------------------------------------------------
// GATE 1: Hardcoded secrets & NEXT_PUBLIC API key scan
// -----------------------------------------------------------------------------
const secretFiles = [
  ...walkFiles(path.join(root, "src"), [".ts", ".tsx", ".js", ".cjs"]),
  ...walkFiles(path.join(root, ".github"), [".yml", ".yaml"]),
  ...walkFiles(path.join(root, "scripts"), [".js", ".cjs", ".ts", ".py"]),
];

const FORBIDDEN_SECRET_PATTERNS = [
  { name: "NEXT_PUBLIC_KEY_EXPOSURE", regex: /NEXT_PUBLIC_[A-Z0-9_]*(?:GEMINI|OPENAI|API_KEY|SECRET|PASSWORD|TOKEN)/ },
  { name: "GOOGLE_API_KEY_LITERAL", regex: /AIza[0-9A-Za-z_-]{35}/ },
  { name: "PRIVATE_KEY_HEADER", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

for (const file of secretFiles) {
  if (file.endsWith("secretGuard.ts") || file.endsWith("quality-gates.cjs")) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN_SECRET_PATTERNS) {
    if (rule.regex.test(content)) {
      failures.push(`[GATE 1 SECRET] ${rule.name} matched in ${path.relative(root, file)}`);
    }
  }
}

// -----------------------------------------------------------------------------
// GATE 2: Prisma schema & migrations integrity check
// -----------------------------------------------------------------------------
const schemaPath = path.join(root, "prisma", "schema.prisma");
const schemaContent = fs.existsSync(schemaPath) ? fs.readFileSync(schemaPath, "utf8") : "";
for (const model of ["KnowledgeSource", "ConsentRecord", "PersistenceAuditEvent", "RoomSnapshotRecord"]) {
  if (!schemaContent.includes(`model ${model}`)) {
    failures.push(`[GATE 2 SCHEMA] Missing required Prisma model ${model} in prisma/schema.prisma`);
  }
}

const migrationsDir = path.join(root, "prisma", "migrations");
if (!fs.existsSync(migrationsDir)) {
  failures.push("[GATE 2 MIGRATIONS] Missing prisma/migrations directory");
} else {
  const migrationFolders = fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());
  if (migrationFolders.length === 0) {
    failures.push("[GATE 2 MIGRATIONS] No migration folders found");
  }
  for (const folder of migrationFolders) {
    const sqlPath = path.join(migrationsDir, folder.name, "migration.sql");
    if (!fs.existsSync(sqlPath)) {
      failures.push(`[GATE 2 MIGRATIONS] Missing migration.sql in ${folder.name}`);
      continue;
    }
    const sql = fs.readFileSync(sqlPath, "utf8");
    const sqlWithoutComments = sql
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*--.*$/gm, "");
    if (sqlWithoutComments.trim().length < 20) {
      failures.push(`[GATE 2 MIGRATIONS] Empty migration.sql in ${folder.name}`);
    }
    if (/\b(?:DROP\s+TABLE|TRUNCATE\s+TABLE|DELETE\s+FROM)\b/i.test(sqlWithoutComments)) {
      failures.push(`[GATE 2 MIGRATIONS] Destructive SQL statement detected in ${folder.name}/migration.sql`);
    }
  }
}

// -----------------------------------------------------------------------------
// GATE 3: Shared Contract V1 exports & API Route Authorization Verification
// -----------------------------------------------------------------------------
const contractPath = path.join(root, "src", "lib", "contracts", "sharedContractV1.ts");
const contractText = fs.existsSync(contractPath) ? fs.readFileSync(contractPath, "utf8") : "";
for (const sym of [
  "RoomV1Schema",
  "VisionObjectV1Schema",
  "RiskFindingV1Schema",
  "AssessmentResultV1Schema",
  "RoomSnapshotV1Schema",
  "BeforeAfterComparisonV1Schema",
]) {
  if (!contractText.includes(sym)) {
    failures.push(`[GATE 3 CONTRACT] Missing ${sym} in sharedContractV1.ts`);
  }
}

const apiRoutes = walkFiles(path.join(root, "src", "app", "api"), [".ts"]).filter((f) =>
  f.endsWith(`${path.sep}route.ts`)
);
const PUBLIC_AUTH_ROUTES = new Set([
  path.join("src", "app", "api", "auth", "login", "route.ts"),
  path.join("src", "app", "api", "auth", "register", "route.ts"),
  path.join("src", "app", "api", "auth", "logout", "route.ts"),
  path.join("src", "app", "api", "auth", "me", "route.ts"),
]);

for (const routeFile of apiRoutes) {
  const rel = path.relative(root, routeFile);
  if (PUBLIC_AUTH_ROUTES.has(rel)) continue;
  const content = fs.readFileSync(routeFile, "utf8");
  if (!content.includes("withAccount(")) {
    failures.push(`[GATE 3 AUTH] Protected route missing withAccount(): ${rel}`);
  }
}

// -----------------------------------------------------------------------------
// GATE 4: Documentation scope & terminology consistency audit
// -----------------------------------------------------------------------------
const readmePath = path.join(root, "README.md");
const readmeText = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8") : "";
if (!readmeText.includes("Decision Provenance") || !readmeText.includes("Rule-Based Explainability")) {
  failures.push("[GATE 4 DOCS] README.md must label graph as Rule-Based Explainability / Decision Provenance");
}
if (/tỷ lệ giảm chấn thương ngã|Giải Trình AI \(XAI\)/i.test(readmeText)) {
  failures.push("[GATE 4 DOCS] README.md still contains forbidden clinical reduction or XAI overclaim wording");
}

console.log("=== SAFEHOME3DAI CI QUALITY GATES SUMMARY ===");
console.log(`- Files scanned for secrets : ${secretFiles.length}`);
console.log(`- Protected API routes checked: ${apiRoutes.length - PUBLIC_AUTH_ROUTES.size}`);
console.log(`- Gate Failures             : ${failures.length}`);

if (failures.length > 0) {
  for (const f of failures) console.error(`  FAIL: ${f}`);
  process.exit(1);
}

console.log("ALL CI QUALITY GATES PASSED.");
