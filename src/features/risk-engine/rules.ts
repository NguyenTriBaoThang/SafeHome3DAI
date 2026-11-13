import {
  RoomState,
  SceneObjectState,
  HazardFindingResult,
  HazardSeverity,
  WalkingZone,
} from "@/types";

/**
 * Geometric helper: Compute minimum distance from a 2D point (x, z) to a line segment (x1, z1) -> (x2, z2).
 */
export function pointToSegmentDistance(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;

  if (lenSq === 0) {
    return Math.hypot(px - x1, pz - z1);
  }

  // Projection parameter t
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;

  return Math.hypot(px - projX, pz - projZ);
}

/**
 * Check if an object's bounding box in XZ plane intersects or is within tolerance of a walking zone.
 */
export function objectIntersectsWalkingZone(
  obj: SceneObjectState,
  zone: WalkingZone,
  extraTolerance = 0.1
): { intersects: boolean; distance: number } {
  const [ox, , oz] = obj.position;
  const dist = pointToSegmentDistance(
    ox,
    oz,
    zone.startPoint[0],
    zone.startPoint[1],
    zone.endPoint[0],
    zone.endPoint[1]
  );

  // Object half-width approximate radius
  const objRadius = Math.max(obj.dimensions.width, obj.dimensions.length) / 2;
  const effectiveZoneWidth = zone.width / 2;

  const threshold = objRadius + effectiveZoneWidth + extraTolerance;
  return {
    intersects: dist <= threshold,
    distance: dist,
  };
}

export interface RuleDefinition {
  id: string;
  name: string;
  hazardType: string;
  defaultSeverity: HazardSeverity;
  evaluate: (room: RoomState) => HazardFindingResult[];
}

/**
 * RULE 1: Loose or unsecured rugs near or in walking paths (RULE_RUG_01)
 */
export const ruleLooseRug: RuleDefinition = {
  id: "RULE_RUG_01",
  name: "Thảm trải sàn không cố định mép",
  hazardType: "LOOSE_RUG",
  defaultSeverity: "HIGH",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];
    const rugs = room.objects.filter(
      (obj) => obj.category === "RUG" || obj.modelType === "rug"
    );

    for (const rug of rugs) {
      if (rug.isLoose || !rug.isFixed) {
        // Check proximity to any walking zone
        for (const zone of room.walkingZones) {
          const { intersects, distance } = objectIntersectsWalkingZone(rug, zone, 0.2);
          if (intersects) {
            findings.push({
              id: `hazard-rug-${rug.id}`,
              hazardType: "LOOSE_RUG",
              title: `Thảm không chống trượt tại ${zone.name}`,
              description: `Tấm thảm "${rug.name}" không có lớp lót cố định hoặc băng dính chống trượt, nằm trực tiếp trên lối đi (${zone.name}).`,
              severityCategory: "HIGH",
              detectionRuleId: "RULE_RUG_01",
              evidence: {
                measuredValue: `Khoảng cách đến tâm lối đi: ${distance.toFixed(2)}m (nhỏ hơn ngưỡng an toàn ${(zone.width / 2 + 0.3).toFixed(2)}m)`,
                threshold: "Thảm phải được cố định mép hoàn toàn nếu nằm trong phạm vi lối đi",
                rationale: "Mép thảm dễ bị quăn hoặc trượt dịch khi người cao tuổi lê chân hoặc đổi trọng tâm.",
                affectedObjectId: rug.id,
                affectedObjectName: rug.name,
                coordinates: rug.position,
              },
              recommendationText:
                "Loại bỏ thảm hoặc dùng băng dính 2 mặt chuyên dụng cố định 4 cạnh và dán lớp lót cao su chống trượt bên dưới.",
              targetObjectId: rug.id,
              targetArea: {
                min: [rug.position[0] - rug.dimensions.width / 2, 0, rug.position[2] - rug.dimensions.length / 2],
                max: [rug.position[0] + rug.dimensions.width / 2, 0.1, rug.position[2] + rug.dimensions.length / 2],
              },
              status: "ACTIVE",
              referenceIds: ["SRC_WHO_2021", "SRC_NCOA_2023"],
            });
            break; // One finding per loose rug is sufficient
          }
        }
      }
    }
    return findings;
  },
};

