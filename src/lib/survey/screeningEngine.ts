import { StructuredAnswer, SurveyFindingItem, FindingPriority } from "./types";

export interface ScreeningRule {
  ruleId: string;
  roomType: "BEDROOM" | "BATHROOM" | "ALL";
  title: string;
  category: string;
  priority: FindingPriority;
  priorityLabel: string;
  evaluate: (answers: Record<string, StructuredAnswer>) => {
    triggered: boolean;
    evidenceText?: string;
  };
  explanation: string;
  suggestedAction: string;
  supportingSourceIds: string[];
}

export const SCREENING_RULES: ScreeningRule[] = [
  // 1. RULE_BED_001: Unsecured rug
  {
    ruleId: "RULE_BED_001",
    roomType: "BEDROOM",
    title: "Thảm trải sàn phòng ngủ chưa được cố định chống trượt",
    category: "RUG",
    priority: "CAN_UU_TIEN_KIEM_TRA",
    priorityLabel: "Cần ưu tiên kiểm tra",
    evaluate: (answers) => {
      const hasRug = answers["BED_006"]?.value === "YES";
      const isSecured = answers["BED_007"]?.value;
      if (hasRug && isSecured === "NO") {
        return {
          triggered: true,
          evidenceText: "Gia đình ghi nhận có thảm trải sàn trong phòng ngủ nhưng thảm chưa được cố định chắc chắn, dễ bị xô lệch hoặc cong mép.",
        };
      }
      return { triggered: false };
    },
    explanation:
      "Thảm không cố định là một trong những nguyên nhân hàng đầu gây trượt và vấp ngã ở người cao tuổi khi đi lại bằng dép trong nhà hoặc chân trần.",
    suggestedAction:
      "Sử dụng băng dính cố định mép thảm chuyên dụng hoặc thay thế bằng loại thảm có đế cao su chống trượt bám chặt vào mặt sàn.",
    supportingSourceIds: ["SRC_WHO_2021", "SRC_CDC_STEADI_2023"],
  },

  // 2. RULE_BED_002: Electrical cable on walkway
  {
    ruleId: "RULE_BED_002",
    roomType: "BEDROOM",
    title: "Dây điện hoặc dây sạc nằm trên lối đi phòng ngủ",
    category: "CABLE",
    priority: "CAN_UU_TIEN_KIEM_TRA",
    priorityLabel: "Cần ưu tiên kiểm tra",
    evaluate: (answers) => {
      if (answers["BED_008"]?.value === "YES") {
        return {
          triggered: true,
          evidenceText: "Ghi nhận có dây điện hoặc dây sạc nằm trên sàn tại khu vực lối đi trong phòng ngủ.",
        };
      }
      return { triggered: false };
    },
    explanation:
      "Dây dẫn vắt ngang lối đi tạo thành bẫy vấp chân nguy hiểm, đặc biệt vào ban đêm khi thị lực của người cao tuổi bị hạn chế.",
    suggestedAction:
      "Thu gọn dây dẫn, sử dụng nẹp luồn dây cố định sát chân tường hoặc di chuyển ổ cắm điện đến vị trí gần thiết bị.",
    supportingSourceIds: ["SRC_CDC_STEADI_2023"],
  },

  // 3. RULE_BED_003: Walkway obstructed by furniture
  {
    ruleId: "RULE_BED_003",
    roomType: "BEDROOM",
    title: "Lối đi từ giường đến cửa bị cản trở bởi đồ đạc",
    category: "OBSTACLE",
    priority: "CAN_UU_TIEN_KIEM_TRA",
    priorityLabel: "Cần ưu tiên kiểm tra",
    evaluate: (answers) => {
      if (answers["BED_009"]?.value === "YES") {
        const types = answers["BED_010"]?.value;
        const details = Array.isArray(types) && types.length > 0 ? ` (Vật cản: ${types.join(", ")})` : "";
        return {
          triggered: true,
          evidenceText: `Lối đi từ giường đến cửa phòng ngủ bị cản trở bởi đồ đạc hoặc có bề rộng không đảm bảo${details}.`,
        };
      }
      return { triggered: false };
    },
    explanation:
      "Lối đi hẹp hoặc bừa bộn đồ vật gây khó khăn cho việc di chuyển, đặc biệt khi người già cần thức dậy đi vệ sinh nhanh vào ban đêm.",
    suggestedAction:
      "Sắp xếp lại bàn ghế, giải phóng mặt sàn để tạo hành lang thông thủy rộng tối thiểu từ 80 - 90 cm.",
    supportingSourceIds: ["SRC_CDC_STEADI_2023"],
  },

  // 4. RULE_BED_004: Inadequate nighttime lighting
  {
    ruleId: "RULE_BED_004",
    roomType: "BEDROOM",
    title: "Ánh sáng ban đêm từ giường đến cửa chưa đảm bảo an toàn",
    category: "LIGHTING",
    priority: "CAN_UU_TIEN_KIEM_TRA",
    priorityLabel: "Cần ưu tiên kiểm tra",
    evaluate: (answers) => {
      const poorNightLight = answers["BED_004"]?.value === "NO";
      const noBedsideLight = answers["BED_005"]?.value === "NO";
      if (poorNightLight || noBedsideLight) {
        return {
          triggered: true,
          evidenceText: `Ghi nhận lối đi ban đêm thiếu sáng${poorNightLight ? " (Lối đi tối)" : ""}${noBedsideLight ? " (Không có đèn đầu giường)" : ""}.`,
        };
      }
      return { triggered: false };
    },
    explanation:
      "Mắt người cao tuổi cần thời gian thích nghi bóng tối lâu hơn và cần độ sáng gấp 3-4 lần so với người trẻ để phân biệt chướng ngại vật.",
    suggestedAction:
      "Bố trí đèn ngủ dịu nhẹ (30-50 lux) hoặc đèn LED cảm biến chuyển động dọc chân tường, kết hợp công tắc đèn ngay tầm tay cạnh giường.",
    supportingSourceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
  },

  // 5. RULE_BATH_001: Wet and slippery floor
  {
    ruleId: "RULE_BATH_001",
    roomType: "BATHROOM",
    title: "Sàn nhà vệ sinh thường xuyên bị ướt hoặc có cảm giác trơn trượt",
    category: "BATH_SLIP",
    priority: "CAN_UU_TIEN_KIEM_TRA",
    priorityLabel: "Cần ưu tiên kiểm tra",
    evaluate: (answers) => {
      const wet = answers["BATH_003"]?.value === "YES";
      const slippery = answers["BATH_004"]?.value === "YES";
      if (wet || slippery) {
        return {
          triggered: true,
          evidenceText: `Sàn nhà vệ sinh được ghi nhận ${wet ? "thường xuyên bị ướt/đọng nước" : ""}${wet && slippery ? " và " : ""}${slippery ? "dễ trơn trượt khi di chuyển" : ""}.`,
        };
      }
      return { triggered: false };
    },
    explanation:
      "Gạch men sàn nhà tắm khi đọng nước và xà phòng làm suy giảm nghiêm trọng lực ma sát, là khu vực xảy ra các vụ ngã gây chấn thương nặng nề nhất.",
    suggestedAction:
      "Lắp đặt thảm chống trượt có giác hút cao su bám chặt mặt sàn hoặc phủ dung dịch tăng ma sát chống trượt chuyên dụng, đồng thời thông tắc phễu thoát sàn.",
    supportingSourceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
  },

  // 6. RULE_BATH_002: Absent or unchecked grab bars
  {
    ruleId: "RULE_BATH_002",
    roomType: "BATHROOM",
    title: "Chưa lắp đặt thanh tay vịn an toàn hoặc tay vịn chưa được kiểm tra độ chịu lực",
    category: "GRAB_BAR",
    priority: "NEN_XEM_XET_CAI_THIEN",
    priorityLabel: "Nên xem xét cải thiện",
    evaluate: (answers) => {
      const noGrab = answers["BATH_005"]?.value === "NO";
      const notChecked = answers["BATH_007"]?.value === "NOT_CHECKED";
      if (noGrab || notChecked) {
        return {
          triggered: true,
          evidenceText: noGrab
            ? "Nhà vệ sinh hiện chưa được trang bị bất kỳ thanh tay vịn nào để hỗ trợ người cao tuổi."
            : "Tay vịn hiện có chưa được kiểm tra khả năng chịu lực hoặc có dấu hiệu lỏng lẻo.",
        };
      }
      return { triggered: false };
    },
    explanation:
      "Thanh tay vịn hỗ trợ người cao tuổi tì tựa lực tay khi đứng lên từ bồn cầu hoặc khi bước chân qua các khu vực ướt, giảm tải cho khớp gối yếu.",
    suggestedAction:
      "Lắp đặt thanh tay vịn inox chống trượt đường kính 32-38mm, gia cố bằng bu-lông chịu lực tối thiểu 110-150 kg cạnh bồn cầu và buồng tắm.",
    supportingSourceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
  },

  // 7. RULE_BATH_003: Poor bathroom lighting
  {
    ruleId: "RULE_BATH_003",
    roomType: "BATHROOM",
    title: "Ánh sáng nhà vệ sinh chưa đủ sáng để quan sát rõ",
    category: "LIGHTING",
    priority: "NEN_XEM_XET_CAI_THIEN",
    priorityLabel: "Nên xem xét cải thiện",
    evaluate: (answers) => {
      if (answers["BATH_008"]?.value === "NO") {
        return {
          triggered: true,
          evidenceText: "Ánh sáng trong nhà vệ sinh chưa đủ rõ để quan sát các góc khuất hoặc vũng nước đọng dưới sàn.",
        };
      }
      return { triggered: false };
    },
    explanation:
      "Độ sáng không đồng đều hoặc góc tối trong nhà vệ sinh khiến người già khó nhận biết các vũng nước hoặc chướng ngại vật trên sàn.",
    suggestedAction:
      "Nâng cấp bóng đèn LED chống ẩm có độ rọi tối thiểu 150-200 lux, phân bố ánh sáng đều giữa khu vực bồn cầu và buồng tắm.",
    supportingSourceIds: ["SRC_WHO_2021"],
  },

  // 8. RULE_BATH_004: Obstacles or level differences at bathroom entrance
  {
    ruleId: "RULE_BATH_004",
    roomType: "BATHROOM",
    title: "Có bậc thềm chênh cao hoặc vật dụng cản trở lối vào nhà vệ sinh",
    category: "OBSTACLE",
    priority: "NEN_XEM_XET_CAI_THIEN",
    priorityLabel: "Nên xem xét cải thiện",
    evaluate: (answers) => {
      const obst = answers["BATH_009"]?.value === "YES";
      const step = answers["BATH_010"]?.value === "YES";
      if (obst || step) {
        return {
          triggered: true,
          evidenceText: `Lối vào nhà vệ sinh ghi nhận ${step ? "có bậc thềm chênh cao hoặc gờ cửa" : ""}${step && obst ? " và " : ""}${obst ? "có vật dụng cản trở ra vào" : ""}.`,
        };
      }
      return { triggered: false };
    },
    explanation:
      "Gờ cửa hoặc bậc thềm dễ gây vấp ngón chân khi bước vào trong tình trạng ngái ngủ hoặc thị lực suy giảm.",
    suggestedAction:
      "Lắp thanh nẹp dốc thoai thoải (ramp) bằng cao su tại gờ cửa, dán decal phản quang màu tương phản cảnh báo bậc thềm và dọn sạch xô chậu.",
    supportingSourceIds: ["SRC_CDC_STEADI_2023", "SRC_BYT_VN_2020"],
  },
];

/**
 * Runs the transparent rule-based screening engine against recorded survey answers.
 */
export function screenRoomHazards(
  roomType: string,
  answersMap: Record<string, StructuredAnswer>
): SurveyFindingItem[] {
  const findings: SurveyFindingItem[] = [];

  const applicableRules = SCREENING_RULES.filter(
    (rule) => rule.roomType === roomType || rule.roomType === "ALL"
  );

  for (const rule of applicableRules) {
    const result = rule.evaluate(answersMap);
    if (result.triggered) {
      findings.push({
        ruleId: rule.ruleId,
        title: rule.title,
        category: rule.category,
        priority: rule.priority,
        priorityLabel: rule.priorityLabel,
        observedEvidence: result.evidenceText || "Ghi nhận từ câu trả lời khảo sát thực tế.",
        explanation: rule.explanation,
        suggestedAction: rule.suggestedAction,
        supportingSourceIds: rule.supportingSourceIds,
      });
    }
  }

  return findings;
}

