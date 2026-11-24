import { create } from "zustand";
import {
  RoomState,
  SceneObjectState,
  AssessmentResult,
  HazardFindingResult,
  ScenarioComparison,
} from "@/types";
import { INITIAL_ROOMS } from "@/data/mockRooms";
import { unverifiedPhotoAssessment } from "@/lib/vision/photoSceneDraft";
import {
  runEnvironmentalAssessment,
  calculateSafetyScore,
} from "@/features/risk-engine/rules";
import {
  autoFixSceneGeometry,
  AutoFixResult,
} from "@/lib/reconstruction/spatialValidationEngine";

export interface ScenarioHistoryEntry {
  id: string;
  name: string;
  timestamp: string;
  roomState: RoomState;
  assessment: AssessmentResult;
  isBaseline: boolean;
}

export interface Copilot3DAction {
  action: "FOCUS_OBJECT" | "FOCUS_ROOM" | "SET_CAMERA_MODE" | "HIGHLIGHT_RISK";
  targetId?: string;
  roomId?: string;
  mode?: "ISOMETRIC" | "TOP" | "FRONT" | "FREE" | "INTERIOR" | "WALKTHROUGH" | "SAFETY" | "COMPARISON";
  label?: string;
  timestamp: number;
}

interface SimulationStore {
  // Room and Objects
  rooms: RoomState[];
  currentRoomId: string;
  getCurrentRoom: () => RoomState;

  // Selection & 3D Controls
  selectedObjectId: string | null;
  cameraPreset: "ISOMETRIC" | "TOP" | "FRONT" | "FREE" | "INTERIOR" | "WALKTHROUGH" | "SAFETY" | "COMPARISON";
  cameraFocusPoint: [number, number, number] | null;
  transformMode: "translate" | "rotate" | null;
  lightingPreset: "MORNING" | "AFTERNOON" | "NIGHT" | "STUDIO";

  // Copilot 3D Action Bridge
  copilotPendingAction: Copilot3DAction | null;
  setCopilotPendingAction: (action: Copilot3DAction | null) => void;
  clearCopilotPendingAction: () => void;
  executeCopilotAction: (action: Copilot3DAction) => { success: boolean; message: string };

  // View Options
  showLabels: boolean;
  showHazardOverlay: boolean;
  showWalkingZones: boolean;
  showMeasurements: boolean;
  transparentWalls: boolean;
  isNightMode: boolean;

  // Assessments & Scenarios
  baselineAssessments: Record<string, AssessmentResult>;
  baselineRoomStates: Record<string, RoomState>;
  currentAssessment: AssessmentResult | null;
  scenarioHistory: ScenarioHistoryEntry[];
  comparison: ScenarioComparison | null;

  // Actions
  switchRoom: (roomId: string) => void;
  selectObject: (id: string | null) => void;
  setCameraPreset: (preset: "ISOMETRIC" | "TOP" | "FRONT" | "FREE" | "INTERIOR" | "WALKTHROUGH" | "SAFETY" | "COMPARISON") => void;
  setLightingPreset: (preset: "MORNING" | "AFTERNOON" | "NIGHT" | "STUDIO") => void;
  focusOnLocation: (point: [number, number, number] | null) => void;
  setTransformMode: (mode: "translate" | "rotate" | null) => void;

  toggleLabels: () => void;
  toggleHazardOverlay: () => void;
  toggleWalkingZones: () => void;
  toggleMeasurements: () => void;
  toggleTransparentWalls: () => void;
  toggleNightMode: () => void;

  updateObjectPosition: (id: string, pos: [number, number, number]) => void;
  updateObjectRotation: (id: string, rot: [number, number, number]) => void;
  updateObjectProperties: (id: string, updates: Partial<SceneObjectState>) => void;
  removeObject: (id: string) => void;
  fixObject: (id: string) => void; // Quick fix: e.g. fix rug with anti-slip tape or tuck cable into wall trunking
  addSafetyDevice: (deviceType: "grab_bar_toilet" | "grab_bar_shower" | "anti_slip_mat" | "night_light") => void;