/**
 * RULE 2: Electrical cables crossing walkway (RULE_CABLE_02)
 */
export const ruleCableCrossing: RuleDefinition = {
  id: "RULE_CABLE_02",
  name: "Dây điện hoặc cáp vắt ngang lối đi",
  hazardType: "CABLE_CROSSING",
  defaultSeverity: "HIGH",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];
    const cables = room.objects.filter(
      (obj) => obj.category === "CABLE" || obj.modelType === "cable"
    );

    for (const cable of cables) {
      if (!cable.isFixed) {
        for (const zone of room.walkingZones) {
          const { intersects, distance } = objectIntersectsWalkingZone(cable, zone, 0.15);
          if (intersects) {
            findings.push({
              id: `hazard-cable-${cable.id}`,
              hazardType: "CABLE_CROSSING",
              title: `Dây điện vắt ngang ${zone.name}`,
              description: `Phát hiện "${cable.name}" kéo dài cắt ngang tuyến di chuyển chính mà không có ghen bảo vệ chân tường.`,
              severityCategory: "HIGH",
              detectionRuleId: "RULE_CABLE_02",
              evidence: {
                measuredValue: `Giao cắt lối đi ${zone.name} ở khoảng cách ${distance.toFixed(2)}m`,
                threshold: "0m (tuyệt đối không để dây trần cắt ngang lối đi)",
                rationale: "Người cao tuổi giảm thị lực và nâng chân thấp nên nguy cơ vấp ngã bởi dây điện rất cao.",
                affectedObjectId: cable.id,
                affectedObjectName: cable.name,
                coordinates: cable.position,
              },
              recommendationText:
                "Gom dây vào nẹp sàn bảo vệ cao su vát mép hoặc gắn ghen luồn dây dọc chân tường sát vách.",
              targetObjectId: cable.id,
              status: "ACTIVE",
              referenceIds: ["SRC_CDC_STEADI_2023", "SRC_WHO_2021"],
            });
            break;
          }
        }
      }
    }
    return findings;
  },
};

/**
 * RULE 3: Insufficient lighting in room/zones (RULE_LIGHT_03)
 */
export const rulePoorLighting: RuleDefinition = {
  id: "RULE_LIGHT_03",
  name: "Độ rọi chiếu sáng không đủ an toàn",
  hazardType: "POOR_LIGHTING",
  defaultSeverity: "MEDIUM",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];
    const minThresholdLux = room.roomType === "BEDROOM" ? 100 : 150;

    if (room.lightingLevel < minThresholdLux) {
      findings.push({
        id: `hazard-light-${room.id}`,
        hazardType: "POOR_LIGHTING",
        title: `Độ sáng phòng quá thấp (${room.lightingLevel} Lux)`,
        description: `Cường độ ánh sáng hiện tại đo được ${room.lightingLevel} Lux, dưới mức tối thiểu khuyến nghị (${minThresholdLux} Lux).`,
        severityCategory: room.lightingLevel < 60 ? "HIGH" : "MEDIUM",
        detectionRuleId: "RULE_LIGHT_03",
        evidence: {
          measuredValue: `${room.lightingLevel} Lux`,
          threshold: `>= ${minThresholdLux} Lux cho sinh hoạt của người cao tuổi`,
          rationale: "Mắt người già cần lượng ánh sáng gấp 3 lần người trẻ để nhận diện chướng ngại vật kịp thời.",
          coordinates: [0, room.dimensions.height, 0],
        },
        recommendationText:
          "Nâng cấp bóng đèn LED có độ hoàn màu tốt, bổ sung đèn ngủ cảm biến tự động sáng khi bước chân xuống giường.",
        status: "ACTIVE",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      });
    }
    return findings;
  },
};

/**
 * RULE 4: Wet or slippery floor without anti-slip treatment (RULE_BATH_WET_04)
 */
