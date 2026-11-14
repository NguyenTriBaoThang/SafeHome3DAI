import {
  AssessmentInput,
  RuleEvaluationResult,
  RuleEvaluationState,
  FindingPriority,
  RiskFinding,
  RiskRecommendation,
  ActionCategory,
  TraceabilityStep,
} from "./types";

export interface VersionedRiskRule {
  id: string;                  // e.g. "RISK-001"
  version: string;             // "1.0.0"
  name: string;                // Tên quy tắc
  category: ActionCategory;    // Nhóm hành động
  defaultPriority: FindingPriority;
  applicableRoomTypes: Array<"BEDROOM" | "BATHROOM" | "LIVING_ROOM" | "KITCHEN" | "HALLWAY">;
  evaluate: (input: AssessmentInput) => RuleEvaluationResult;
}

// =====================================================================
// RULE 1: RISK-001 — Unsecured Rug (Thảm trải sàn không cố định)
// =====================================================================
export const ruleRisk001: VersionedRiskRule = {
  id: "RISK-001",
  version: "1.0.0",
  name: "Thảm trải sàn không cố định mép / có nguy cơ trượt dịch",
  category: "SECURE_RUG",
  defaultPriority: "HIGH",
  applicableRoomTypes: ["BEDROOM", "LIVING_ROOM", "HALLWAY"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    const isApplicable = ruleRisk001.applicableRoomTypes.includes(input.roomType);
    if (!isApplicable) {
      return {
        ruleId: "RISK-001",
        ruleName: ruleRisk001.name,
        version: ruleRisk001.version,
        state: "NOT_APPLICABLE",
        priority: "LOW",
        priorityRationale: `Quy tắc thảm trải sàn khô không áp dụng trọng tâm cho không gian ${input.roomName}.`,
        evidence: {
          measuredValue: "Không áp dụng",
          threshold: "Chỉ kiểm định tại phòng ngủ, phòng khách và hành lang",
          rationale: "Không có thảm sàn sinh hoạt tại khu vực này.",
          sourceFields: ["roomType"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_WHO_2021"],
      };
    }

    if (input.rugs.present === null) {
      return {
        ruleId: "RISK-001",
        ruleName: ruleRisk001.name,
        version: ruleRisk001.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa đủ dữ liệu khảo sát xác nhận sự hiện diện hoặc đặc tính cố định của thảm trải sàn.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Yêu cầu xác nhận: Có thảm hay không và mép thảm có băng dán cố định không",
          rationale: "Cần kiểm tra trực tiếp hiện trường hoặc hỏi thêm người nhà.",
          sourceFields: ["rugs.present"],
          missingFields: ["rugs.present", "rugs.items.isSecured"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    if (!input.rugs.present || input.rugs.items.length === 0) {
      return {
        ruleId: "RISK-001",
        ruleName: ruleRisk001.name,
        version: ruleRisk001.version,
        state: "NOT_DETECTED",
        priority: "LOW",
        priorityRationale: "Không có thảm sàn hoặc sàn nhà phong quang không có nguy cơ trượt thảm.",
        evidence: {
          measuredValue: "Không sử dụng thảm trải sàn lỏng lẻo",
          threshold: "Sàn không có thảm lỏng lẻo hoặc thảm đã cố định 100%",
          rationale: "Không ghi nhận nguy cơ trượt ngã do mép thảm quăn hoặc xê dịch.",
          sourceFields: ["rugs.present"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    // Check rug details
    const unSecuredRugs = input.rugs.items.filter((r) => !r.isSecured || r.edgesCurled);
    if (unSecuredRugs.length > 0) {
      const targetRug = unSecuredRugs[0];
      const isWalkway = targetRug.inWalkway;
      const priority: FindingPriority = isWalkway ? "HIGH" : "MEDIUM";
      const priorityRationale = isWalkway
        ? "Mức ưu tiên CAO vì tấm thảm không cố định nằm trực tiếp trên luồng di chuyển chính, dễ bị quăn mép khi người cao tuổi lê gót chân."
        : "Mức ưu tiên VỪA vì thảm chưa cố định nhưng nằm ở góc phụ ít di chuyển liên tục.";

      const findingId = `finding-risk001-${input.roomId}`;
      const finding: RiskFinding = {
        id: findingId,
        ruleId: "RISK-001",
        title: `Thảm trải sàn "${targetRug.name}" chưa cố định chống trượt`,
        hazardType: "LOOSE_RUG",
        description: `Tấm thảm tại vị trí "${targetRug.location}" không có lớp lót cao su chống xê dịch hoặc băng dính 2 mặt chuyên dụng cố định 4 mép.`,
        severityCategory: priority,
        evidence: {
          measuredValue: `Vị trí: ${targetRug.location}, Cố định: Không, Mép quăn: ${targetRug.edgesCurled ? "Có" : "Không"}`,
          threshold: "Mép thảm phải dán cố định hoàn toàn hoặc sử dụng thảm có đế cao su chống trượt DCOF >= 0.42",
          rationale: "Người cao tuổi có xu hướng nhấc chân thấp khi đi lại; mép thảm quăn hoặc thảm trượt dịch bất ngờ là nguyên nhân hàng đầu gây té ngã tại nhà.",
          sourceFields: ["rugs.items.isSecured", "rugs.items.edgesCurled", "rugs.items.inWalkway"],
          affectedObjectId: targetRug.id,
          affectedObjectName: targetRug.name,
        },
        recommendationText: "Loại bỏ hoàn toàn thảm trang trí không cần thiết, hoặc sử dụng băng keo dán mép thảm chống xê dịch và bổ sung lớp lót cao su chống trượt bên dưới.",
        targetObjectId: targetRug.id,
        status: "ACTIVE",
        referenceIds: ["SRC_WHO_2021", "SRC_CDC_STEADI_2023", "SRC_BYT_VN_2020"],
        traceabilityTrail: [
          {
            stepIndex: 1,
            stage: "SURVEY_ANSWER",
            title: "Câu trả lời khảo sát thảm trải sàn",
            description: "Ghi nhận phòng có sử dụng thảm trải sàn và mép thảm chưa được dán cố định.",
            data: { rugsPresent: true, isSecured: false },
          },
          {
            stepIndex: 2,
            stage: "ROOM_PROFILE_FIELD",
            title: "Thuộc tính hồ sơ RoomProfile.rugs",
            description: "Dữ liệu được chuẩn hóa vào trường rugs với trạng thái chưa cố định.",
            data: { location: targetRug.location, inWalkway: isWalkway },
          },
          {
            stepIndex: 3,
            stage: "DETECTION_RULE",
            title: "Quy tắc kiểm định RISK-001 v1.0.0",
            description: "Kích hoạt trạng thái DETECTED do vi phạm điều kiện mép thảm tự do.",
            data: { ruleId: "RISK-001", evaluatedState: "DETECTED" },
          },
          {
            stepIndex: 4,
            stage: "PRIORITY_DECISION",
            title: "Xác định mức ưu tiên",
            description: priorityRationale,
            data: { priority },
          },
          {
            stepIndex: 5,
            stage: "EVIDENCE_SOURCE",
            title: "Căn cứ khoa học WHO & CDC STEADI",
            description: "Hướng dẫn phòng ngừa té ngã WHO 2021 mục 4.2 và CDC STEADI Home Assessment Checklist mục Rugs.",
            data: { referenceIds: ["SRC_WHO_2021", "SRC_CDC_STEADI_2023"] },
          },
        ],
      };

      const recommendation: RiskRecommendation = {
        id: `rec-risk001-${input.roomId}`,
        findingId,
        title: "Cố định 4 mép thảm hoặc thay thế bằng thảm đế cao su",
        actionCategory: "SECURE_RUG",
        priority,
        practicalSteps: [
          "Bóc lớp nẹp hoặc dán dải băng dính 2 mặt chuyên dụng (carpet tape) dọc theo 4 cạnh thảm.",
          "Đặt tấm lót lưới cao su chống trượt có kích thước vừa vặn bên dưới toàn bộ bề mặt thảm.",
          "Nếu người cao tuổi sử dụng gậy chống hoặc khung tập đi, khuyến nghị cất bỏ thảm để mặt sàn bằng phẳng tuyệt đối.",
        ],
        estimatedCost: "50.000 - 150.000 VNĐ",
        difficulty: "EASY_DIY",
        status: "PENDING",
        referenceIds: ["SRC_CDC_STEADI_2023", "SRC_BYT_VN_2020"],
      };

      return {
        ruleId: "RISK-001",
        ruleName: ruleRisk001.name,
        version: ruleRisk001.version,
        state: "DETECTED",
        priority,
        priorityRationale,
        evidence: finding.evidence,
        finding,
        recommendation,
        supportingSourceIds: ["SRC_WHO_2021", "SRC_CDC_STEADI_2023", "SRC_BYT_VN_2020"],
      };
    }

    return {
      ruleId: "RISK-001",
      ruleName: ruleRisk001.name,
      version: ruleRisk001.version,
      state: "NOT_DETECTED",
      priority: "LOW",
      priorityRationale: "Tất cả thảm trải sàn đã được cố định mép và có lớp chống trượt an toàn.",
      evidence: {
        measuredValue: "Thảm đã cố định 4 mép, không có góc quăn",
        threshold: "Thảm cố định hoàn toàn vào bề mặt sàn",
        rationale: "Thảm phẳng, bám chắc sàn không gây vấp ngón chân.",
        sourceFields: ["rugs.items.isSecured"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: ["SRC_CDC_STEADI_2023"],
    };
  },
};

// =====================================================================
// RULE 2: RISK-002 — Electrical Cable on Walkway (Dây điện ngang lối đi)
// =====================================================================
export const ruleRisk002: VersionedRiskRule = {
  id: "RISK-002",
  version: "1.0.0",
  name: "Dây điện hoặc cáp thiết bị vắt ngang lối đi thông thủy",
  category: "REROUTE_CABLE",
  defaultPriority: "HIGH",
  applicableRoomTypes: ["BEDROOM", "LIVING_ROOM", "HALLWAY", "KITCHEN"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    if (input.cables.crossingWalkway === null) {
      return {
        ruleId: "RISK-002",
        ruleName: ruleRisk002.name,
        version: ruleRisk002.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa có thông tin khảo sát về đường đi của dây nguồn thiết bị điện tử hoặc sạc điện thoại.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Lối đi bộ thông thủy không được có dây điện trần cắt ngang",
          rationale: "Cần kiểm tra tuyến ổ cắm đến các thiết bị điện.",
          sourceFields: ["cables.crossingWalkway"],
          missingFields: ["cables.crossingWalkway"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    if (!input.cables.crossingWalkway) {
      return {
        ruleId: "RISK-002",
        ruleName: ruleRisk002.name,
        version: ruleRisk002.version,
        state: "NOT_DETECTED",
        priority: "LOW",
        priorityRationale: "Không có dây điện cắt ngang lối đi sinh hoạt.",
        evidence: {
          measuredValue: "Dây điện đi gọn gàng hoặc sát chân tường",
          threshold: "0 dây điện cắt ngang hành lang thông thủy",
          rationale: "Không có nguy cơ vấp ngón chân hoặc mắc gậy chống vào dây.",
          sourceFields: ["cables.crossingWalkway"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    const dangerousCables = input.cables.items.filter((c) => c.crossesWalkway && !c.hasCordCover && !c.hasSkirtingTrunking);
    if (dangerousCables.length > 0 || input.cables.crossingWalkway) {
      const targetCable = dangerousCables[0] || {
        id: "cable-default",
        name: "Dây điện / dây sạc thiết bị",
        location: "Lối đi chính",
      };

      const priority: FindingPriority = "HIGH";
      const priorityRationale = "Mức ưu tiên CAO vì dây điện vắt ngang mặt sàn là chướng ngại vật dạng bẫy ngầm, người già giảm thị lực ban đêm khó nhận biết kịp thời.";
      const findingId = `finding-risk002-${input.roomId}`;

      const finding: RiskFinding = {
        id: findingId,
        ruleId: "RISK-002",
        title: `Dây điện vắt ngang lối đi (${targetCable.location})`,
        hazardType: "CABLE_CROSSING",
        description: `Phát hiện "${targetCable.name}" chạy cắt ngang lối đi lại mà không có nẹp bảo vệ hoặc ghen luồn dây dán sàn.`,
        severityCategory: priority,
        evidence: {
          measuredValue: `Vị trí: ${targetCable.location}, Trạng thái: Cắt ngang lối đi, Nẹp bảo vệ: Không`,
          threshold: "Tuyệt đối không để dây điện trần cắt ngang lối đi (tiêu chuẩn CDC STEADI & Bộ Y Tế)",
          rationale: "Bàn chân người cao tuổi khi bước có độ cao nâng chân thấp (shuffle gait), dễ mắc ngón chân hoặc vấp gậy chống vào dây gây ngã chúi về phía trước.",
          sourceFields: ["cables.crossingWalkway", "cables.items.hasCordCover"],
          affectedObjectId: targetCable.id,
          affectedObjectName: targetCable.name,
        },
        recommendationText: "Gom dây và luồn vào ghen nẹp nhựa/cao su vát mép dán cố định xuống sàn, hoặc đổi hướng đi dây bám sát chân tường lên ổ cắm gần nhất.",
        targetObjectId: targetCable.id,
        status: "ACTIVE",
        referenceIds: ["SRC_CDC_STEADI_2023", "SRC_WHO_2021", "SRC_BYT_VN_2020"],
        traceabilityTrail: [
          {
            stepIndex: 1,
            stage: "SURVEY_ANSWER",
            title: "Khảo sát dây dẫn điện",
            description: "Người dùng xác nhận có dây điện hoặc cáp sạc chạy qua lối đi thường ngày.",
            data: { crossingWalkway: true },
          },
          {
            stepIndex: 2,
            stage: "DETECTION_RULE",
            title: "Kích hoạt quy tắc RISK-002",
            description: "Phát hiện dây cắt ngang không có phụ kiện che chắn bảo vệ.",
            data: { ruleId: "RISK-002", evaluatedState: "DETECTED" },
          },
          {
            stepIndex: 3,
            stage: "PRIORITY_DECISION",
            title: "Gán mức ưu tiên CAO (HIGH)",
            description: priorityRationale,
            data: { priority: "HIGH" },
          },
        ],
      };

      const recommendation: RiskRecommendation = {
        id: `rec-risk002-${input.roomId}`,
        findingId,
        title: "Bọc nẹp cao su bảo vệ dây hoặc chuyển tuyến dây men chân tường",
        actionCategory: "REROUTE_CABLE",
        priority,
        practicalSteps: [
          "Sử dụng ống nẹp sàn cao su dẻo hình mu rùa (floor cord protector) để cố định dây xuống sàn.",
          "Hoặc dùng móc kẹp dán tường định tuyến dây chạy men theo len chân tường phía sau đồ đạc.",
          "Bổ sung ổ cắm kéo dài có công tắc đặt trên kệ cao tầm tay để tránh phải cúi cắm dây dưới thấp.",
        ],
        estimatedCost: "40.000 - 120.000 VNĐ",
        difficulty: "EASY_DIY",
        status: "PENDING",
        referenceIds: ["SRC_CDC_STEADI_2023"],
      };

      return {
        ruleId: "RISK-002",
        ruleName: ruleRisk002.name,
        version: ruleRisk002.version,
        state: "DETECTED",
        priority,
        priorityRationale,
        evidence: finding.evidence,
        finding,
        recommendation,
        supportingSourceIds: ["SRC_CDC_STEADI_2023", "SRC_WHO_2021"],
      };
    }

    return {
      ruleId: "RISK-002",
      ruleName: ruleRisk002.name,
      version: ruleRisk002.version,
      state: "NOT_DETECTED",
      priority: "LOW",
      priorityRationale: "Dây điện đã được bảo vệ bằng nẹp sàn vát mép hoặc đi nẹp chân tường kín đáo.",
      evidence: {
        measuredValue: "Có nẹp bảo vệ sàn hoặc luồn ghen tường",
        threshold: "Không có gờ dây trần vướng chân",
        rationale: "Bề mặt nẹp vát mép không tạo lực cản bàn chân.",
        sourceFields: ["cables.items.hasCordCover"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: ["SRC_CDC_STEADI_2023"],
    };
  },
};

// =====================================================================
// RULE 3: RISK-003 — Walkway Obstruction (Vật cản lấn chiếm thông thủy)
// =====================================================================
export const ruleRisk003: VersionedRiskRule = {
  id: "RISK-003",
  version: "1.0.0",
  name: "Vật cản lấn chiếm hành lang / thông thủy lối đi",
  category: "REMOVE_OBSTACLE",
  defaultPriority: "HIGH",
  applicableRoomTypes: ["BEDROOM", "BATHROOM", "LIVING_ROOM", "HALLWAY", "KITCHEN"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    if (input.obstacles.present === null && input.obstacles.walkwayClearWidthM === undefined) {
      return {
        ruleId: "RISK-003",
        ruleName: ruleRisk003.name,
        version: ruleRisk003.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa đo đạc hoặc khảo sát khoảng thông thủy thực tế của tuyến đi lại chính.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Thông thủy hành lang tối thiểu >= 0.85m",
          rationale: "Cần đo khoảng cách giữa các đồ nội thất hai bên lối đi.",
          sourceFields: ["obstacles.present", "obstacles.walkwayClearWidthM"],
          missingFields: ["obstacles.walkwayClearWidthM"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    const clearWidth = input.obstacles.walkwayClearWidthM ?? 1.0;
    const hasObstacles = input.obstacles.present || clearWidth < 0.85;

    if (!hasObstacles && clearWidth >= 0.85) {
      return {
        ruleId: "RISK-003",
        ruleName: ruleRisk003.name,
        version: ruleRisk003.version,
        state: "NOT_DETECTED",
        priority: "LOW",
        priorityRationale: `Lối đi thông thoáng đạt chuẩn thông thủy (${clearWidth.toFixed(2)}m >= 0.85m).`,
        evidence: {
          measuredValue: `Khoảng thông thủy: ${clearWidth.toFixed(2)}m`,
          threshold: "Tối thiểu >= 0.85m theo tiêu chuẩn CDC STEADI",
          rationale: "Đủ không gian cho người cao tuổi dùng gậy hoặc khung tập đi di chuyển thoải mái.",
          sourceFields: ["obstacles.walkwayClearWidthM"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    const priority: FindingPriority = clearWidth < 0.7 ? "HIGH" : "MEDIUM";
    const priorityRationale = clearWidth < 0.7
      ? `Mức ưu tiên CAO vì khoảng thông thủy (${clearWidth.toFixed(2)}m) quá hẹp, dưới 0.70m khiến người già phải nghiêng người hoặc dễ va quệt gây mất thăng bằng.`
      : `Mức ưu tiên VỪA vì có vật cản làm thu hẹp lối đi (${clearWidth.toFixed(2)}m), cần dọn dẹp để đạt mức khuyến nghị 0.85m.`;

    const targetObstacle = input.obstacles.items[0] || {
      id: "obstacle-default",
      name: "Đồ đạc / bàn ghế phụ",
      location: "Lối đi chính",
    };

    const findingId = `finding-risk003-${input.roomId}`;
    const finding: RiskFinding = {
      id: findingId,
      ruleId: "RISK-003",
      title: `Vật cản làm hẹp lối đi ("${targetObstacle.name}")`,
      hazardType: "OBSTACLE_ROUTE",
      description: `Lối đi lại trong không gian ${input.roomName} bị thu hẹp xuống còn ${clearWidth.toFixed(2)}m do có "${targetObstacle.name}".`,
      severityCategory: priority,
      evidence: {
        measuredValue: `Khoảng thông thủy hiện tại: ${clearWidth.toFixed(2)}m`,
        threshold: "Tối thiểu 0.85m (khuyến nghị 0.90m - 1.0m cho thiết bị hỗ trợ di chuyển)",
        rationale: "Lối đi chật hẹp buộc người cao tuổi đổi tư thế đột ngột, tăng nguy cơ va đập hông vào cạnh bàn ghế hoặc vấp ngã.",
        sourceFields: ["obstacles.walkwayClearWidthM", "obstacles.items"],
        affectedObjectId: targetObstacle.id,
        affectedObjectName: targetObstacle.name,
      },
      recommendationText: "Kê dịch chuyển vật dụng sát vách tường hoặc cất vào tủ kín, giải phóng hành lang thông thủy rộng tối thiểu 90cm thông suốt.",
      targetObjectId: targetObstacle.id,
      status: "ACTIVE",
      referenceIds: ["SRC_CDC_STEADI_2023", "SRC_WHO_2021"],
      traceabilityTrail: [
        {
          stepIndex: 1,
          stage: "SURVEY_ANSWER",
          title: "Ghi nhận vật cản lối đi",
          description: `Thông thủy ghi nhận đạt ${clearWidth.toFixed(2)}m kèm các vật cản như ghế đẩu hoặc thùng đồ.`,
          data: { clearWidth, obstacleTypes: input.obstacles.items.map((i) => i.name) },
        },
        {
          stepIndex: 2,
          stage: "DETECTION_RULE",
          title: "Kích hoạt RISK-003",
          description: "Thông thủy nhỏ hơn ngưỡng tiêu chuẩn 0.85m.",
          data: { ruleId: "RISK-003", state: "DETECTED" },
        },
        {
          stepIndex: 3,
          stage: "PRIORITY_DECISION",
          title: "Phân bổ mức ưu tiên",
          description: priorityRationale,
          data: { priority },
        },
      ],
    };

    const recommendation: RiskRecommendation = {
      id: `rec-risk003-${input.roomId}`,
      findingId,
      title: "Giải phóng thông thủy lối đi đạt tối thiểu 0.85m",
      actionCategory: "REMOVE_OBSTACLE",
      priority,
      practicalSteps: [
        "Di dời các đồ nội thất phụ (ghế nhỏ, bàn trà cạnh giường, quạt đứng) ra khỏi luồng di chuyển chính.",
        "Đảm bảo khoảng cách giữa giường ngủ và tủ quần áo / cửa phòng tối thiểu 85cm - 90cm.",
        "Tạo thói quen không đặt hộp carton, giỏ đồ hay giày dép trên mặt sàn lối đi.",
      ],
      estimatedCost: "0 VNĐ (Sắp xếp lại nội thất)",
      difficulty: "EASY_DIY",
      status: "PENDING",
      referenceIds: ["SRC_CDC_STEADI_2023"],
    };

    return {
      ruleId: "RISK-003",
      ruleName: ruleRisk003.name,
      version: ruleRisk003.version,
      state: "DETECTED",
      priority,
      priorityRationale,
      evidence: finding.evidence,
      finding,
      recommendation,
      supportingSourceIds: ["SRC_CDC_STEADI_2023", "SRC_WHO_2021"],
    };
  },
};

// =====================================================================
// RULE 4: RISK-004 — Inadequate Nighttime Lighting (Chiếu sáng ban đêm)
// =====================================================================
export const ruleRisk004: VersionedRiskRule = {
  id: "RISK-004",
  version: "1.0.0",
  name: "Độ chiếu sáng ban đêm không đủ an toàn",
  category: "IMPROVE_LIGHTING",
  defaultPriority: "HIGH",
  applicableRoomTypes: ["BEDROOM", "BATHROOM", "HALLWAY", "LIVING_ROOM"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    const isBedroom = input.roomType === "BEDROOM";
    const minNightLux = isBedroom ? 60 : 100;
    const nighttimeLux = input.lighting.nighttimeLux;
    const hasNightLight = input.lighting.nightLightPresent;
    const hasPathLight = input.lighting.pathLightToBathroom;

    // Check missing
    if (nighttimeLux === undefined && hasNightLight === undefined) {
      return {
        ruleId: "RISK-004",
        ruleName: ruleRisk004.name,
        version: ruleRisk004.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa có thông tin khảo sát độ rọi ban đêm hoặc trang bị đèn ngủ dẫn đường.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Ban đêm cần có đèn ngủ tối thiểu 30-50 Lux dẫn đường",
          rationale: "Cần đo độ rọi hoặc kiểm tra đèn ngủ.",
          sourceFields: ["lighting.nighttimeLux", "lighting.nightLightPresent"],
          missingFields: ["lighting.nightLightPresent"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_WHO_2021"],
      };
    }

    const isDim = nighttimeLux < minNightLux && !hasNightLight;
    const pathUnsafe = isBedroom && !hasPathLight && !hasNightLight;

    if (isDim || pathUnsafe) {
      const priority: FindingPriority = nighttimeLux < 40 || !hasPathLight ? "HIGH" : "MEDIUM";
      const priorityRationale = !hasNightLight
        ? "Mức ưu tiên CAO vì tuyến đường từ giường đến nhà vệ sinh ban đêm hoàn toàn thiếu ánh sáng dẫn hướng, là thời điểm người cao tuổi dễ choáng ngợp và ngã nhất."
        : "Mức ưu tiên VỪA vì độ rọi chưa đạt mức khuyến nghị của WHO cho mắt người cao tuổi.";

      const findingId = `finding-risk004-${input.roomId}`;
      const finding: RiskFinding = {
        id: findingId,
        ruleId: "RISK-004",
        title: `Ánh sáng ban đêm không đủ an toàn (${nighttimeLux} Lux, thiếu đèn ngủ dẫn đường)`,
        hazardType: "POOR_LIGHTING",
        description: `Khu vực ${input.roomName} có độ rọi ban đêm đo được ${nighttimeLux} Lux, không có đèn ngủ cảm biến dẫn đường đến nhà vệ sinh.`,
        severityCategory: priority,
        evidence: {
          measuredValue: `Độ rọi ban đêm: ${nighttimeLux} Lux, Đèn ngủ: ${hasNightLight ? "Có" : "Không"}, Đèn dẫn đường WC: ${hasPathLight ? "Có" : "Không"}`,
          threshold: "Độ rọi tối thiểu >= 60-100 Lux khi di chuyển; có đèn ngủ vàng ấm dịu mắt (30-50 Lux)",
          rationale: "Đồng tử người cao tuổi co giãn chậm, cần lượng ánh sáng gấp 3-4 lần người trẻ để nhận diện bậc thềm và chướng ngại vật trong đêm tối.",
          sourceFields: ["lighting.nighttimeLux", "lighting.nightLightPresent", "lighting.pathLightToBathroom"],
        },
        recommendationText: "Lắp đèn ngủ LED cảm biến chuyển động tự động bật sáng khi đặt chân xuống sàn, bố trí dọc chân tường từ giường ngủ đến cửa nhà vệ sinh.",
        status: "ACTIVE",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
        traceabilityTrail: [
          {
            stepIndex: 1,
            stage: "SURVEY_ANSWER",
            title: "Khảo sát chiếu sáng ban đêm",
            description: "Người dùng xác nhận phòng ngủ ban đêm tối, chưa có đèn ngủ hoặc đèn ngủ không đủ sáng lối đi WC.",
            data: { nighttimeLux, hasNightLight, hasPathLight },
          },
          {
            stepIndex: 2,
            stage: "DETECTION_RULE",
            title: "Quy tắc RISK-004 kích hoạt",
            description: "Độ rọi ban đêm dưới ngưỡng khuyến nghị an toàn.",
            data: { ruleId: "RISK-004", state: "DETECTED" },
          },
          {
            stepIndex: 3,
            stage: "PRIORITY_DECISION",
            title: "Mức ưu tiên CAO",
            description: priorityRationale,
            data: { priority },
          },
        ],
      };

      const recommendation: RiskRecommendation = {
        id: `rec-risk004-${input.roomId}`,
        findingId,
        title: "Bổ sung đèn ngủ cảm biến chuyển động dẫn hướng ban đêm",
        actionCategory: "IMPROVE_LIGHTING",
        priority,
        practicalSteps: [
          "Cắm 1 đèn ngủ cảm biến hồng ngoại tại ổ cắm cạnh chân giường ngủ.",
          "Cắm thêm 1 đèn ngủ tự động bật sáng tại góc hành lang hoặc trước cửa nhà vệ sinh.",
          "Lựa chọn ánh sáng vàng ấm (2700K - 3000K) chống chói mắt khi thức giấc giữa đêm.",
        ],
        estimatedCost: "70.000 - 200.000 VNĐ / chiếc",
        difficulty: "EASY_DIY",
        status: "PENDING",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      };

      return {
        ruleId: "RISK-004",
        ruleName: ruleRisk004.name,
        version: ruleRisk004.version,
        state: "DETECTED",
        priority,
        priorityRationale,
        evidence: finding.evidence,
        finding,
        recommendation,
        supportingSourceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      };
    }

    return {
      ruleId: "RISK-004",
      ruleName: ruleRisk004.name,
      version: ruleRisk004.version,
      state: "NOT_DETECTED",
      priority: "LOW",
      priorityRationale: "Hệ thống chiếu sáng ban đêm đáp ứng tốt, có đèn dẫn đường an toàn.",
      evidence: {
        measuredValue: `Độ rọi ban đêm: ${nighttimeLux} Lux, Có đèn ngủ dẫn đường`,
        threshold: ">= 60 Lux hoặc có đèn ngủ cảm biến",
        rationale: "Tầm nhìn ban đêm đảm bảo rõ ràng, tránh vấp ngã khi thức dậy đi vệ sinh.",
        sourceFields: ["lighting.nighttimeLux", "lighting.nightLightPresent"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: ["SRC_WHO_2021"],
    };
  },
};

// =====================================================================
// RULE 5: RISK-005 — Bathroom Slippery Surface (Sàn ướt trơn trượt)
// =====================================================================
export const ruleRisk005: VersionedRiskRule = {
  id: "RISK-005",
  version: "1.0.0",
  name: "Bề mặt sàn nhà tắm trơn trượt khi ướt",
  category: "ADD_NON_SLIP_MAT",
  defaultPriority: "HIGH",
  applicableRoomTypes: ["BATHROOM"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    if (input.roomType !== "BATHROOM") {
      return {
        ruleId: "RISK-005",
        ruleName: ruleRisk005.name,
        version: ruleRisk005.version,
        state: "NOT_APPLICABLE",
        priority: "LOW",
        priorityRationale: `Quy tắc sàn ướt nhà tắm không áp dụng cho không gian khô (${input.roomName}).`,
        evidence: {
          measuredValue: "Không áp dụng",
          threshold: "Chỉ kiểm định khu vực có nước và độ ẩm cao (Nhà vệ sinh / Phòng tắm)",
          rationale: "Không gian khô không phát sinh trơn trượt do xà phòng hoặc nước đọng.",
          sourceFields: ["roomType"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_BYT_VN_2020"],
      };
    }

    if (input.floor.isWet === undefined) {
      return {
        ruleId: "RISK-005",
        ruleName: ruleRisk005.name,
        version: ruleRisk005.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa khảo sát tình trạng thoát nước và khả năng chống trượt của gạch sàn nhà tắm.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Sàn nhà tắm phải chống trượt (DCOF >= 0.42) hoặc có thảm cao su giác hút",
          rationale: "Cần kiểm tra độ bám dính khi sàn có nước xà phòng.",
          sourceFields: ["floor.isWet", "floor.isSlipResistant"],
          missingFields: ["floor.isSlipResistant"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_BYT_VN_2020"],
      };
    }

    const isSlippery = (input.floor.isWet && !input.floor.isSlipResistant) || (!input.floor.hasNonSlipMat && !input.floor.isSlipResistant);

    if (isSlippery) {
      const priority: FindingPriority = "HIGH";
      const priorityRationale = "Mức ưu tiên CAO vì sàn ướt trơn trượt là nguyên nhân của hơn 70% các ca té ngã gãy xương chậu và chấn thương sọ não trong nhà ở người cao tuổi.";

      const findingId = `finding-risk005-${input.roomId}`;
      const finding: RiskFinding = {
        id: findingId,
        ruleId: "RISK-005",
        title: "Sàn nhà vệ sinh trơn trượt khi ướt nước (Thiếu giải pháp chống trượt)",
        hazardType: "WET_FLOOR",
        description: `Bề mặt sàn gạch men trong ${input.roomName} thường xuyên ẩm ướt nhưng chưa được phủ dung dịch chống trơn hoặc trải thảm cao su có giác hút chân không.`,
        severityCategory: priority,
        evidence: {
          measuredValue: `Vật liệu: ${input.floor.material}, Tình trạng ướt: Có, Chống trượt: Không có thảm giác hút`,
          threshold: "Hệ số ma sát động DCOF >= 0.42 khi ướt hoặc phủ kín thảm cao su thoát nước chuyên dụng",
          rationale: "Nước và bọt xà phòng làm giảm triệt để lực ma sát giữa bàn chân và bề mặt gạch bóng kính, gây trượt ngã không kịp phản xạ đỡ.",
          sourceFields: ["floor.isWet", "floor.isSlipResistant", "floor.hasNonSlipMat"],
          coordinates: [0, 0.05, 0],
        },
        recommendationText: "Lắp đặt thảm cao su chống trượt có giác hút chân không bám chặt sàn tại khu vực tắm và bồn cầu, hoặc phủ dung dịch nano tăng độ nhám cho gạch men.",
        status: "ACTIVE",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
        traceabilityTrail: [
          {
            stepIndex: 1,
            stage: "SURVEY_ANSWER",
            title: "Khảo sát mặt sàn nhà vệ sinh",
            description: "Xác nhận sàn gạch dễ trơn trượt khi tắm gội hoặc rửa chân.",
            data: { isWet: true, isSlipResistant: false },
          },
          {
            stepIndex: 2,
            stage: "DETECTION_RULE",
            title: "Kích hoạt quy tắc RISK-005",
            description: "Mặt sàn ướt thiếu giải pháp bám dính đạt chuẩn an toàn.",
            data: { ruleId: "RISK-005", state: "DETECTED" },
          },
          {
            stepIndex: 3,
            stage: "PRIORITY_DECISION",
            title: "Mức ưu tiên CAO (HIGH)",
            description: priorityRationale,
            data: { priority: "HIGH" },
          },
        ],
      };

      const recommendation: RiskRecommendation = {
        id: `rec-risk005-${input.roomId}`,
        findingId,
        title: "Trang bị thảm cao su chống trượt có giác hút chân không",
        actionCategory: "ADD_NON_SLIP_MAT",
        priority,
        practicalSteps: [
          "Đặt thảm cao su thoát nước có hàng trăm giác hút chân không tại vị trí đứng tắm và trước bồn cầu.",
          "Nhấn chặt các giác hút xuống nền gạch sạch để cố định thảm hoàn toàn.",
          "Định kỳ 1 lần/tuần lật thảm vệ sinh rêu mốc và kiểm tra độ dính của giác hút.",
        ],
        estimatedCost: "90.000 - 250.000 VNĐ / tấm",
        difficulty: "EASY_DIY",
        status: "PENDING",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      };

      return {
        ruleId: "RISK-005",
        ruleName: ruleRisk005.name,
        version: ruleRisk005.version,
        state: "DETECTED",
        priority,
        priorityRationale,
        evidence: finding.evidence,
        finding,
        recommendation,
        supportingSourceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      };
    }

    return {
      ruleId: "RISK-005",
      ruleName: ruleRisk005.name,
      version: ruleRisk005.version,
      state: "NOT_DETECTED",
      priority: "LOW",
      priorityRationale: "Sàn nhà vệ sinh đã trang bị giải pháp chống trượt hiệu quả hoặc gạch nhám chống trơn.",
      evidence: {
        measuredValue: "Sàn có phủ chống trượt hoặc có thảm cao su giác hút",
        threshold: "DCOF >= 0.42 hoặc có thảm cao su cố định",
        rationale: "Độ ma sát tốt ngay cả khi mặt sàn có nước ẩm.",
        sourceFields: ["floor.isSlipResistant", "floor.hasNonSlipMat"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: ["SRC_BYT_VN_2020"],
    };
  },
};

// =====================================================================
// RULE 6: RISK-006 — Bathroom Support / Grab Bar Review (Thanh tay vịn)
// =====================================================================
export const ruleRisk006: VersionedRiskRule = {
  id: "RISK-006",
  version: "1.0.0",
  name: "Thiếu thanh tay vịn an toàn trong nhà vệ sinh",
  category: "INSTALL_GRAB_BAR",
  defaultPriority: "HIGH",
  applicableRoomTypes: ["BATHROOM"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    if (input.roomType !== "BATHROOM") {
      return {
        ruleId: "RISK-006",
        ruleName: ruleRisk006.name,
        version: ruleRisk006.version,
        state: "NOT_APPLICABLE",
        priority: "LOW",
        priorityRationale: `Thanh tay vịn nhà vệ sinh không áp dụng cho không gian ${input.roomName}.`,
        evidence: {
          measuredValue: "Không áp dụng",
          threshold: "Chỉ kiểm định khu vực vệ sinh cá nhân và tắm",
          rationale: "Không có bồn cầu hay bồn tắm tại khu vực này.",
          sourceFields: ["roomType"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_WHO_2021"],
      };
    }

    if (input.grabBars.present === null && input.grabBars.count === undefined) {
      return {
        ruleId: "RISK-006",
        ruleName: ruleRisk006.name,
        version: ruleRisk006.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa khảo sát số lượng và vị trí các thanh tay vịn trợ lực trong nhà vệ sinh.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Cần tối thiểu 2 thanh tay vịn trợ lực: 1 cạnh bồn cầu và 1 trong buồng tắm",
          rationale: "Cần kiểm tra vị trí và độ chắc chắn khi chịu tải trọng người già.",
          sourceFields: ["grabBars.present", "grabBars.count"],
          missingFields: ["grabBars.count", "grabBars.toiletGrabBarPresent"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_WHO_2021"],
      };
    }

    const count = input.grabBars.count || (input.grabBars.present ? 1 : 0);
    const hasToiletBar = input.grabBars.toiletGrabBarPresent;
    const hasShowerBar = input.grabBars.showerGrabBarPresent;

    if (count < 2 || !hasToiletBar || !hasShowerBar) {
      const priority: FindingPriority = count === 0 ? "HIGH" : "MEDIUM";
      const priorityRationale = count === 0
        ? "Mức ưu tiên CAO vì hoàn toàn không có điểm tựa chịu lực khi người cao tuổi đứng lên từ bồn cầu hoặc giữ thăng bằng lúc tắm gội."
        : "Mức ưu tiên VỪA vì mới chỉ có thanh tay vịn ở 1 khu vực, còn thiếu điểm tựa an toàn tại vị trí còn lại.";

      const findingId = `finding-risk006-${input.roomId}`;
      const finding: RiskFinding = {
        id: findingId,
        ruleId: "RISK-006",
        title: `Thiếu thanh tay vịn an toàn trong nhà vệ sinh (${count}/2 vị trí trọng yếu)`,
        hazardType: "MISSING_GRAB_BAR",
        description: `Nhà vệ sinh hiện mới có ${count} thanh vịn. Thiếu thanh vịn tại ${!hasToiletBar ? "cạnh bồn cầu" : ""} ${!hasToiletBar && !hasShowerBar ? "và" : ""} ${!hasShowerBar ? "khu vực tắm vòi sen" : ""}.`,
        severityCategory: priority,
        evidence: {
          measuredValue: `Hiện có: ${count} thanh vịn (Bồn cầu: ${hasToiletBar ? "Có" : "Thiếu"}, Sen tắm: ${hasShowerBar ? "Có" : "Thiếu"})`,
          threshold: "Tối thiểu 2 vị trí bắt buộc: Cạnh bồn cầu (cao 75-80cm) và bên trong buồng tắm",
          rationale: "Khi đứng lên từ bồn cầu, huyết áp tư thế có thể giảm tạm thời gây choáng váng; việc bám vào lavabo hoặc thanh treo khăn lỏng lẻo rất dễ gãy vỡ gây ngã nguy kịch.",
          sourceFields: ["grabBars.count", "grabBars.toiletGrabBarPresent", "grabBars.showerGrabBarPresent"],
          coordinates: [1.2, 0.85, 0.5],
        },
        recommendationText: "Lắp đặt thanh tay vịn inox 304 hoặc hợp kim bọc nylon kháng khuẩn gân nổi chống trượt, khoan bắt vít nở sắt chịu lực tối thiểu 150kg âm tường.",
        status: "ACTIVE",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
        traceabilityTrail: [
          {
            stepIndex: 1,
            stage: "SURVEY_ANSWER",
            title: "Khảo sát tay vịn nhà vệ sinh",
            description: `Ghi nhận số lượng tay vịn: ${count}, thiếu vị trí trọng yếu.`,
            data: { grabBarsCount: count, hasToiletBar, hasShowerBar },
          },
          {
            stepIndex: 2,
            stage: "DETECTION_RULE",
            title: "Kích hoạt quy tắc RISK-006",
            description: "Số lượng hoặc vị trí thanh tay vịn chưa đáp ứng khuyến cáo phòng ngừa ngã của WHO.",
            data: { ruleId: "RISK-006", state: "DETECTED" },
          },
          {
            stepIndex: 3,
            stage: "PRIORITY_DECISION",
            title: `Mức ưu tiên ${priority}`,
            description: priorityRationale,
            data: { priority },
          },
        ],
      };

      const recommendation: RiskRecommendation = {
        id: `rec-risk006-${input.roomId}`,
        findingId,
        title: "Lắp đặt thanh tay vịn trợ lực âm tường chữ L hoặc thẳng",
        actionCategory: "INSTALL_GRAB_BAR",
        priority,
        practicalSteps: [
          "Lắp 1 thanh vịn ngang hoặc chữ L cạnh bồn cầu ở độ cao 75cm - 80cm tính từ mặt sàn.",
          "Lắp 1 thanh vịn dọc hoặc chéo trong khu vực buồng tắm đứng cách vòi sen khoảng 40cm.",
          "Sử dụng vít nở inox sâu tối thiểu 6cm vào tường gạch đặc, không dán giác hút tạm thời cho thanh chịu lực.",
        ],
        estimatedCost: "250.000 - 650.000 VNĐ / thanh (bao gồm công lắp)",
        difficulty: "PROFESSIONAL_INSTALL",
        status: "PENDING",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      };

      return {
        ruleId: "RISK-006",
        ruleName: ruleRisk006.name,
        version: ruleRisk006.version,
        state: "DETECTED",
        priority,
        priorityRationale,
        evidence: finding.evidence,
        finding,
        recommendation,
        supportingSourceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      };
    }

    return {
      ruleId: "RISK-006",
      ruleName: ruleRisk006.name,
      version: ruleRisk006.version,
      state: "NOT_DETECTED",
      priority: "LOW",
      priorityRationale: "Đã trang bị đầy đủ thanh tay vịn trợ lực chắc chắn tại các vị trí trọng yếu của nhà vệ sinh.",
      evidence: {
        measuredValue: `${count} thanh vịn kiên cố tại bồn cầu và buồng tắm`,
        threshold: "Tối thiểu 2 vị trí trợ lực",
        rationale: "Người cao tuổi luôn có điểm tì đỡ vững vàng khi xoay trở và đứng lên - ngồi xuống.",
        sourceFields: ["grabBars.count", "grabBars.toiletGrabBarPresent", "grabBars.showerGrabBarPresent"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: ["SRC_WHO_2021"],
    };
  },
};

// =====================================================================
// RULE 7: RISK-007 — Level Difference at Entrance (Gờ bậc cửa)
// =====================================================================
export const ruleRisk007: VersionedRiskRule = {
  id: "RISK-007",
  version: "1.0.0",
  name: "Gờ bậc cửa chênh lệch cao độ tại lối vào nhà vệ sinh / phòng",
  category: "RAMP_OR_MARK_THRESHOLD",
  defaultPriority: "MEDIUM",
  applicableRoomTypes: ["BATHROOM", "BEDROOM", "HALLWAY"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    const diffCm = input.floor.levelDifferenceCm;
    const hasThreshold = input.floor.thresholdStepPresent;
    const hasRamp = input.floor.hasThresholdRamp;

    if (diffCm === undefined && hasThreshold === undefined) {
      return {
        ruleId: "RISK-007",
        ruleName: ruleRisk007.name,
        version: ruleRisk007.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa khảo sát chiều cao gờ bậc cửa hoặc độ chênh cốt nền tại lối ra vào.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Gờ cửa không được cao quá 1.5cm nếu không có dốc thoải vát mép",
          rationale: "Cần đo độ cao từ cốt sàn phòng ra cốt sàn nhà vệ sinh.",
          sourceFields: ["floor.levelDifferenceCm", "floor.thresholdStepPresent"],
          missingFields: ["floor.levelDifferenceCm"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    if ((diffCm > 1.5 || hasThreshold) && !hasRamp) {
      const priority: FindingPriority = diffCm >= 3.5 ? "HIGH" : "MEDIUM";
      const priorityRationale = diffCm >= 3.5
        ? `Mức ưu tiên CAO vì gờ bậc cửa cao ${diffCm}cm tạo ra độ giật cấp đột ngột, nguy cơ vấp ngã rất lớn khi người già bước chân lúc nửa đêm.`
        : `Mức ưu tiên VỪA vì gờ cửa chênh ${diffCm}cm vượt ngưỡng an toàn khuyến cáo 1.5cm.`;

      const findingId = `finding-risk007-${input.roomId}`;
      const finding: RiskFinding = {
        id: findingId,
        ruleId: "RISK-007",
        title: `Gờ bậc cửa chênh lệch cao độ (${diffCm}cm) tại lối vào`,
        hazardType: "THRESHOLD_STEP",
        description: `Lối vào ${input.roomName} có bậc gờ cửa cao ${diffCm}cm nhưng chưa được vát dốc thoải hoặc dán decal phản quang cảnh báo.`,
        severityCategory: priority,
        evidence: {
          measuredValue: `Độ chênh cao: ${diffCm}cm, Gờ dốc cao su: Không có, Sơn phản quang: Không`,
          threshold: "Độ chênh cốt tối đa <= 1.5cm; nếu chênh > 1.5cm phải lắp gờ vát dốc thoải tỉ lệ <= 1:12",
          rationale: "Người cao tuổi suy giảm cảm nhận bản thể (proprioception), khi bước qua gờ cửa thường không nhấc chân đủ cao dẫn đến vấp ngón chân và mất thăng bằng ngã bổ nhào.",
          sourceFields: ["floor.levelDifferenceCm", "floor.thresholdStepPresent", "floor.hasThresholdRamp"],
          coordinates: [0, 0.05, 1.8],
        },
        recommendationText: "Lắp gờ dốc cao su vát mép (rubber threshold ramp) giảm dần độ dốc và dán dải decal phản quang màu vàng tương phản cao dọc theo mép bậc cửa.",
        status: "ACTIVE",
        referenceIds: ["SRC_CDC_STEADI_2023", "SRC_BYT_VN_2020"],
        traceabilityTrail: [
          {
            stepIndex: 1,
            stage: "SURVEY_ANSWER",
            title: "Khảo sát bậc thềm cửa",
            description: `Ghi nhận có gờ cửa cao ${diffCm}cm ngăn nước tràn.`,
            data: { diffCm, hasThreshold },
          },
          {
            stepIndex: 2,
            stage: "DETECTION_RULE",
            title: "Kích hoạt quy tắc RISK-007",
            description: "Chênh lệch cao độ vượt ngưỡng an toàn 1.5cm.",
            data: { ruleId: "RISK-007", state: "DETECTED" },
          },
          {
            stepIndex: 3,
            stage: "PRIORITY_DECISION",
            title: `Mức ưu tiên ${priority}`,
            description: priorityRationale,
            data: { priority },
          },
        ],
      };

      const recommendation: RiskRecommendation = {
        id: `rec-risk007-${input.roomId}`,
        findingId,
        title: "Lắp gờ dốc cao su vát mép và dán dải decal phản quang",
        actionCategory: "RAMP_OR_MARK_THRESHOLD",
        priority,
        practicalSteps: [
          "Đặt thanh cao su vát mép (threshold ramp) áp sát gờ cửa để tạo độ dốc nhẹ nhàng thay vì bậc vuông.",
          "Dán băng keo dạ quang hoặc decal màu vàng/đen tương phản cao dọc theo mép trên của gờ cửa.",
          "Bổ sung ánh sáng rọi thẳng vào vị trí bậc cửa để quan sát rõ bậc thềm.",
        ],
        estimatedCost: "80.000 - 220.000 VNĐ",
        difficulty: "EASY_DIY",
        status: "PENDING",
        referenceIds: ["SRC_CDC_STEADI_2023", "SRC_BYT_VN_2020"],
      };

      return {
        ruleId: "RISK-007",
        ruleName: ruleRisk007.name,
        version: ruleRisk007.version,
        state: "DETECTED",
        priority,
        priorityRationale,
        evidence: finding.evidence,
        finding,
        recommendation,
        supportingSourceIds: ["SRC_CDC_STEADI_2023", "SRC_BYT_VN_2020"],
      };
    }

    return {
      ruleId: "RISK-007",
      ruleName: ruleRisk007.name,
      version: ruleRisk007.version,
      state: "NOT_DETECTED",
      priority: "LOW",
      priorityRationale: "Cốt sàn phẳng hoặc gờ bậc cửa dưới 1.5cm đã được xử lý vát thoải an toàn.",
      evidence: {
        measuredValue: `Độ chênh: ${diffCm || 0}cm (hoặc đã có dốc thoải)`,
        threshold: "<= 1.5cm",
        rationale: "Bàn chân người cao tuổi có thể lướt qua êm ái mà không bị cấn vấp.",
        sourceFields: ["floor.levelDifferenceCm", "floor.hasThresholdRamp"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: ["SRC_CDC_STEADI_2023"],
    };
  },
};

// =====================================================================
// RULE 8: RISK-008 — Essential Item or Light Control Accessibility
// =====================================================================
export const ruleRisk008: VersionedRiskRule = {
  id: "RISK-008",
  version: "1.0.0",
  name: "Tầm với công tắc đèn hoặc vật dụng thiết yếu khó tiếp cận",
  category: "REORGANIZE_STORAGE",
  defaultPriority: "MEDIUM",
  applicableRoomTypes: ["BEDROOM", "LIVING_ROOM"],
  evaluate: (input: AssessmentInput): RuleEvaluationResult => {
    const isBedroom = input.roomType === "BEDROOM";
    if (!isBedroom && input.roomType !== "LIVING_ROOM") {
      return {
        ruleId: "RISK-008",
        ruleName: ruleRisk008.name,
        version: ruleRisk008.version,
        state: "NOT_APPLICABLE",
        priority: "LOW",
        priorityRationale: `Quy tắc tầm với đồ vật đầu giường không áp dụng trực tiếp cho ${input.roomName}.`,
        evidence: {
          measuredValue: "Không áp dụng",
          threshold: "Áp dụng chủ yếu tại phòng ngủ người cao tuổi",
          rationale: "Không có tư thế với đồ từ giường tại phòng này.",
          sourceFields: ["roomType"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    const switchReachable = input.accessibility.lightSwitchReachableFromBed;
    const itemsReachable = input.accessibility.essentialItemsReachableFromBed;

    if (switchReachable === undefined && itemsReachable === undefined) {
      return {
        ruleId: "RISK-008",
        ruleName: ruleRisk008.name,
        version: ruleRisk008.version,
        state: "NEEDS_VERIFICATION",
        priority: "UNKNOWN",
        priorityRationale: "Chưa khảo sát khoảng cách với công tắc đèn và đồ dùng thiết yếu từ vị trí nằm trên giường.",
        evidence: {
          measuredValue: "Chưa khảo sát",
          threshold: "Công tắc đèn và điện thoại/kính mắt phải nằm trong tầm với cánh tay (<= 60cm)",
          rationale: "Cần kiểm tra xem người cao tuổi có phải nhoài người hoặc đi trong tối để bật đèn không.",
          sourceFields: ["accessibility.lightSwitchReachableFromBed", "accessibility.essentialItemsReachableFromBed"],
          missingFields: ["accessibility.lightSwitchReachableFromBed"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: ["SRC_CDC_STEADI_2023"],
      };
    }

    if (!switchReachable || !itemsReachable) {
      const priority: FindingPriority = "MEDIUM";
      const priorityRationale = "Mức ưu tiên VỪA vì việc phải nhoài người với công tắc hoặc mò mẫm trong bóng tối dễ làm người già mất thăng bằng và ngã lăn khỏi giường.";

      const findingId = `finding-risk008-${input.roomId}`;
      const finding: RiskFinding = {
        id: findingId,
        ruleId: "RISK-008",
        title: "Công tắc đèn hoặc vật dụng thiết yếu ngoài tầm với an toàn",
        hazardType: "REACH_ACCESSIBILITY",
        description: `Người cao tuổi không thể với tới công tắc đèn (${!switchReachable ? "công tắc xa giường" : ""}) hoặc vật dụng thiết yếu (${!itemsReachable ? "điện thoại/kính mắt để xa" : ""}) mà phải nhoài người hoặc bước đi trong bóng tối.`,
        severityCategory: priority,
        evidence: {
          measuredValue: `Công tắc đèn với tới từ giường: ${switchReachable ? "Có" : "Không"}, Đồ thiết yếu trong tầm với: ${itemsReachable ? "Có" : "Không"}`,
          threshold: "Khoảng cách từ mép giường đến công tắc đèn hoặc mặt bàn tab đầu giường <= 50-60cm",
          rationale: "Động tác rướn người hoặc cúi sâu khi đang ở tư thế nằm/ngồi trên giường dễ gây mất thăng bằng, tụt huyết áp tư thế hoặc té ngã xuống nền nhà.",
          sourceFields: ["accessibility.lightSwitchReachableFromBed", "accessibility.essentialItemsReachableFromBed"],
        },
        recommendationText: "Kê bàn tab đầu giường sát thành giường, đặt đèn ngủ để bàn có công tắc cảm ứng chạm hoặc lắp công tắc đèn 2 chiều / ổ cắm điều khiển từ xa.",
        status: "ACTIVE",
        referenceIds: ["SRC_CDC_STEADI_2023", "SRC_WHO_2021"],
        traceabilityTrail: [
          {
            stepIndex: 1,
            stage: "SURVEY_ANSWER",
            title: "Khảo sát tiện ích đầu giường",
            description: "Người dùng chia sẻ công tắc đèn nằm xa cửa hoặc phải dậy bước đi mới bật được đèn.",
            data: { switchReachable, itemsReachable },
          },
          {
            stepIndex: 2,
            stage: "DETECTION_RULE",
            title: "Kích hoạt quy tắc RISK-008",
            description: "Khoảng cách vượt tầm với an toàn của người già.",
            data: { ruleId: "RISK-008", state: "DETECTED" },
          },
          {
            stepIndex: 3,
            stage: "PRIORITY_DECISION",
            title: "Mức ưu tiên VỪA (MEDIUM)",
            description: priorityRationale,
            data: { priority: "MEDIUM" },
          },
        ],
      };

      const recommendation: RiskRecommendation = {
        id: `rec-risk008-${input.roomId}`,
        findingId,
        title: "Bố trí đèn bàn cảm ứng chạm và tủ tab sát thành giường",
        actionCategory: "REORGANIZE_STORAGE",
        priority,
        practicalSteps: [
          "Đặt một chiếc bàn nhỏ hoặc tab đầu giường cao ngang bằng mặt đệm nệm (45-50cm).",
          "Trang bị đèn ngủ cảm ứng chạm nhẹ vào thân đèn để bật/tắt tức thì không cần tìm công tắc nhỏ.",
          "Để điện thoại sạc sẵn, kính mắt, ly nước và chuông gọi khẩn cấp luôn nằm trên mặt tab đầu giường.",
        ],
        estimatedCost: "120.000 - 350.000 VNĐ",
        difficulty: "EASY_DIY",
        status: "PENDING",
        referenceIds: ["SRC_CDC_STEADI_2023"],
      };

      return {
        ruleId: "RISK-008",
        ruleName: ruleRisk008.name,
        version: ruleRisk008.version,
        state: "DETECTED",
        priority,
        priorityRationale,
        evidence: finding.evidence,
        finding,
        recommendation,
        supportingSourceIds: ["SRC_CDC_STEADI_2023", "SRC_WHO_2021"],
      };
    }

    return {
      ruleId: "RISK-008",
      ruleName: ruleRisk008.name,
      version: ruleRisk008.version,
      state: "NOT_DETECTED",
      priority: "LOW",
      priorityRationale: "Công tắc đèn và vật dụng thiết yếu nằm trong tầm với thoải mái từ mép giường.",
      evidence: {
        measuredValue: "Công tắc và đồ dùng thiết yếu cách giường <= 50cm",
        threshold: "<= 60cm từ tư thế nằm/ngồi",
        rationale: "Không cần rướn người hoặc đứng dậy trong đêm tối.",
        sourceFields: ["accessibility.lightSwitchReachableFromBed"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: ["SRC_CDC_STEADI_2023"],
    };
  },
};

// =====================================================================
// REGISTRY OF ALL 8 RULES
// =====================================================================
export const ALL_VERSIONED_RULES: VersionedRiskRule[] = [
  ruleRisk001,
  ruleRisk002,
  ruleRisk003,
  ruleRisk004,
  ruleRisk005,
  ruleRisk006,
  ruleRisk007,
  ruleRisk008,
];

/**
 * Find a specific rule by ID.
 */
export function getRuleById(ruleId: string): VersionedRiskRule | undefined {
  return ALL_VERSIONED_RULES.find((r) => r.id === ruleId);
}
