import { RoomState, HazardFindingResult, SceneObjectState } from "@/types";
import { runEnvironmentalAssessment, calculateSafetyScore } from "@/features/risk-engine/rules";

export type ViewMode = "DOLLHOUSE" | "TOP" | "INTERIOR" | "WALKTHROUGH" | "RISK" | "COMPARE";
export type VisualLighting = "MORNING" | "DAYLIGHT" | "EVENING" | "NIGHT" | "STUDIO";
export type Intervention = "SECURE_RUG" | "MOVE_CABLE" | "CLEAR_OBSTACLE" | "GRAB_BAR" | "NIGHT_LIGHT" | "NON_SLIP";
export const INTERVENTIONS: { id: Intervention; label: string; description: string }[] = [
  { id: "SECURE_RUG", label: "Cố định thảm", description: "Giữ nguyên thảm và bổ sung trạng thái cố định mép." },
  { id: "MOVE_CABLE", label: "Thu gọn dây điện", description: "Luồn dây sát vách, ra khỏi đường di chuyển." },
  { id: "CLEAR_OBSTACLE", label: "Dọn lối đi", description: "Di chuyển vật cản đã ghi nhận ra khỏi vùng đi lại." },
  { id: "GRAB_BAR", label: "Lắp thanh vịn", description: "Thêm thiết bị hỗ trợ tại khu vực vệ sinh." },
  { id: "NIGHT_LIGHT", label: "Thêm đèn đêm", description: "Thêm đèn và giả định độ rọi 120 lux cho kịch bản; cần đo thực tế." },
  { id: "NON_SLIP", label: "Chống trượt sàn", description: "Giả định sàn khô và bề mặt có tính chống trượt." },
];

export const cloneRoom = (room: RoomState): RoomState => JSON.parse(JSON.stringify(room));
export const findingKey = (finding: HazardFindingResult) => `${finding.detectionRuleId}:${finding.targetObjectId || "room"}`;
export function assessRoom(room: RoomState) {
  const findings = runEnvironmentalAssessment(room);
  return { findings, score: calculateSafetyScore(findings) };
}

export function compareRooms(before: RoomState, after: RoomState) {
  const baseline = assessRoom(before);
  const current = assessRoom(after);
  const previous = new Set(baseline.findings.map(findingKey));
  const active = new Set(current.findings.map(findingKey));
  return {
    before: baseline, after: current, delta: current.score - baseline.score,
    resolved: baseline.findings.filter((finding) => !active.has(findingKey(finding))),
    introduced: current.findings.filter((finding) => !previous.has(findingKey(finding))),
  };
}