export const ruleWetFloor: RuleDefinition = {
  id: "RULE_BATH_WET_04",
  name: "Bề mặt sàn ướt thiếu giải pháp chống trượt",
  hazardType: "WET_FLOOR",
  defaultSeverity: "HIGH",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];

    if (room.isWet && !room.isSlipResistant) {
      findings.push({
        id: `hazard-wet-${room.id}`,
        hazardType: "WET_FLOOR",
        title: "Sàn ướt trơn trượt không có lớp chống trượt",
        description: "Mặt sàn gạch men bị ướt nước nhưng chưa được xử lý chống trơn hoặc chưa trang bị thảm cao su hút chân không.",
        severityCategory: "HIGH",
        detectionRuleId: "RULE_BATH_WET_04",
        evidence: {
          measuredValue: `Vật liệu sàn: ${room.floorMaterial}, Trạng thái: Ướt nước, Chống trượt: Không`,
          threshold: "Hệ số ma sát động DCOF >= 0.42 hoặc thảm hút chân không chuyên dụng",
          rationale: "Sàn phòng tắm ướt là nguyên nhân hàng đầu gây chấn thương vỡ xương chậu và ngã đập đầu.",
          coordinates: [0, 0.05, 0],
        },
        recommendationText:
          "Sử dụng dung dịch phủ nano chống trượt sàn gạch, đặt thảm cao su thoát nước có giác hút cố định ở khu vực tắm và bồn cầu.",
        status: "ACTIVE",
        referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
      });
    }
    return findings;
  },
};

/**
 * RULE 5: Missing grab bars in bathroom (RULE_BATH_GRAB_05)
 */
export const ruleMissingGrabBars: RuleDefinition = {
  id: "RULE_BATH_GRAB_05",
  name: "Thiếu thanh tay vịn an toàn trong nhà vệ sinh",
  hazardType: "MISSING_GRAB_BAR",
  defaultSeverity: "HIGH",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];

    if (room.roomType === "BATHROOM") {
      const grabBars = room.objects.filter(
        (obj) => obj.category === "SAFETY_DEVICE" && obj.modelType.includes("grab_bar")
      );
      const totalGrabBars = room.grabBarsCount || grabBars.length;

      if (totalGrabBars < 2) {
        findings.push({
          id: `hazard-grabbar-${room.id}`,
          hazardType: "MISSING_GRAB_BAR",
          title: `Thiếu thanh vịn hỗ trợ (Hiện có: ${totalGrabBars}/2 vị trí trọng yếu)`,
          description: "Phòng vệ sinh chưa được lắp đủ thanh tay vịn trợ lực tại vị trí bồn cầu và khu vực tắm đứng/ngồi.",
          severityCategory: totalGrabBars === 0 ? "HIGH" : "MEDIUM",
          detectionRuleId: "RULE_BATH_GRAB_05",
          evidence: {
            measuredValue: `${totalGrabBars} thanh vịn`,
            threshold: "Tối thiểu 2 vị trí: 1 cạnh bồn cầu và 1 trong buồng tắm vòi sen",
            rationale: "Người cao tuổi cần điểm tựa tay trợ lực khi thay đổi tư thế đứng lên - ngồi xuống tránh tụt huyết áp gây ngã.",
            coordinates: [1.2, 0.85, 0.5],
          },
          recommendationText:
            "Lắp đặt thanh vịn inox 304 hoặc bọc nhựa ABS gân chống trơn, bắt vít nở sắt âm tường chịu lực tối thiểu 150kg ở độ cao 80-85cm.",
          status: "ACTIVE",
          referenceIds: ["SRC_WHO_2021", "SRC_BYT_VN_2020"],
        });
      }
    }
    return findings;
  },
};

/**
 * RULE 6: Obstacles obstructing walking route (RULE_PATH_OBST_06)
 */
