import type { DetectionCategory, VisionDetection } from "./types";

export const furniture: [string, DetectionCategory, string, string?][] = [
  ["a bed", "bed", "Giường ngủ"],
  ["a flat screen television", "other", "TV", "tv"],
  ["a window", "other", "Cửa sổ", "window"],
  ["curtains", "other", "Rèm cửa", "curtain"],
  ["a mirror", "other", "Gương", "mirror"],
  ["a bedside table", "nightstand", "Tủ đầu giường"],
  ["a chest of drawers", "cabinet", "Tủ ngăn kéo"],
  ["a television console cabinet", "cabinet", "Kệ TV", "media_console"],
  ["a wardrobe", "cabinet", "Tủ quần áo", "wardrobe"],
  ["a desk", "table", "Bàn", "desk"],
  ["a stool", "chair", "Ghế đẩu", "stool"],
  ["a chair", "chair", "Ghế"],
  ["a sofa", "sofa", "Sofa"],
  ["an area rug", "rug", "Thảm"],
  ["a potted plant", "other", "Chậu cây", "plant"],
  ["a toilet", "toilet", "Bồn cầu"],
  ["a sink", "sink", "Bồn rửa"],
  ["a shower enclosure", "bathtub", "Buồng tắm", "shower"],
];

export function estimateWall(modelType: string, centerX: number): VisionDetection["placementWall"] {
  if (!["bed", "tv", "window", "curtain", "mirror", "cabinet", "wardrobe", "media_console"].includes(modelType)) return "free";
  return centerX < 1 / 3 ? "left" : centerX > 2 / 3 ? "right" : "back";
}