export function applyIntervention(source: RoomState, intervention: Intervention): RoomState {
  const room = cloneRoom(source);
  const findings = assessRoom(room).findings;
  const confirmedTargets = new Set(findings.map((finding) => finding.targetObjectId).filter(Boolean));
  if (intervention === "SECURE_RUG") {
    room.objects.forEach((object) => {
      if (object.category === "RUG" && confirmedTargets.has(object.id)) { object.isLoose = false; object.isFixed = true; }
    });
  } else if (intervention === "MOVE_CABLE" || intervention === "CLEAR_OBSTACLE") {
    room.objects.forEach((object) => {
      if (!confirmedTargets.has(object.id)) return;
      if (intervention === "MOVE_CABLE" && object.category !== "CABLE") return;
      if (intervention === "CLEAR_OBSTACLE" && object.category !== "OBSTACLE") return;
      const halfWidth = room.dimensions.width / 2;
      const halfLength = room.dimensions.length / 2;
      // Try actual candidate positions and select one outside every walkway.
      const candidates: [number, number, number][] = [
        [halfWidth - object.dimensions.width / 2 - 0.15, object.position[1], halfLength - object.dimensions.length / 2 - 0.2],
        [-halfWidth + object.dimensions.width / 2 + 0.15, object.position[1], halfLength - object.dimensions.length / 2 - 0.2],
        [halfWidth - object.dimensions.width / 2 - 0.15, object.position[1], -halfLength + object.dimensions.length / 2 + 0.2],
      ];
      const cost = (position: [number, number, number]) => assessRoom({ ...room, objects: room.objects.map((item) => item.id === object.id
        ? { ...item, position, isFixed: true, isLoose: false, isWalkwayObstacle: false } : item) }).findings.filter((finding) => finding.targetObjectId === object.id).length;
      candidates.sort((a, b) => cost(a) - cost(b));
      object.position = candidates[0]; object.isFixed = true; object.isLoose = false; object.isWalkwayObstacle = false;
    });
  } else if (intervention === "GRAB_BAR") {
    const toilet = room.objects.find((object) => object.modelType === "toilet");
    const id = `${room.id}-intervention-grab-bar`;
    if (!room.objects.some((object) => object.id === id)) {
      room.objects.push({
        id, roomId: room.id, name: "Thanh vịn đề xuất — cần xác nhận vị trí lắp", category: "SAFETY_DEVICE", modelType: "grab_bar",
        assetId: "safety_grab_bar", position: [room.dimensions.width / 2 - 0.12, 0.8, toilet?.position[2] ?? 0],
        rotation: [0, -Math.PI / 2, 0], scale: [1, 1, 1], dimensions: { width: 0.6, height: 0.1, length: 0.1 },
        isFixed: true, verified: false, customProperties: { geometrySource: "scenario", measurementStatus: "estimated" },
      });
      room.grabBarsCount += 1;
    }
  } else if (intervention === "NIGHT_LIGHT") {
    const id = `${room.id}-intervention-night-light`;
    if (!room.objects.some((object) => object.id === id)) room.objects.push({
      id, roomId: room.id, name: "Đèn đêm đề xuất", category: "LIGHTING", modelType: "lamp",
      position: [-room.dimensions.width / 2 + 0.3, 0, room.dimensions.length / 2 - 0.3], rotation: [0, 0, 0], scale: [1, 1, 1],
      dimensions: { width: 0.2, height: 0.5, length: 0.2 }, isActive: true, verified: false,
    });
    room.lightingLevel = Math.max(room.lightingLevel, 120);
  } else if (intervention === "NON_SLIP") { room.isWet = false; room.isSlipResistant = true; }
  return room;
}

export function findingPosition(finding: HazardFindingResult, room: RoomState): [number, number, number] {
  const object = room.objects.find((item) => item.id === finding.targetObjectId);
  if (object) return [object.position[0], object.position[1] + Math.min(object.dimensions.height, 1.1) + 0.18, object.position[2]];
  if (finding.evidence.coordinates) return finding.evidence.coordinates;
  if (finding.targetArea) return finding.targetArea.min.map((value, index) => (value + finding.targetArea!.max[index]) / 2) as [number, number, number];
  const path = room.walkingZones[0];
  return path ? [path.startPoint[0], 0.3, path.startPoint[1]] : [0, 0.3, 0];
}

export function geometryLabel(room: RoomState) {
  if (room.id.includes("photoreal") || room.id.startsWith("room-bedroom") || room.id.startsWith("room-bathroom")) return "Mô hình mẫu · không phải bản đo nhà thực tế";
  return room.objects.every((object) => object.verified) ? "Dữ liệu đã xác nhận · cần kiểm tra kích thước thực tế" : "Bố trí ước lượng · có thể chỉnh sửa";
}

export function objectProvenance(object: SceneObjectState) {
  return {
    sourceImageId: object.customProperties?.sourceImageId as string | undefined,
    measurementStatus: object.customProperties?.measurementStatus || (object.verified ? "user_verified" : "estimated"),
    confirmationStatus: object.customProperties?.confirmationStatus || (object.verified ? "CONFIRMED" : "NEEDS_REVIEW"),
  };
}

export function serializeExperience(room: RoomState, baseline: RoomState) {
  return JSON.stringify({ version: 1, room, baseline, savedAt: new Date().toISOString() });
}
