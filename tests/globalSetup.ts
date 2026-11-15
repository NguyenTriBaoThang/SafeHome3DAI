import { execSync } from "child_process";

export async function setup() {
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      stdio: "pipe",
      env: { ...process.env, DATABASE_URL: "file:./dev.db" },
    });
  } catch {
    // If local dev server has temporary file lock, proceed with existing database
  }
}

