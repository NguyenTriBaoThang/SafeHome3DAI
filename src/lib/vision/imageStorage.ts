import fs from "fs";
import path from "path";
import { generateSafeStorageKey } from "./imagePreprocessor";
import { accountDirectory, currentAccountId } from "@/lib/auth/context";

export function imageDirectory(): string {
  const id = currentAccountId();
  if (id) return path.join(accountDirectory(id), "images");
  if (process.env.NODE_ENV === "test") return path.resolve(".scratch", "offline-test-images");
  throw new Error("Image access requires an account scope");
}
export const imageFilePath = (filename: string) => path.join(imageDirectory(), path.basename(filename));

/**
 * Ensures the upload directory exists.
 */
export function ensureUploadDir(): void {
  if (!fs.existsSync(imageDirectory())) {
    fs.mkdirSync(imageDirectory(), { recursive: true, mode: 0o700 });
  }
}

/**
 * Saves image bytes inside the current family's private directory.
 */
export async function saveImageFile(
  roomId: string,
  buffer: Buffer,
  extension: string,
  imageId?: string
): Promise<{ filename: string; fileUrl: string }> {
  ensureUploadDir();
  if (!["jpg", "jpeg", "png", "webp"].includes(extension)) throw new Error("Unsupported image extension");
  const filename = generateSafeStorageKey(roomId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80), extension);
  const filePath = imageFilePath(filename);

  await fs.promises.writeFile(filePath, buffer, { flag: "wx", mode: 0o600 });
  const fileUrl = imageId ? `/api/vision/images/${encodeURIComponent(imageId)}/file` : "";

  return { filename, fileUrl };
}

/**
 * Deletes an image file safely.
 */
export async function deleteImageFile(filename: string): Promise<boolean> {
  try {
    const safeName = path.basename(filename);
    const filePath = imageFilePath(safeName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return true;
  } catch (err) {
    console.error("[ImageStorage] Error deleting file:", err);
  }
  return false;
}

