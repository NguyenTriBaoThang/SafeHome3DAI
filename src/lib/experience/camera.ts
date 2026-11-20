import { RoomState } from "@/types";
import { ViewMode } from "./homeExperience";
import { walkStart } from "./navigation";

export interface CameraPose { position: [number, number, number]; target: [number, number, number]; fov: number }
export function cameraPose(room: RoomState, mode: ViewMode, focus?: [number, number, number] | null, aspect = 1.5): CameraPose {
  const extent = Math.max(room.dimensions.width, room.dimensions.length);
  const distance = extent * (aspect < 1 ? 1.4 : 1.18);
  if (mode === "TOP") return { position: [0, distance * 1.7, 0.01], target: [0, 0, 0], fov: 38 };
  if (mode === "WALKTHROUGH") {
    const position = walkStart(room);
    return { position, target: [position[0], 1.5, position[2] - 1], fov: 65 };
  }
  if (focus && (mode === "INTERIOR" || mode === "RISK")) {
    const x = Math.max(-room.dimensions.width / 2 + 0.3, Math.min(room.dimensions.width / 2 - 0.3, focus[0] + 1.7));
    const z = Math.max(-room.dimensions.length / 2 + 0.3, Math.min(room.dimensions.length / 2 - 0.3, focus[2] + 2.1));
    return { position: [x, Math.max(1.55, focus[1] + 1.35), z], target: [focus[0], Math.max(0.35, focus[1]), focus[2]], fov: 46 };
  }
  if (mode === "INTERIOR") {
    const position = walkStart(room);
    return { position, target: [0, 0.9, -room.dimensions.length * 0.25], fov: 58 };
  }
  return { position: [distance * 0.84, distance * 0.88, distance * 0.99], target: [0, 0.45, -0.1], fov: 38 };
}

export function storyPose(room: RoomState, chapter: number, progress: number, focus: [number, number, number] | null, aspect: number): CameraPose {
  const bed = room.objects.find((object) => object.modelType === "bed");
  const bedroom: [number, number, number] = bed ? [bed.position[0], 0.5, bed.position[2]] : [0, 0.5, 0];
  const poses = [
    cameraPose(room, "DOLLHOUSE", null, aspect), cameraPose(room, "INTERIOR", bedroom, aspect),
    cameraPose(room, "DOLLHOUSE", null, aspect), cameraPose(room, "RISK", focus || bedroom, aspect),
    cameraPose(room, "INTERIOR", focus || bedroom, aspect), cameraPose(room, "COMPARE", null, aspect),
  ];
  const first = poses[Math.max(0, Math.min(5, chapter))];
  const second = poses[Math.min(5, chapter + 1)];
  const value = Math.max(0, Math.min(1, (progress - 0.45) / 0.55));
  const eased = value * value * (3 - 2 * value);
  const blend = (a: number[], b: number[]) => a.map((item, index) => item + (b[index] - item) * eased) as [number, number, number];
  return { position: blend(first.position, second.position), target: blend(first.target, second.target), fov: first.fov + (second.fov - first.fov) * eased };
}
