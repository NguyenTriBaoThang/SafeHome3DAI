import { randomBytes } from "node:crypto";
import { NormalizedBoundingBox } from "./types";
import { imageDimensions } from "./imageMetadata";

export interface ImageValidationResult {
  isValid: boolean;
  mimeType: string;
  fileExtension: string;
  errorMessage?: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
}

// Magic bytes signatures
const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  WEBP: [0x52, 0x49, 0x46, 0x46], // "RIFF"
};

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_DIMENSION = 6000; // Hard dimension cap against pixel flood
export const MAX_IMAGE_PIXELS = 25_000_000; // 25 Megapixels max

const POLYGLOT_SIGNATURES = [
  Buffer.from("PK\x03\x04"), // ZIP archive / polyglot bomb
  Buffer.from("<script", "utf8"),
  Buffer.from("<!DOCTYPE", "utf8"),
  Buffer.from("<html", "utf8"),
];

function containsEmbeddedExecutableOrArchive(buffer: Buffer): boolean {
  const headSlice = buffer.subarray(0, Math.min(buffer.length, 4096));
  const tailSlice = buffer.length > 4096 ? buffer.subarray(buffer.length - 4096) : Buffer.alloc(0);
  for (const sig of POLYGLOT_SIGNATURES) {
    if (headSlice.includes(sig) || (tailSlice.length > 0 && tailSlice.includes(sig))) {
      return true;
    }
  }
  return false;
}

/**
 * Validates actual binary content of an uploaded image buffer via magic bytes,
 * chunk structure, pixel-bomb limits, and polyglot rejection.
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

  if (containsEmbeddedExecutableOrArchive(buffer)) {
    return {
      isValid: false,
      mimeType: "unknown",
      fileExtension: "",
      errorMessage: "Phát hiện tệp giả mạo hoặc chứa mã/lưu trữ nhúng bất hợp lệ.",
      fileSizeBytes,
    };
  }

  // Check JPEG: FF D8 FF followed by valid marker byte (DB, C0..CF, E0..EF, FE, DA, D9)
  if (
    buffer.length >= 4 &&
    buffer[0] === MAGIC_BYTES.JPEG[0] &&
    buffer[1] === MAGIC_BYTES.JPEG[1] &&
    buffer[2] === MAGIC_BYTES.JPEG[2] &&
    (buffer[3] >= 0xc0 || buffer[3] === 0x00)
  ) {
    const dims = imageDimensions(buffer);
    // Reject explicit decompression bombs if SOF dimensions exceed limits
    if (buffer.includes(0xc0) || buffer.includes(0xc2)) {
      if (dims && (dims.width > MAX_IMAGE_DIMENSION || dims.height > MAX_IMAGE_DIMENSION || dims.width * dims.height > MAX_IMAGE_PIXELS)) {
        return {
          isValid: false,
          mimeType: "unknown",
          fileExtension: "",
          errorMessage: "Độ phân giải ảnh vượt quá giới hạn an toàn (25MP).",
          fileSizeBytes,
        };
      }
      // If SOF0/SOF2 exists cleanly with >24 bytes and imageDimensions returned null due to >25MP overflow, reject!
      if (!dims && buffer.length > 64) {
        // Double check raw SOF dimensions without the 25MP cap in imageDimensions
        for (let p = 2; p + 8 < buffer.length; p++) {
          if (buffer[p] === 0xff && (buffer[p + 1] === 0xc0 || buffer[p + 1] === 0xc2)) {
            const h = buffer.readUInt16BE(p + 5);
            const w = buffer.readUInt16BE(p + 7);
            if (w * h > MAX_IMAGE_PIXELS || w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
              return {
                isValid: false,
                mimeType: "unknown",
                fileExtension: "",
                errorMessage: "Độ phân giải ảnh JPEG vượt quá giới hạn an toàn (pixel bomb).",
                fileSizeBytes,
              };
            }
            break;
          }
        }
      }
    }

    return {
      isValid: true,
      mimeType: "image/jpeg",
      fileExtension: "jpg",
      fileSizeBytes,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
    };
  }

  // Check PNG: Full 8-byte signature + valid IHDR chunk
  if (
    buffer.length >= 24 &&
    MAGIC_BYTES.PNG.every((b, idx) => buffer[idx] === b) &&
    buffer.toString("ascii", 12, 16) === "IHDR"
  ) {
    const ihdrLen = buffer.readUInt32BE(8);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (
      ihdrLen !== 13 ||
      width === 0 ||
      height === 0 ||
      width > MAX_IMAGE_DIMENSION ||
      height > MAX_IMAGE_DIMENSION ||
      width * height > MAX_IMAGE_PIXELS
    ) {
      return {
        isValid: false,
        mimeType: "unknown",
        fileExtension: "",
        errorMessage: "Kích thước ảnh PNG không hợp lệ hoặc vượt quá giới hạn an toàn (decompression bomb).",
        fileSizeBytes,
      };
    }

    return {
      isValid: true,
      mimeType: "image/png",
      fileExtension: "png",
      fileSizeBytes,
      width,
      height,
    };
  }

  // Check WebP: bytes 0-3 "RIFF", bytes 8-11 "WEBP"
  if (
    buffer.length >= 16 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const dims = imageDimensions(buffer);
    if (dims && (dims.width > MAX_IMAGE_DIMENSION || dims.height > MAX_IMAGE_DIMENSION || dims.width * dims.height > MAX_IMAGE_PIXELS)) {
      return {
        isValid: false,
        mimeType: "unknown",
        fileExtension: "",
        errorMessage: "Kích thước ảnh WebP vượt quá giới hạn an toàn.",
        fileSizeBytes,
      };
    }
    return {
      isValid: true,
      mimeType: "image/webp",
      fileExtension: "webp",
      fileSizeBytes,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
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
 * Generates a cryptographically unguessable storage key and filename.
 */
