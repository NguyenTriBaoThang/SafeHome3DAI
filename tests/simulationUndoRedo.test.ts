import { describe, it, expect, beforeEach } from "vitest";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { INITIAL_ROOMS } from "@/data/mockRooms";

describe("Simulation Store — Undo / Redo & Auto-Fix", () => {
  beforeEach(() => {
    useSimulationStore.setState({
      rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)),
      currentRoomId: INITIAL_ROOMS[0].id,
      undoStack: [],
      redoStack: [],
    });
  });

  it("records undo history when removing an object and supports undo/redo", () => {
    const store = useSimulationStore.getState();
    const currentRoom = store.getCurrentRoom();
    const initialCount = currentRoom.objects.length;
    const objectToRemove = currentRoom.objects[0].id;

    // 1. Remove object
    store.removeObject(objectToRemove);
    expect(useSimulationStore.getState().getCurrentRoom().objects.length).toBe(initialCount - 1);
    expect(useSimulationStore.getState().canUndo()).toBe(true);
    expect(useSimulationStore.getState().canRedo()).toBe(false);

    // 2. Undo removal
    useSimulationStore.getState().undo();
    expect(useSimulationStore.getState().getCurrentRoom().objects.length).toBe(initialCount);
    expect(useSimulationStore.getState().canUndo()).toBe(false);
    expect(useSimulationStore.getState().canRedo()).toBe(true);

    // 3. Redo removal
    useSimulationStore.getState().redo();
    expect(useSimulationStore.getState().getCurrentRoom().objects.length).toBe(initialCount - 1);
    expect(useSimulationStore.getState().canUndo()).toBe(true);
    expect(useSimulationStore.getState().canRedo()).toBe(false);
  });

  it("records undo history when fixing an object", () => {
    const store = useSimulationStore.getState();
    const currentRoom = store.getCurrentRoom();
    const rug = currentRoom.objects.find((o) => o.category === "RUG");
    if (!rug) return;

    expect(rug.isFixed).toBe(false);

    // Fix rug
    store.fixObject(rug.id);
    const fixedRug = useSimulationStore.getState().getCurrentRoom().objects.find((o) => o.id === rug.id);
    expect(fixedRug?.isFixed).toBe(true);
    expect(useSimulationStore.getState().canUndo()).toBe(true);

    // Undo fix
    useSimulationStore.getState().undo();
    const undoneRug = useSimulationStore.getState().getCurrentRoom().objects.find((o) => o.id === rug.id);
    expect(undoneRug?.isFixed).toBe(false);
  });

  it("executes validateAndAutoFixRoom and applies geometric repairs with undo support", () => {
    const store = useSimulationStore.getState();
    // Add a deliberately floating object
    const floatingObj = {
      id: "test-floating-box",
      roomId: store.currentRoomId,
      name: "Hộp lơ lửng",
      category: "OBSTACLE" as const,
      modelType: "box",
      position: [0.5, 0.4, 0.5] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      dimensions: { width: 0.4, length: 0.4, height: 0.4 },
    };

    useSimulationStore.setState((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === s.currentRoomId ? { ...r, objects: [...r.objects, floatingObj] } : r
      ),
    }));

    // Auto fix
    const fixResult = useSimulationStore.getState().validateAndAutoFixRoom();
    expect(fixResult.fixesApplied.length).toBeGreaterThan(0);

    const fixedRoom = useSimulationStore.getState().getCurrentRoom();
    const fixedBox = fixedRoom.objects.find((o) => o.id === "test-floating-box");
    expect(fixedBox?.position[1]).toBe(0); // Snapped to floor

    // Can undo auto-fix
    expect(useSimulationStore.getState().canUndo()).toBe(true);
    useSimulationStore.getState().undo();
    const revertedBox = useSimulationStore.getState().getCurrentRoom().objects.find((o) => o.id === "test-floating-box");
    expect(revertedBox?.position[1]).toBe(0.4);
  });
});
