import type { StructuredCitation } from "@/lib/rag/types";

export interface ItemDangerHotspot {
  id: string;
  number: number;
  title: string;
  description: string;
  coordinates: { x: number; y: number }; // percentage 0 - 100
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  mechanism: string; // Biomechanical mechanism
}

export interface ItemRemediation {
  id: string;
  step: string;
  priority: "IMMEDIATE" | "PREVENTIVE";
  costEstimate: string;
  materialsNeeded: string;
  timeEstimate: string;
}

export interface ItemHazardAssessment {
  id: string;
  itemName: string;
  itemCategory:
    | "rug"
    | "electrical_cable"
    | "chair"
    | "table"
    | "bed"
    | "footwear"
    | "threshold_step"
    | "bathroom_fixture"
    | "clutter"
    | "other";
  riskScore: number; // 0 - 100
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  severityLabel: string;
  urgencyLevel: "KHẨN CẤP" | "ƯU TIÊN CAO" | "CẦN LƯU Ý" | "AN TOÀN";

  // 3 câu hỏi cốt lõi theo yêu cầu người dùng:
  // 1. Mức độ nguy hiểm bao nhiêu? -> riskScore & severityLabel
  // 2. Tại sao nguy hiểm?
  whyDangerous: {
    summary: string;
    biomechanicalRationale: string;
    clinicalReference: string;
    consequenceRisk: string;
  };
  // 3. Nguy hiểm ở chỗ nào?
  whereDangerous: ItemDangerHotspot[];

  // Biện pháp cải thiện thiết thực & chi phí
  remediation: ItemRemediation[];

  citations: StructuredCitation[];
  imageUrl: string;
  analyzedAt: string;
  modelProvider: string;
}

/**
 * Pre-defined sample items for quick evaluation in the UI.
 */
export const SAMPLE_ITEM_PRESETS = [
  {
    id: "sample-rug",
    title: "Thảm trải sàn nỉ phòng khách",
    subtitle: "Mép thảm cong vênh & đế không bám",
    category: "rug",
    suggestedQuery: "Thẩm định độ an toàn của thảm trải sàn này đối với người cao tuổi",
    mockImage: "/samples/rug-hazard.jpg",
  },
  {
    id: "sample-cable",
    title: "Dây điện quạt & ổ cắm vắt ngang lối đi",
    subtitle: "Chướng ngại vật vấp ngã khẩn cấp",
    category: "electrical_cable",
    suggestedQuery: "Tại sao dây điện vắt ngang sàn lại nguy hiểm cho người già?",
    mockImage: "/samples/cable-hazard.jpg",
  },
  {
    id: "sample-chair",
    title: "Ghế đôn gỗ không có tay vịn",
    subtitle: "Khó khăn khi đứng lên & dễ trượt lùi",
    category: "chair",
    suggestedQuery: "Đánh giá nguy cơ ngã khi người cao tuổi dùng ghế đôn không tay vịn",
    mockImage: "/samples/chair-hazard.jpg",
  },
  {
    id: "sample-threshold",
    title: "Gờ bậc cửa nhà vệ sinh cao 2.5cm",
    subtitle: "Chênh lệch cao độ & trơn ướt",
    category: "threshold_step",
    suggestedQuery: "Đánh giá mức độ nguy hiểm của gờ bậc cửa nhà vệ sinh",
    mockImage: "/samples/threshold-hazard.jpg",
  },
  {
    id: "sample-table",
    title: "Bàn học / Bàn làm việc góc nhọn chân sắt",
    subtitle: "Góc vuông 90° & chân kim loại trơn trượt",
    category: "table",
    suggestedQuery: "Khắc phục góc bàn vuông nhọn trên lối đi như thế nào?",
    mockImage: "/samples/table-hazard.jpg",
  },
];

