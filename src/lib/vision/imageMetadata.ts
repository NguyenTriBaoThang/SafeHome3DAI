/** Header dimensions only; unknown dimensions stay null, never a default resolution. */
export function imageDimensions(b: Buffer): { width: number; height: number } | null {
  let width = 0, height = 0;
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.toString("ascii", 12, 16) === "IHDR") {
    width = b.readUInt32BE(16); height = b.readUInt32BE(20);
  } else if (b[0] === 255 && b[1] === 216) {
    let p = 2;
    while (p + 4 <= b.length && b[p] === 255) {
      const marker = b[p + 1]; if (marker === 218 || marker === 217) break;
      const length = b.readUInt16BE(p + 2); if (length < 2 || p + 2 + length > b.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker) && length >= 8) {
        height = b.readUInt16BE(p + 5); width = b.readUInt16BE(p + 7); break;
      }
      p += length + 2;
    }
  } else if (b.length >= 30 && b.toString("ascii", 8, 12) === "WEBP") {
    const type = b.toString("ascii", 12, 16);
    if (type === "VP8X") { width = b.readUIntLE(24, 3) + 1; height = b.readUIntLE(27, 3) + 1; }
    if (type === "VP8 " && b[23] === 157 && b[24] === 1 && b[25] === 42) { width = b.readUInt16LE(26) & 16383; height = b.readUInt16LE(28) & 16383; }
    if (type === "VP8L" && b[20] === 47) { const bits = b.readUInt32LE(21); width = (bits & 16383) + 1; height = ((bits >>> 14) & 16383) + 1; }
  }
  return width > 0 && height > 0 && width * height <= 25_000_000 ? { width, height } : null;
}
