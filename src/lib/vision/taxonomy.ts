import { DetectionCategory } from "./types";

export interface CategoryMetadata {
  category: DetectionCategory;
  vietnameseName: string;
  description: string;
  isStandardCocoClass: boolean;
  requiresSpecializedReview: boolean;
  colorHex: string;
  iconName: string;
}

export const CATEGORY_TAXONOMY: Record<DetectionCategory, CategoryMetadata> = {
  bed: {
    category: "bed",
    vietnameseName: "Giường ngủ",
    description: "Khu vực nghỉ ngơi chính, tâm điểm đánh giá tiếp cận ban đêm",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#3b82f6", // blue-500
    iconName: "Bed",
  },
  chair: {
    category: "chair",
    vietnameseName: "Ghế ngồi / Ghế đẩu",
    description: "Ghế sinh hoạt; nếu nằm trên luồng di chuyển có thể là vật cản",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#f59e0b", // amber-500
    iconName: "Armchair",
  },
  table: {
    category: "table",
    vietnameseName: "Bàn / Bàn trà",
    description: "Bàn sinh hoạt hoặc bàn trà cạnh giường có góc nhọn",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#8b5cf6", // purple-500
    iconName: "Table",
  },
  cabinet: {
    category: "cabinet",
    vietnameseName: "Tủ quần áo / Tủ đồ",
    description: "Tủ lưu trữ đồ đạc lớn",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#64748b", // slate-500
    iconName: "Archive",
  },
  nightstand: {
    category: "nightstand",
    vietnameseName: "Tab đầu giường",
    description: "Tủ tab cạnh giường chứa đèn ngủ và vật dụng thiết yếu",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#06b6d4", // cyan-500
    iconName: "Package",
  },
  door: {
    category: "door",
    vietnameseName: "Cửa ra vào / Cửa phòng",
    description: "Vị trí giao cắt và bắt đầu tuyến di chuyển chính",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#6366f1", // indigo-500
    iconName: "DoorOpen",
  },
  toilet: {
    category: "toilet",
    vietnameseName: "Bồn cầu vệ sinh",
    description: "Khu vực trọng yếu cần thanh tay vịn trợ lực đứng - ngồi",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#0d9488", // teal-600
    iconName: "Bath",
  },
  sink: {
    category: "sink",
    vietnameseName: "Chậu rửa mặt / Lavabo",
    description: "Khu vực vệ sinh cá nhân, bề mặt sứ dễ gây chấn thương nếu va đập",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#0284c7", // sky-600
    iconName: "Droplet",
  },
  bathtub: {
    category: "bathtub",
    vietnameseName: "Bồn tắm / Sen tắm",
    description: "Vùng ẩm ướt trơn trượt có nguy cơ té ngã gãy xương cao nhất",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#e11d48", // rose-600
    iconName: "ShowerHead",
  },
  sofa: {
    category: "sofa",
    vietnameseName: "Ghế Sofa",
    description: "Nội thất phòng khách",
    isStandardCocoClass: true,
    requiresSpecializedReview: false,
    colorHex: "#d97706", // amber-600
    iconName: "Armchair",
  },
  rug: {
    category: "rug",
    vietnameseName: "Thảm trải sàn",
    description: "Thảm trang trí hoặc thảm lau chân có nguy cơ trượt xô lệch (RISK-001)",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#f43f5e", // rose-500
    iconName: "Layers",
  },
  electrical_cable: {
    category: "electrical_cable",
    vietnameseName: "Dây điện / Dây sạc",
    description: "Dây dẫn nguồn vắt ngang mặt sàn tạo bẫy vấp ngón chân (RISK-002)",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#dc2626", // red-600
    iconName: "Zap",
  },
  grab_bar: {
    category: "grab_bar",
    vietnameseName: "Thanh tay vịn an toàn",
    description: "Thiết bị trợ lực chống ngã gắn tường nhà vệ sinh (RISK-006)",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#10b981", // emerald-500
    iconName: "ShieldCheck",
  },
  obstacle_route: {
    category: "obstacle_route",
    vietnameseName: "Vật cản lối đi",
    description: "Đồ đạc làm hẹp hành lang thông thủy dưới 0.85m (RISK-003)",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#ea580c", // orange-600
    iconName: "AlertTriangle",
  },
  threshold_step: {
    category: "threshold_step",
    vietnameseName: "Gờ bậc cửa",
    description: "Độ chênh cốt nền tại lối ra vào nhà tắm hoặc phòng (RISK-007)",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#ca8a04", // yellow-600
    iconName: "ChevronUp",
  },
  lamp: {
    category: "lamp",
    vietnameseName: "Đèn chiếu sáng",
    description: "Bộ đèn bàn, đèn ngủ, đèn đứng, đèn tường hoặc đèn trần nhìn thấy được; không gồm cửa sổ hay phản chiếu. Không suy ra lux hoặc tình trạng chiếu sáng ban đêm từ sự hiện diện của đèn (RISK-004).",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#eab308",
    iconName: "Lamp",
  },
  light_switch: {
    category: "light_switch",
    vietnameseName: "Công tắc đèn",
    description: "Mặt công tắc điều khiển đèn gắn tường nhìn thấy rõ; không gồm ổ cắm, phích cắm, aptomat hoặc điều khiển từ xa. Không suy ra khả năng với tới từ giường khi thiếu đo đạc hoặc xác nhận (RISK-008).",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#a855f7",
    iconName: "ToggleLeft",
  },
  other: {
    category: "other",
    vietnameseName: "Vật thể khác",
    description: "Đồ dùng hoặc vật dụng gia đình khác",
    isStandardCocoClass: false,
    requiresSpecializedReview: true,
    colorHex: "#94a3b8", // slate-400
    iconName: "HelpCircle",
  },
};

