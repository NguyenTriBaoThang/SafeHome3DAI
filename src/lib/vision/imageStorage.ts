import fs from "fs";
import path from "path";
import { generateSafeStorageKey } from "./imagePreprocessor";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "vision");

/**
 * Ensures the upload directory exists.
 */
export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Saves image buffer to public/uploads/vision and returns public URL.
 */
export async function saveImageFile(
  roomId: string,
  buffer: Buffer,
  extension: string
): Promise<{ filename: string; fileUrl: string }> {
  ensureUploadDir();
  const filename = generateSafeStorageKey(roomId, extension);
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);
  const fileUrl = `/uploads/vision/${filename}`;

  return { filename, fileUrl };
}

/**
 * Deletes an image file safely.
 */
export async function deleteImageFile(filename: string): Promise<boolean> {
  try {
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOAD_DIR, safeName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
  } catch (err) {
    console.error("[ImageStorage] Error deleting file:", err);
  }
  return false;
}

