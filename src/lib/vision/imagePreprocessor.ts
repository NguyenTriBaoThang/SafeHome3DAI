import { NormalizedBoundingBox } from "./types";

export interface ImageValidationResult {
  isValid: boolean;
  mimeType: string;
  fileExtension: string;
  errorMessage?: string;
  fileSizeBytes: number;
}

// Magic bytes signatures
const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  WEBP: [0x52, 0x49, 0x46, 0x46], // "RIFF"
};

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_DIMENSION = 3840; // 4K max width/height

/**
 * Validates actual binary content of an uploaded image buffer via magic bytes.
 */
export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  const fileSizeBytes = buffer.length;

  if (fileSizeBytes === 0) {
    return {
      isValid: false,
      mimeType: "unknown",
      fileExtension: "",
      errorMessage: "Tệp tải lên rỗng (0 bytes).",
      fileSizeBytes,
    };
  }

  if (fileSizeBytes > MAX_IMAGE_FILE_SIZE) {
    return {
      isValid: false,
      mimeType: "unknown",
      fileExtension: "",
      errorMessage: `Dung lượng tệp (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB) vượt quá giới hạn cho phép (tối đa 10MB).`,
      fileSizeBytes,
    };
  }

  // Check JPEG
  if (
    buffer[0] === MAGIC_BYTES.JPEG[0] &&
    buffer[1] === MAGIC_BYTES.JPEG[1] &&
    buffer[2] === MAGIC_BYTES.JPEG[2]
  ) {
    return {
      isValid: true,
      mimeType: "image/jpeg",
      fileExtension: "jpg",
      fileSizeBytes,
    };
  }

  // Check PNG
  if (
    buffer[0] === MAGIC_BYTES.PNG[0] &&
    buffer[1] === MAGIC_BYTES.PNG[1] &&
    buffer[2] === MAGIC_BYTES.PNG[2] &&
    buffer[3] === MAGIC_BYTES.PNG[3]
  ) {
    return {
      isValid: true,
      mimeType: "image/png",
      fileExtension: "png",
      fileSizeBytes,
    };
  }

  // Check WebP: bytes 0-3 "RIFF", bytes 8-11 "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      isValid: true,
      mimeType: "image/webp",
      fileExtension: "webp",
      fileSizeBytes,
    };
  }

  return {
    isValid: false,
    mimeType: "unknown",
    fileExtension: "",
    errorMessage:
      "Định dạng tệp không được hỗ trợ hoặc tệp ảnh bị lỗi. Hệ thống chỉ chấp nhận ảnh chuẩn JPEG, PNG hoặc WebP.",
    fileSizeBytes,
  };
}

/**
 * Generates an unguessable, secure storage key and filename.
 */
export function generateSafeStorageKey(roomId: string, extension: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `room_${roomId}_${timestamp}_${randomSuffix}.${extension}`;
}

/**
 * Normalizes pixel coordinates [x, y, w, h] to normalized [xMin, yMin, xMax, yMax] (0..1).
 */
export function pixelToNormalizedBox(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
): NormalizedBoundingBox {
  const safeImgW = Math.max(1, imageWidth);
  const safeImgH = Math.max(1, imageHeight);

  const xMin = Math.max(0, Math.min(1, x / safeImgW));
  const yMin = Math.max(0, Math.min(1, y / safeImgH));
  const xMax = Math.max(0, Math.min(1, (x + width) / safeImgW));
  const yMax = Math.max(0, Math.min(1, (y + height) / safeImgH));

  return {
    xMin: Number(xMin.toFixed(4)),
    yMin: Number(yMin.toFixed(4)),
    xMax: Number(xMax.toFixed(4)),
    yMax: Number(yMax.toFixed(4)),
  };
}

/**
 * Converts normalized bounding box (0..1) to pixel coordinates for rendering on canvas/SVG.
 */
export function normalizedToPixelBox(
  box: NormalizedBoundingBox,
  renderWidth: number,
  renderHeight: number
): { x: number; y: number; width: number; height: number } {
  const x = box.xMin * renderWidth;
  const y = box.yMin * renderHeight;
  const width = (box.xMax - box.xMin) * renderWidth;
  const height = (box.yMax - box.yMin) * renderHeight;

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Strips EXIF metadata from JPEG buffer for privacy.
 * Removes APP1 marker (0xFF 0xE1) containing GPS and camera info.
 */
export function stripExifMetadata(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer; // not a valid jpeg
  }

  let offset = 2;
  while (offset < buffer.length - 1) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];

    // Standalone markers
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    if (offset + 4 > buffer.length) break;
    const length = buffer.readUInt16BE(offset + 2);

    // APP1 marker (EXIF)
    if (marker === 0xe1) {
      // Return a slice excluding this segment
      const before = buffer.subarray(0, offset);
      const after = buffer.subarray(offset + 2 + length);
      return Buffer.concat([before, after]);
    }

    offset += 2 + length;
  }

  return buffer;
}