/**
 * Maps any raw predicted label (from COCO, VLM, or free text) to a SafeHome category.
 */
export function normalizePredictedLabel(rawLabel: string): {
  category: DetectionCategory;
  vietnameseName: string;
  isSpecializedFallback: boolean;
} {
  const clean = rawLabel.toLowerCase().trim();

  // Specific controls must precede broad furniture/room keywords.
  if (clean === "light_switch" || clean.includes("light switch") || clean.includes("công tắc đèn")) {
    return { category: "light_switch", vietnameseName: "Công tắc đèn", isSpecializedFallback: true };
  }
  if (clean === "lamp" || clean.includes(" lamp") || clean.startsWith("lamp ") || clean.includes("đèn ngủ") || clean.includes("đèn bàn") || clean.includes("đèn trần") || clean.includes("đèn đứng") || clean.includes("đèn tường")) {
    return { category: "lamp", vietnameseName: "Đèn chiếu sáng", isSpecializedFallback: true };
  }

  // 1. Bed
  if (clean.includes("bed") || clean.includes("giường") || clean.includes("nệm")) {
    return { category: "bed", vietnameseName: "Giường ngủ", isSpecializedFallback: false };
  }

  // 2. Chair / Stool
  if (clean.includes("chair") || clean.includes("ghế") || clean.includes("stool") || clean.includes("bench")) {
    return { category: "chair", vietnameseName: "Ghế ngồi / Ghế đẩu", isSpecializedFallback: false };
  }

  // 3. Sofa
  if (clean.includes("sofa") || clean.includes("couch")) {
    return { category: "sofa", vietnameseName: "Ghế Sofa", isSpecializedFallback: false };
  }

  // 4. Grab bar (check before bathtub so "bathroom grab bar" is correctly recognized)
  if (clean.includes("grab") || clean.includes("tay vịn") || clean.includes("handrail") || clean.includes("bar")) {
    return { category: "grab_bar", vietnameseName: "Thanh tay vịn an toàn", isSpecializedFallback: true };
  }

  // 5. Table (check before nightstand so "dining table" is recognized as table)
  if (clean.includes("table") || clean.includes("bàn") || clean.includes("desk")) {
    if (clean.includes("night") || clean.includes("đầu giường") || clean.includes("bedside")) {
      return { category: "nightstand", vietnameseName: "Tab đầu giường", isSpecializedFallback: true };
    }
    return { category: "table", vietnameseName: "Bàn / Bàn trà", isSpecializedFallback: false };
  }

  // 6. Nightstand
  if (clean.includes("nightstand") || clean.includes("đầu giường") || clean.includes("tab ") || clean === "tab") {
    return { category: "nightstand", vietnameseName: "Tab đầu giường", isSpecializedFallback: true };
  }

  // 6. Cabinet / Wardrobe
  if (clean.includes("cabinet") || clean.includes("tủ") || clean.includes("wardrobe") || clean.includes("cupboard") || clean.includes("refrigerator")) {
    return { category: "cabinet", vietnameseName: "Tủ đồ / Tủ quần áo", isSpecializedFallback: false };
  }

  // 7. Door
  if (clean.includes("door") || clean.includes("cửa")) {
    return { category: "door", vietnameseName: "Cửa phòng", isSpecializedFallback: true };
  }

  // 8. Toilet
  if (clean.includes("toilet") || clean.includes("bồn cầu") || clean.includes("wc")) {
    return { category: "toilet", vietnameseName: "Bồn cầu vệ sinh", isSpecializedFallback: false };
  }

  // 9. Sink / Lavabo
  if (clean.includes("sink") || clean.includes("lavabo") || clean.includes("bồn rửa")) {
    return { category: "sink", vietnameseName: "Chậu rửa mặt / Lavabo", isSpecializedFallback: false };
  }

  // 10. Bathtub / Shower
  if (clean.includes("bath") || clean.includes("shower") || clean.includes("sen tắm") || clean.includes("bồn tắm")) {
    return { category: "bathtub", vietnameseName: "Bồn tắm / Sen tắm", isSpecializedFallback: false };
  }

  // 11. Rug / Carpet
  if (clean.includes("rug") || clean.includes("carpet") || clean.includes("thảm") || clean.includes("mat")) {
    return { category: "rug", vietnameseName: "Thảm trải sàn", isSpecializedFallback: true };
  }

  // 12. Cable / Wire
  if (clean.includes("cable") || clean.includes("wire") || clean.includes("dây") || clean.includes("cord")) {
    return { category: "electrical_cable", vietnameseName: "Dây điện / Dây sạc", isSpecializedFallback: true };
  }

  // 13. Grab bar
  if (clean.includes("grab") || clean.includes("tay vịn") || clean.includes("handrail") || clean.includes("bar")) {
    return { category: "grab_bar", vietnameseName: "Thanh tay vịn an toàn", isSpecializedFallback: true };
  }

  // 14. Obstacle
  if (clean.includes("obstacle") || clean.includes("vật cản") || clean.includes("box") || clean.includes("thùng")) {
    return { category: "obstacle_route", vietnameseName: "Vật cản lối đi", isSpecializedFallback: true };
  }

  // 15. Threshold step
  if (clean.includes("step") || clean.includes("threshold") || clean.includes("bậc") || clean.includes("gờ")) {
    return { category: "threshold_step", vietnameseName: "Gờ bậc cửa", isSpecializedFallback: true };
  }

  return { category: "other", vietnameseName: "Vật thể khác", isSpecializedFallback: true };
}