  setLightingLevel: (lux: number) => void;
  setFloorWetness: (isWet: boolean) => void;
  setAntiSlip: (isSlip: boolean) => void;
  setGrabBarsCount: (count: number) => void;

  runSimulation: () => AssessmentResult;
  restoreBaseline: () => void;
  saveCurrentScenario: (name: string, description?: string) => void;
  loadReconstructedRoom: (room: RoomState) => void;
  applyRoomSnapshot: (room: RoomState) => void;

  // Undo / Redo & Spatial Auto-Fix
  undoStack: RoomState[];
  redoStack: RoomState[];
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  validateAndAutoFixRoom: () => AutoFixResult;
}

export const useSimulationStore = create<SimulationStore>((set, get) => {
  // Initialize baseline assessments for all rooms
  const initialBaselines: Record<string, AssessmentResult> = {};
  for (const r of INITIAL_ROOMS) {
    const findings = runEnvironmentalAssessment(r);
    const score = calculateSafetyScore(findings);
    initialBaselines[r.id] = {
      id: `assessment-base-${r.id}`,
      roomId: r.id,
      timestamp: new Date().toISOString(),
      totalHazards: findings.length,
      resolvedHazards: 0,
      remainingHazards: findings.length,
      newHazards: 0,
      safetyScore: score,
      findings,
      notes: "Đánh giá hiện trạng ban đầu (Baseline)",
    };
  }

  // Find dollhouse room or fallback to first
  const dollhouseRoom = INITIAL_ROOMS.find((r) => r.id === "room-photoreal-dollhouse-01");
  const defaultRoomId = dollhouseRoom ? dollhouseRoom.id : INITIAL_ROOMS[0].id;
  const initialCurrentAssessment = initialBaselines[defaultRoomId] || initialBaselines[INITIAL_ROOMS[0].id];

  return {
    rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
    currentRoomId: defaultRoomId,
    getCurrentRoom: () => {
      const state = get();
      return (
        state.rooms.find((r) => r.id === state.currentRoomId) || state.rooms[0]
      );
    },

    selectedObjectId: null,
    cameraPreset: "ISOMETRIC",
    cameraFocusPoint: null,
    transformMode: "translate",
    lightingPreset: "MORNING",

    showLabels: true,
    showHazardOverlay: true,
    showWalkingZones: true,
    showMeasurements: false,
    transparentWalls: true,
    isNightMode: false,

    baselineAssessments: initialBaselines,
    baselineRoomStates: Object.fromEntries(INITIAL_ROOMS.map((room) => [room.id, JSON.parse(JSON.stringify(room))])),
    currentAssessment: initialCurrentAssessment,
    scenarioHistory: [
      {
        id: "scenario-baseline",
        name: "Hiện trạng ban đầu (Baseline)",
        timestamp: new Date().toISOString(),
        roomState: JSON.parse(JSON.stringify(dollhouseRoom || INITIAL_ROOMS[0])),
        assessment: initialCurrentAssessment,
        isBaseline: true,
      },
    ],
    comparison: null,

    copilotPendingAction: null,
    setCopilotPendingAction: (action) => set({ copilotPendingAction: action }),
    clearCopilotPendingAction: () => set({ copilotPendingAction: null }),
    executeCopilotAction: (action) => {
      const state = get();
      if (action.action === "FOCUS_OBJECT" && action.targetId) {
        let foundObj: any = null;
        let foundRoom: any = null;

        for (const r of state.rooms) {
          const o = r.objects.find((it) => it.id === action.targetId || it.modelType === action.targetId);
          if (o) {
            foundObj = o;
            foundRoom = r;
            break;
          }
        }

        if (foundObj) {
          if (foundRoom.id !== state.currentRoomId) {
            state.switchRoom(foundRoom.id);
          }
          set({
            selectedObjectId: foundObj.id,
            cameraFocusPoint: foundObj.position,
            cameraPreset: "INTERIOR",
            showHazardOverlay: true,
          });
          return { success: true, message: `Đã định vị và tập trung máy quay vào ${foundObj.name}` };
        }
        return { success: false, message: `Không tìm thấy đồ vật ${action.targetId}` };
      }

      if (action.action === "FOCUS_ROOM" && action.roomId) {
        state.switchRoom(action.roomId);
        set({ cameraFocusPoint: null, cameraPreset: "ISOMETRIC" });
        return { success: true, message: `Đã chuyển sang phòng ${action.roomId}` };
      }

      if (action.action === "SET_CAMERA_MODE" && action.mode) {
        state.setCameraPreset(action.mode);
        return { success: true, message: `Đã đổi góc nhìn sang ${action.mode}` };
      }

      if (action.action === "HIGHLIGHT_RISK" && action.targetId) {
        const finding = state.currentAssessment?.findings.find(
          (f) => f.id === action.targetId || f.detectionRuleId === action.targetId
        );
        if (finding && finding.targetObjectId) {
          const obj = state.getCurrentRoom().objects.find((o) => o.id === finding.targetObjectId);
          if (obj) {
            set({
              selectedObjectId: obj.id,
              cameraFocusPoint: obj.position,
              cameraPreset: "SAFETY",
              showHazardOverlay: true,
            });
            return { success: true, message: `Đã kích hoạt cảnh báo [${finding.title}] trên 3D` };
          }
        }
        set({ cameraPreset: "SAFETY", showHazardOverlay: true });
        return { success: true, message: `Đã bật hiển thị cảnh báo rủi ro 3D` };
      }

      return { success: false, message: "Hành động không xác định" };
    },

    switchRoom: (roomId: string) => {
      const room = get().rooms.find((r) => r.id === roomId);
      if (!room) return;
      const findings = runEnvironmentalAssessment(room);
      const score = calculateSafetyScore(findings);
      const assessment: AssessmentResult = {
        id: `assessment-${roomId}-${Date.now()}`,
        roomId,
        timestamp: new Date().toISOString(),
        totalHazards: findings.length,
        resolvedHazards: 0,
        remainingHazards: findings.length,
        newHazards: 0,
        safetyScore: score,
        findings,
        notes: `Chuyển sang ${room.name}`,
      };

      set({
        currentRoomId: roomId,
        selectedObjectId: null,
        cameraFocusPoint: null,
        currentAssessment: assessment,
        comparison: null,
      });
    },

    selectObject: (id) => set({ selectedObjectId: id }),
    setCameraPreset: (preset) => set({ cameraPreset: preset }),
    setLightingPreset: (preset) => {
      const isNight = preset === "NIGHT";
      const room = get().getCurrentRoom();
      const updatedRooms = get().rooms.map((r) => {
        if (r.id === room.id) {
          return {
            ...r,
            lightingLevel: isNight ? 40 : preset === "MORNING" ? 320 : 250,
          };
        }
        return r;
      });
      set({ lightingPreset: preset, isNightMode: isNight, rooms: updatedRooms });
      get().runSimulation();
    },
    focusOnLocation: (point) => set({ cameraFocusPoint: point }),
    setTransformMode: (mode) => set({ transformMode: mode }),

    toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
    toggleHazardOverlay: () =>
      set((s) => ({ showHazardOverlay: !s.showHazardOverlay })),
    toggleWalkingZones: () =>
      set((s) => ({ showWalkingZones: !s.showWalkingZones })),
    toggleMeasurements: () =>
      set((s) => ({ showMeasurements: !s.showMeasurements })),
    toggleTransparentWalls: () =>
      set((s) => ({ transparentWalls: !s.transparentWalls })),
    toggleNightMode: () => {
      const newNight = !get().isNightMode;
      const room = get().getCurrentRoom();
      const updatedRooms = get().rooms.map((r) => {
        if (r.id === room.id) {
          return {
            ...r,
            lightingLevel: newNight ? 40 : 250,
          };
        }
        return r;
      });
      set({ isNightMode: newNight, rooms: updatedRooms });
      get().runSimulation();
    },

    updateObjectPosition: (id, pos) => {
      const currentRoom = get().getCurrentRoom();
      // Constrain within room boundaries: [-width/2 + 0.3, width/2 - 0.3]
      const halfW = currentRoom.dimensions.width / 2 - 0.3;
      const halfL = currentRoom.dimensions.length / 2 - 0.3;
      const clampedX = Math.max(-halfW, Math.min(halfW, pos[0]));
      const clampedZ = Math.max(-halfL, Math.min(halfL, pos[2]));
      const clampedPos: [number, number, number] = [clampedX, pos[1], clampedZ];

      const updatedRooms = get().rooms.map((room) => {
        if (room.id !== get().currentRoomId) return room;
        return {
          ...room,
          objects: room.objects.map((obj) =>
            obj.id === id ? { ...obj, position: clampedPos } : obj
          ),
        };
      });
      set({ rooms: updatedRooms });
    },

    updateObjectRotation: (id, rot) => {
      const updatedRooms = get().rooms.map((room) => {
        if (room.id !== get().currentRoomId) return room;
        return {
          ...room,
          objects: room.objects.map((obj) =>
            obj.id === id ? { ...obj, rotation: rot } : obj
          ),
        };
      });
      set({ rooms: updatedRooms });
    },

    updateObjectProperties: (id, updates) => {
      const updatedRooms = get().rooms.map((room) => {
        if (room.id !== get().currentRoomId) return room;
        return {
          ...room,
          objects: room.objects.map((obj) =>
            obj.id === id ? { ...obj, ...updates } : obj
          ),
        };
      });
      set({ rooms: updatedRooms });
    },

    removeObject: (id) => {
      const curRoom = get().getCurrentRoom();
      const newUndo = [...get().undoStack, JSON.parse(JSON.stringify(curRoom))].slice(-20);
      const updatedRooms = get().rooms.map((room) => {
        if (room.id !== get().currentRoomId) return room;
        return {
          ...room,
          objects: room.objects.filter((obj) => obj.id !== id),
        };
      });
      set({
        rooms: updatedRooms,
        undoStack: newUndo,
        redoStack: [],
        selectedObjectId: get().selectedObjectId === id ? null : get().selectedObjectId,
      });
      get().runSimulation();
    },

    fixObject: (id) => {
      const curRoom = get().getCurrentRoom();
      const newUndo = [...get().undoStack, JSON.parse(JSON.stringify(curRoom))].slice(-20);
      const updatedRooms = get().rooms.map((room) => {
        if (room.id !== get().currentRoomId) return room;
        return {
          ...room,
          objects: room.objects.map((obj) => {
            if (obj.id === id) {
              if (obj.category === "RUG") {
                return {
                  ...obj,
                  isLoose: false,
                  isFixed: true,
                  name: `${obj.name} (Đã dán băng dính & lót cao su chống trượt)`,
                };
              }
              if (obj.category === "CABLE") {
                return {
                  ...obj,
                  isFixed: true,
                  position: [
                    room.dimensions.width / 2 - 0.2,
                    0.02,
                    obj.position[2],
                  ] as [number, number, number],
                  name: `${obj.name} (Đã luồn nẹp sát vách)`,
                };
              }
              if (obj.category === "OBSTACLE") {
                return {
                  ...obj,
                  isWalkwayObstacle: false,
                  position: [
                    -room.dimensions.width / 2 + 0.4,
                    obj.position[1],
                    -room.dimensions.length / 2 + 0.5,
                  ] as [number, number, number],
                  name: `${obj.name} (Đã kê sát góc tường)`,
                };
              }
            }
            return obj;
          }),
        };
      });
      set({ rooms: updatedRooms, undoStack: newUndo, redoStack: [] });
      get().runSimulation();
    },

    addSafetyDevice: (deviceType) => {
      const room = get().getCurrentRoom();
      const newUndo = [...get().undoStack, JSON.parse(JSON.stringify(room))].slice(-20);
      let newObj: SceneObjectState;

      if (deviceType === "grab_bar_toilet") {
        newObj = {
          id: `safety-grabbar-${Date.now()}`,
          roomId: room.id,
          name: "Thanh tay vịn trợ lực Inox (Cạnh bồn cầu)",
          category: "SAFETY_DEVICE",
          modelType: "grab_bar",
          position: [-0.6, 0.85, -0.8],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.1, length: 0.6, height: 0.1 },
          isFixed: true,
        };
      } else if (deviceType === "grab_bar_shower") {
        newObj = {
          id: `safety-grabbar-shw-${Date.now()}`,
          roomId: room.id,
          name: "Thanh tay vịn buồng tắm vòi sen",
          category: "SAFETY_DEVICE",
          modelType: "grab_bar",
          position: [0.75, 0.9, -0.3],
          rotation: [0, Math.PI / 2, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.1, length: 0.6, height: 0.1 },
          isFixed: true,
        };
      } else if (deviceType === "anti_slip_mat") {
        newObj = {
          id: `safety-mat-${Date.now()}`,
          roomId: room.id,
          name: "Thảm cao su chống trượt giác hút thoát nước",
          category: "SAFETY_DEVICE",
          modelType: "rug",
          position: [0.5, 0.015, -0.6],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.8, length: 0.8, height: 0.02 },
          isFixed: true,
          isLoose: false,
          isSlippery: false,
        };
      } else {
        newObj = {
          id: `safety-light-${Date.now()}`,
          roomId: room.id,
          name: "Đèn ngủ cảm biến chuyển động chân tường",
          category: "LIGHTING",
          modelType: "lamp",
          position: [1.6, 0.3, 1.0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.15, length: 0.15, height: 0.15 },
          isFixed: true,
        };
      }

      const updatedRooms = get().rooms.map((r) => {
        if (r.id !== room.id) return r;
        const newBarsCount =
          deviceType.startsWith("grab_bar") ? r.grabBarsCount + 1 : r.grabBarsCount;
        return {
          ...r,
          grabBarsCount: newBarsCount,
          objects: [...r.objects, newObj],
        };
      });

      set({ rooms: updatedRooms, undoStack: newUndo, redoStack: [] });
      get().runSimulation();
    },

    setLightingLevel: (lux: number) => {
      const current = get().getCurrentRoom();
      const newUndo = [...get().undoStack, JSON.parse(JSON.stringify(current))].slice(-20);
      const updatedRooms = get().rooms.map((r) =>
        r.id === current.id ? { ...r, lightingLevel: lux } : r
      );
      set({ rooms: updatedRooms, undoStack: newUndo, redoStack: [] });
      get().runSimulation();
    },

    setFloorWetness: (isWet: boolean) => {
      const current = get().getCurrentRoom();
      const newUndo = [...get().undoStack, JSON.parse(JSON.stringify(current))].slice(-20);
      const updatedRooms = get().rooms.map((r) =>
        r.id === current.id ? { ...r, isWet } : r
      );
      set({ rooms: updatedRooms, undoStack: newUndo, redoStack: [] });
      get().runSimulation();
    },

    setAntiSlip: (isSlip: boolean) => {
      const current = get().getCurrentRoom();
      const newUndo = [...get().undoStack, JSON.parse(JSON.stringify(current))].slice(-20);
      const updatedRooms = get().rooms.map((r) =>
        r.id === current.id ? { ...r, isSlipResistant: isSlip } : r
      );
      set({ rooms: updatedRooms, undoStack: newUndo, redoStack: [] });
      get().runSimulation();
    },

    setGrabBarsCount: (count: number) => {
      const current = get().getCurrentRoom();
      const newUndo = [...get().undoStack, JSON.parse(JSON.stringify(current))].slice(-20);
      const updatedRooms = get().rooms.map((r) =>
        r.id === current.id ? { ...r, grabBarsCount: count } : r
      );
      set({ rooms: updatedRooms, undoStack: newUndo, redoStack: [] });
      get().runSimulation();
    },

    runSimulation: () => {
      const currentRoom = get().getCurrentRoom();
      if (currentRoom.evidenceStatus === "PHOTO_DRAFT") {
        const assessment = unverifiedPhotoAssessment(currentRoom);
        set({ currentAssessment: assessment, comparison: null });
        return assessment;
      }
      const baseline =
        get().baselineAssessments[currentRoom.id] ||
        get().baselineAssessments[INITIAL_ROOMS[0].id];

      const currentFindings = runEnvironmentalAssessment(currentRoom);
      const currentScore = calculateSafetyScore(currentFindings);

      // Determine resolved vs newly introduced vs remaining hazards
      const baselineRuleMap = new Map(
        baseline.findings.map((f) => [f.detectionRuleId + "-" + (f.targetObjectId || "gen"), f])
      );
      const currentRuleMap = new Map(
        currentFindings.map((f) => [f.detectionRuleId + "-" + (f.targetObjectId || "gen"), f])
      );

      const resolved: HazardFindingResult[] = [];
      baselineRuleMap.forEach((bFinding, key) => {
        if (!currentRuleMap.has(key)) {
          resolved.push({ ...bFinding, status: "RESOLVED" });
        }
      });

      const newlyIntroduced: HazardFindingResult[] = [];
      const remaining: HazardFindingResult[] = [];
      currentRuleMap.forEach((cFinding, key) => {
        if (!baselineRuleMap.has(key)) {
          newlyIntroduced.push({ ...cFinding, status: "NEW" });
        } else {
          remaining.push(cFinding);
        }
      });

      const assessmentResult: AssessmentResult = {
        id: `assessment-${currentRoom.id}-${Date.now()}`,
        roomId: currentRoom.id,
        timestamp: new Date().toISOString(),
        totalHazards: currentFindings.length,
        resolvedHazards: resolved.length,
        remainingHazards: remaining.length,
        newHazards: newlyIntroduced.length,
        safetyScore: currentScore,
        findings: currentFindings,
        notes: `Mô phỏng cập nhật: Giải quyết ${resolved.length} nguy cơ, còn lại ${remaining.length} nguy cơ.`,
      };

      const comparison: ScenarioComparison = {
        baselineScenarioId: baseline.id,
        currentScenarioId: assessmentResult.id,
        resolved,
        remaining,
        newlyIntroduced,
        baselineScore: baseline.safetyScore ?? 0,
        currentScore: currentScore,
        scoreDelta: currentScore - (baseline.safetyScore ?? 0),
      };

      set({
        currentAssessment: assessmentResult,
        comparison,
      });

      return assessmentResult;
    },

    restoreBaseline: () => {
      const roomId = get().currentRoomId;
      const initialRoom = get().baselineRoomStates[roomId] || INITIAL_ROOMS.find((r) => r.id === roomId) || get().getCurrentRoom();
      const updatedRooms = get().rooms.map((r) =>
        r.id === roomId ? JSON.parse(JSON.stringify(initialRoom)) : r
      );
      const baseline = get().baselineAssessments[roomId];

      set({
        rooms: updatedRooms,
        currentAssessment: baseline,
        comparison: null,
        selectedObjectId: null,
        cameraFocusPoint: null,
      });
    },

    saveCurrentScenario: (name, description) => {
      const currentRoom = get().getCurrentRoom();
      const assessment = get().currentAssessment || get().runSimulation();
      const entry: ScenarioHistoryEntry = {
        id: `scenario-${Date.now()}`,
        name,
        timestamp: new Date().toISOString(),
        roomState: JSON.parse(JSON.stringify(currentRoom)),
        assessment,
        isBaseline: false,
      };
      set((s) => ({ scenarioHistory: [entry, ...s.scenarioHistory] }));
    },

    applyRoomSnapshot: (room: RoomState) => {
      const previous = get().getCurrentRoom();
      if (room.id !== previous.id) throw new Error("Kịch bản phải thuộc phòng đang chọn.");
      set((state) => ({
        rooms: state.rooms.map((entry) => entry.id === room.id ? JSON.parse(JSON.stringify(room)) : entry),
        undoStack: [...state.undoStack, JSON.parse(JSON.stringify(previous))].slice(-20),
        redoStack: [],
      }));
      get().runSimulation();
    },

    loadReconstructedRoom: (room: RoomState) => {
      const findings = runEnvironmentalAssessment(room);
      const score = calculateSafetyScore(findings);
      const assessment: AssessmentResult = room.evidenceStatus === "PHOTO_DRAFT" ? unverifiedPhotoAssessment(room) : {
        id: `assessment-live-${room.id}`,
        roomId: room.id,
        timestamp: new Date().toISOString(),
        totalHazards: findings.length,
        resolvedHazards: 0,
        remainingHazards: findings.length,
        newHazards: 0,
        safetyScore: score,
        findings,
        notes: "Không gian 3D được tái dựng từ AI Scanner",
      };

      set((state) => {
        const existingIdx = state.rooms.findIndex((r) => r.id === room.id);
        let updatedRooms: RoomState[];
        if (existingIdx >= 0) {
          updatedRooms = [...state.rooms];
          updatedRooms[existingIdx] = room;
        } else {
          updatedRooms = [room, ...state.rooms];
        }

        return {
          rooms: updatedRooms,
          currentRoomId: room.id,
          currentAssessment: assessment,
          comparison: null,
          selectedObjectId: null,
          cameraFocusPoint: null,
          baselineAssessments: {
            ...state.baselineAssessments,
            [room.id]: assessment,
          },
          baselineRoomStates: { ...state.baselineRoomStates, [room.id]: JSON.parse(JSON.stringify(room)) },
        };
      });
    },

    undoStack: [],
    redoStack: [],
    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    undo: () => {
      const { undoStack, redoStack, currentRoomId, rooms } = get();
      if (undoStack.length === 0) return;
      const currentRoom = rooms.find((r) => r.id === currentRoomId);
      if (!currentRoom) return;
      const previousRoom = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);
      const newRedoStack = [...redoStack, JSON.parse(JSON.stringify(currentRoom))];
      const updatedRooms = rooms.map((r) =>
        r.id === currentRoomId ? JSON.parse(JSON.stringify(previousRoom)) : r
      );
      set({
        rooms: updatedRooms,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      });
      get().runSimulation();
    },

    redo: () => {
      const { undoStack, redoStack, currentRoomId, rooms } = get();
      if (redoStack.length === 0) return;
      const currentRoom = rooms.find((r) => r.id === currentRoomId);
      if (!currentRoom) return;
      const nextRoom = redoStack[redoStack.length - 1];
      const newRedoStack = redoStack.slice(0, -1);
      const newUndoStack = [...undoStack, JSON.parse(JSON.stringify(currentRoom))];
      const updatedRooms = rooms.map((r) =>
        r.id === currentRoomId ? JSON.parse(JSON.stringify(nextRoom)) : r
      );
      set({
        rooms: updatedRooms,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      });
      get().runSimulation();
    },

    validateAndAutoFixRoom: () => {
      const currentRoom = get().getCurrentRoom();
      const fixResult = autoFixSceneGeometry(currentRoom);
      if (fixResult.fixesApplied.length > 0) {
        const { undoStack, rooms, currentRoomId } = get();
        const newUndoStack = [
          ...undoStack,
          JSON.parse(JSON.stringify(currentRoom)),
        ].slice(-20);
        const updatedRooms = rooms.map((r) =>
          r.id === currentRoomId ? fixResult.fixedRoom : r
        );
        set({
          rooms: updatedRooms,
          undoStack: newUndoStack,
          redoStack: [],
        });
        get().runSimulation();
      }
      return fixResult;
    },
  };
});