export const ruleObstacleRoute: RuleDefinition = {
  id: "RULE_PATH_OBST_06",
  name: "Vật cản lấn chiếm thông thủy lối đi",
  hazardType: "OBSTACLE_ROUTE",
  defaultSeverity: "MEDIUM",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];
    const obstacles = room.objects.filter(
      (obj) =>
        obj.isWalkwayObstacle ||
        obj.category === "OBSTACLE" ||
        (obj.category === "FURNITURE" && obj.modelType === "coffee_table")
    );

    for (const obst of obstacles) {
      for (const zone of room.walkingZones) {
        const { intersects, distance } = objectIntersectsWalkingZone(obst, zone, 0.05);
        if (intersects) {
          findings.push({
            id: `hazard-obst-${obst.id}`,
            hazardType: "OBSTACLE_ROUTE",
            title: `Vật cản "${obst.name}" chặn lối đi ${zone.name}`,
            description: `Vật cản làm thu hẹp khoảng thông thủy lối đi xuống dưới mức an toàn 0.85m.`,
            severityCategory: zone.importance === "CRITICAL" ? "HIGH" : "MEDIUM",
            detectionRuleId: "RULE_PATH_OBST_06",
            evidence: {
              measuredValue: `Khoảng cách đến tim lối đi: ${distance.toFixed(2)}m`,
              threshold: `Thông thủy tối thiểu >= 0.85m theo tiêu chuẩn CDC STEADI`,
              rationale: "Lối đi chật hẹp cản trở việc di chuyển bằng gậy hoặc khung tập đi, dễ gây va quệt bầm tím hoặc ngã ngửa.",
              affectedObjectId: obst.id,
              affectedObjectName: obst.name,
              coordinates: obst.position,
            },
            recommendationText:
              "Kê dịch chuyển vật dụng sát vách tường hoặc cất vào tủ, đảm bảo hành lang đi lại rộng tối thiểu 90cm thông suốt.",
            targetObjectId: obst.id,
            status: "ACTIVE",
            referenceIds: ["SRC_CDC_STEADI_2023"],
          });
          break;
        }
      }
    }
    return findings;
  },
};

/**
 * RULE 7: Clutter / Unstable small objects near bed or route (RULE_ROUTE_CLUTTER_07)
 */
export const ruleClutteredPath: RuleDefinition = {
  id: "RULE_ROUTE_CLUTTER_07",
  name: "Đồ đạc lộn xộn bừa bộn xung quanh tuyến đi lại",
  hazardType: "CLUTTERED_PATH",
  defaultSeverity: "LOW",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];
    const clutterObjects = room.objects.filter(
      (obj) => obj.name.toLowerCase().includes("hộp") || obj.name.toLowerCase().includes("đồ") || obj.name.toLowerCase().includes("giày")
    );

    for (const item of clutterObjects) {
      for (const zone of room.walkingZones) {
        const { intersects } = objectIntersectsWalkingZone(item, zone, 0.2);
        if (intersects) {
          findings.push({
            id: `hazard-clutter-${item.id}`,
            hazardType: "CLUTTERED_PATH",
            title: `Đồ vật lộn xộn "${item.name}" gần ${zone.name}`,
            description: `Vật dụng nhỏ để bừa bộn trên mặt sàn tạo nguy cơ bất ngờ vấp trúng khi đi trong bóng tối.`,
            severityCategory: "LOW",
            detectionRuleId: "RULE_ROUTE_CLUTTER_07",
            evidence: {
              measuredValue: `Độ cao vật thể: ${item.dimensions.height}m`,
              threshold: "Sàn nhà khu vực lối đi phải hoàn toàn phong quang",
              rationale: "Thói quen để đồ tạm dưới đất là nguồn gốc của 15% các vụ té ngã nhẹ đến trung bình.",
              affectedObjectId: item.id,
              affectedObjectName: item.name,
              coordinates: item.position,
            },
            recommendationText:
              "Dọn dẹp cất vào kệ cao hoặc ngăn kéo, không để đồ chơi, hộp carton hoặc dép vương vãi trên sàn.",
            targetObjectId: item.id,
            status: "ACTIVE",
            referenceIds: ["SRC_CDC_STEADI_2023"],
          });
          break;
        }
      }
    }
    return findings;
  },
};