export function generateSafeStorageKey(roomId: string, extension: string): string {
  const safeRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  const timestamp = Date.now();
  const csprngSuffix = randomBytes(12).toString("hex");
  return `room_${safeRoom}_${timestamp}_${csprngSuffix}.${extension}`;
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
 * Strips EXIF/GPS/XMP/IPTC metadata and comments from JPEG and PNG buffers.
 */
export function stripExifMetadata(buffer: Buffer): Buffer {
  // PNG chunk stripping: remove eXIf, tEXt, zTXt, iTXt metadata chunks
  if (buffer.length >= 24 && MAGIC_BYTES.PNG.every((b, idx) => buffer[idx] === b)) {
    const pieces: Buffer[] = [buffer.subarray(0, 8)];
    let offset = 8;
    const METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);
    while (offset + 12 <= buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const chunkEnd = offset + 12 + length;
      if (chunkEnd > buffer.length) break;
      const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
      if (!METADATA_CHUNKS.has(chunkType)) {
        pieces.push(buffer.subarray(offset, chunkEnd));
      }
      offset = chunkEnd;
      if (chunkType === "IEND") break;
    }
    return Buffer.concat(pieces);
  }

  // JPEG marker stripping: remove APP1..APP15 (EXIF/GPS/XMP/IPTC) and COM (0xFE) comments
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
  const pieces: Buffer[] = [buffer.subarray(0, 2)];
  let offset = 2;
  while (offset < buffer.length) {
    const start = offset;
    if (buffer[offset] !== 0xff) {
      pieces.push(buffer.subarray(offset));
      break;
    }
    while (offset < buffer.length && buffer[offset] === 0xff) offset++;
    if (offset >= buffer.length) {
      pieces.push(buffer.subarray(start));
      break;
    }
    const marker = buffer[offset++];
    // Keep compressed scan data verbatim; FF E1 there is not an APP1 header.
    if (marker === 0xda || marker === 0xd9) {
      pieces.push(buffer.subarray(start));
      break;
    }
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      pieces.push(buffer.subarray(start, offset));
      continue;
    }
    if (offset + 2 > buffer.length) throw new Error("Truncated JPEG segment");
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) throw new Error("Invalid JPEG segment length");
    const end = offset + length;
    const isSensitiveMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isSensitiveMetadata) {
      pieces.push(buffer.subarray(start, end));
    }
    offset = end;
  }
  return Buffer.concat(pieces);
}