/**
 * RULE 8: Dangerous object placement near bed (RULE_DANGEROUS_OBJECT_08)
 */
export const ruleDangerousObject: RuleDefinition = {
  id: "RULE_DANGEROUS_OBJECT_08",
  name: "Bố trí vật sắc nhọn/bàn kính dễ va đập cạnh giường",
  hazardType: "DANGEROUS_OBJECT_PLACEMENT",
  defaultSeverity: "MEDIUM",
  evaluate: (room: RoomState): HazardFindingResult[] => {
    const findings: HazardFindingResult[] = [];
    const bed = room.objects.find((o) => o.modelType === "bed");
    if (!bed) return findings;

    const nearbyTables = room.objects.filter(
      (o) =>
        (o.modelType === "coffee_table" || o.name.toLowerCase().includes("kính")) &&
        Math.hypot(o.position[0] - bed.position[0], o.position[2] - bed.position[2]) < 1.4
    );

    for (const table of nearbyTables) {
      findings.push({
        id: `hazard-danger-${table.id}`,
        hazardType: "DANGEROUS_OBJECT_PLACEMENT",
        title: `Góc bàn cạnh sắc nhọn sát giường ngủ ("${table.name}")`,
        description: `Bàn kính hoặc vật góc cạnh đặt quá gần thành giường (${Math.hypot(table.position[0] - bed.position[0], table.position[2] - bed.position[2]).toFixed(2)}m) gây chấn thương nghiêm trọng nếu trượt chân ngã từ giường xuống.`,
        severityCategory: "MEDIUM",
        detectionRuleId: "RULE_DANGEROUS_OBJECT_08",
        evidence: {
          measuredValue: `Khoảng cách đến mép giường: ${Math.hypot(table.position[0] - bed.position[0], table.position[2] - bed.position[2]).toFixed(2)}m`,
          threshold: "Khoảng đệm an toàn tối thiểu >= 1.0m và bọc đệm bo tròn góc bàn",
          rationale: "Người già dễ choáng váng khi vừa thức giấc bước xuống giường, va đập vào góc nhọn gây rách da hoặc tụ máu.",
          affectedObjectId: table.id,
          affectedObjectName: table.name,
          coordinates: table.position,
        },
        recommendationText:
          "Kê dịch chuyển bàn xa khỏi thành giường tối thiểu 1.2m hoặc bọc silicon đệm bo tròn các góc nhọn nguy hiểm.",
        targetObjectId: table.id,
        status: "ACTIVE",
        referenceIds: ["SRC_CDC_STEADI_2023"],
      });
    }
    return findings;
  },
};

export const ALL_RULES: RuleDefinition[] = [
  ruleLooseRug,
  ruleCableCrossing,
  rulePoorLighting,
  ruleWetFloor,
  ruleMissingGrabBars,
  ruleObstacleRoute,
  ruleClutteredPath,
  ruleDangerousObject,
];

/**
 * Execute all hazard rules against a room state and compute heuristic safety score.
 * Note: Safety score is an educational heuristic review index (0-100), not a clinical probability of falling.
 */
export function runEnvironmentalAssessment(room: RoomState): HazardFindingResult[] {
  const allFindings: HazardFindingResult[] = [];
  for (const rule of ALL_RULES) {
    const findings = rule.evaluate(room);
    allFindings.push(...findings);
  }
  return allFindings;
}

/**
 * Compute an educational heuristic safety index (0-100).
 * High hazard deducts 15 points, Medium deducts 8 points, Low deducts 4 points.
 */
export function calculateSafetyScore(findings: HazardFindingResult[]): number {
  let score = 100;
  for (const finding of findings) {
    if (finding.severityCategory === "HIGH") {
      score -= 15;
    } else if (finding.severityCategory === "MEDIUM") {
      score -= 8;
    } else if (finding.severityCategory === "LOW") {
      score -= 4;
    }
  }
  return Math.max(10, Math.min(100, Math.round(score)));
}

