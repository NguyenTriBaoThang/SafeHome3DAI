"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import * as THREE from "three";
import { RoomState } from "@/types";
import { canWalkTo } from "@/lib/experience/navigation";

export interface WheelchairPadState {
  fwd: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

interface WheelchairDriverProps {
  room: RoomState;
  active: boolean;
  padRef: React.MutableRefObject<WheelchairPadState>;
  onStatusChange?: (status: { blocked: boolean; turningClear: boolean }) => void;
}

/**
 * Collision check tailored for the wheelchair footprint (radius ~0.32m).
 * Supports both generic SafeHome rooms (via canWalkTo) and the custom Accessible Suite GLB.
 */
function canWheelchairMoveTo(room: RoomState, x: number, z: number, radius = 0.32): boolean {
  if (room.id === "room-accessible-suite-01") {
    // Custom Accessible Suite GLB centered around (0, 0, 0) (offset X = -2.95, Z = +0.25 from Blender space)
    // Bedroom interior: X in [-2.85, 1.55], Z in [-1.95, 1.95]
    // Zero-threshold bathroom doorway: X in [1.30, 2.05], Z in [-0.15, 0.90]
    // Bathroom interior: X in [1.80, 3.85], Z in [-1.70, 1.15]
    const inBedroom = x >= -2.70 + radius && x <= 1.65 - radius && z >= -1.85 + radius && z <= 1.95 - radius;
    const inDoorway = x >= 1.30 && x <= 2.15 && z >= -0.05 && z <= 0.88;
    const inBathroom = x >= 1.85 + radius && x <= 3.90 - radius && z >= -1.65 + radius && z <= 1.10 - radius;
    if (!inBedroom && !inDoorway && !inBathroom) return false;

    // Avoid medical bed (X in [-2.30, -0.95], Z in [-1.95, 0.05])
    if (x > -2.35 - radius && x < -0.92 + radius && z > -2.0 && z < 0.05 + radius) return false;
    // Avoid TV console & sofa at south edge (Z > 1.25)
    if (z > 1.30 - radius && x > -1.45 && x < 1.65) return false;

    // Also check dynamic movable obstacles in room.objects (e.g. obj-suite-stool-01 dragged via TransformControls!)
    for (const obj of room.objects) {
      if (obj.assetId?.startsWith("suite_builtin_")) continue;
      if (["rug", "cable", "grab_bar", "night_light", "lamp", "mirror", "wall_art"].includes(obj.modelType)) continue;
      const hw = obj.dimensions.width / 2 + radius;
      const hl = obj.dimensions.length / 2 + radius;
      if (Math.abs(x - obj.position[0]) < hw && Math.abs(z - obj.position[2]) < hl) {
        return false;
      }
    }
    return true;
  }
  return canWalkTo(room, x, z, radius);
}

/**
 * Checks whether a full Ø 1.5m (radius 0.75m) wheelchair turning circle is clear at (x, z).
 */
function isTurningCircleClear(room: RoomState, x: number, z: number): boolean {
  const probes = 8;
  const checkR = 0.56; // Center + outer rim clearance check
  for (let i = 0; i < probes; i++) {
    const a = (i / probes) * Math.PI * 2;
    if (!canWheelchairMoveTo(room, x + Math.cos(a) * checkR, z + Math.sin(a) * checkR, 0.14)) {
      return false;
    }
  }
  return true;
}

export const WheelchairDriver: React.FC<WheelchairDriverProps> = ({
  room,
  active,
  padRef,
  onStatusChange,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const { scene, animations } = useGLTF("/models/safety/elderly_wheelchair_web.glb");

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  const { actions } = useAnimations(animations, groupRef);

  const keysRef = useRef<Record<string, boolean>>({});
  const activeClipRef = useRef<string>("");
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const yawRef = useRef(0.45);
  const [blocked, setBlocked] = useState(false);
  const [turningClear, setTurningClear] = useState(true);

  // Pick a clean starting point whenever the room changes
  useEffect(() => {
    let startX = 0.0;
    let startZ = 0.0;
    if (room.id === "room-accessible-suite-01") {
      startX = 0.0;
      startZ = 0.35;
      yawRef.current = Math.PI * 0.38;
    } else {
      // Find first valid walkable point for wheelchair
      let found = false;
      const candidates: [number, number][] = [
        [0, 0.3],
        [0.4, 0.6],
        [-0.4, 0.6],
        [0, -0.3],
        [0.6, 0.0],
      ];
      for (const [cx, cz] of candidates) {
        if (canWheelchairMoveTo(room, cx, cz, 0.28)) {
          startX = cx;
          startZ = cz;
          found = true;
          break;
        }
      }
      if (!found) {
        startX = 0;
        startZ = 0.2;
      }
      yawRef.current = 0;
    }
    posRef.current.set(startX, 0, startZ);
    if (groupRef.current) {
      groupRef.current.position.set(startX, 0, startZ);
      groupRef.current.rotation.y = yawRef.current;
    }
    setBlocked(false);
    setTurningClear(isTurningCircleClear(room, startX, startZ));
  }, [room.id]);

  // Start Idle_Seated animation on load
  useEffect(() => {
    const idle = actions["Idle_Seated"];
    if (idle) {
      idle.reset().fadeIn(0.2).play();
      activeClipRef.current = "Idle_Seated";
    }
    return () => {
      Object.values(actions).forEach((a) => a?.stop());
    };
  }, [actions]);

  // Keyboard listeners for driving the wheelchair (WASD / Arrow keys)
  useEffect(() => {
    if (!active) return;
    const onDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,[contenteditable=true]")) return;
      const code = e.code;
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
        e.preventDefault();
        keysRef.current[code] = true;
      }
      if (code === "ShiftLeft" || code === "ShiftRight") keysRef.current[code] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    const onBlur = () => {
      keysRef.current = {};
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      keysRef.current = {};
    };
  }, [active]);

  const tmpFwd = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const tmpMove = useMemo(() => new THREE.Vector3(), []);
  const frameCounter = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);

    let inFwd = 0;
    let inRight = 0;
    if (active) {
      const k = keysRef.current;
      const p = padRef.current;
      if (k["KeyW"] || k["ArrowUp"] || p.fwd) inFwd += 1;
      if (k["KeyS"] || k["ArrowDown"] || p.back) inFwd -= 1;
      if (k["KeyD"] || k["ArrowRight"] || p.right) inRight += 1;
      if (k["KeyA"] || k["ArrowLeft"] || p.left) inRight -= 1;
    }

    const moving = inFwd !== 0 || inRight !== 0;
    let isBlockedNow = false;

    if (moving) {
      camera.getWorldDirection(tmpFwd);
      tmpFwd.y = 0;
      if (tmpFwd.lengthSq() < 1e-6) tmpFwd.set(0, 0, -1);
      tmpFwd.normalize();
      tmpRight.crossVectors(tmpFwd, camera.up).normalize();

      tmpMove
        .set(0, 0, 0)
        .addScaledVector(tmpFwd, inFwd)
        .addScaledVector(tmpRight, inRight)
        .normalize();

      const fast = !!(keysRef.current["ShiftLeft"] || keysRef.current["ShiftRight"]);
      const speed = fast ? 1.55 : 0.95;
      const stepX = tmpMove.x * speed * dt;
      const stepZ = tmpMove.z * speed * dt;

      const targetYaw = Math.atan2(tmpMove.x, tmpMove.z);
      let diff = targetYaw - yawRef.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yawRef.current += diff * Math.min(1, dt * 8.5);

      const nx = posRef.current.x + stepX;
      const nz = posRef.current.z + stepZ;

      // Try full move, then axis-sliding along walls/furniture!
      if (canWheelchairMoveTo(room, nx, nz)) {
        posRef.current.x = nx;
        posRef.current.z = nz;
      } else if (canWheelchairMoveTo(room, nx, posRef.current.z)) {
        posRef.current.x = nx;
        isBlockedNow = true;
      } else if (canWheelchairMoveTo(room, posRef.current.x, nz)) {
        posRef.current.z = nz;
        isBlockedNow = true;
      } else {
        isBlockedNow = true;
      }

      groupRef.current.position.copy(posRef.current);
      groupRef.current.rotation.y = yawRef.current;

      // Switch to Wheelchair_Roll animation
      if (activeClipRef.current !== "Wheelchair_Roll" && actions["Wheelchair_Roll"]) {
        actions["Idle_Seated"]?.fadeOut(0.18);
        actions["Wheelchair_Roll"].reset().fadeIn(0.18).play();
        activeClipRef.current = "Wheelchair_Roll";
      }
      if (actions["Wheelchair_Roll"]) {
        actions["Wheelchair_Roll"].timeScale = isBlockedNow ? 0.25 : fast ? 1.55 : 1.05;
      }
    } else if (activeClipRef.current !== "Idle_Seated" && actions["Idle_Seated"]) {
      actions["Wheelchair_Roll"]?.fadeOut(0.22);
      actions["Idle_Seated"].reset().fadeIn(0.22).play();
      activeClipRef.current = "Idle_Seated";
    }

    // Periodic ergonomic turning-circle check (every 10 frames)
    frameCounter.current++;
    if (frameCounter.current % 10 === 0 || isBlockedNow !== blocked) {
      const clear = isTurningCircleClear(room, posRef.current.x, posRef.current.z);
      if (isBlockedNow !== blocked) setBlocked(isBlockedNow);
      if (clear !== turningClear) setTurningClear(clear);
      onStatusChange?.({ blocked: isBlockedNow, turningClear: clear });
    }
  });

  const ringColor = blocked ? "#f43f5e" : turningClear ? "#10b981" : "#f59e0b";

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />

      {/* Live Ø 1.5m (radius 0.75m) Geriatric Wheelchair Turning Circle Indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <ringGeometry args={[0.72, 0.76, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.72, 48]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {/* Live Ergonomic Clearance Badge */}
      <Html position={[0, 1.52, 0]} center distanceFactor={10} className="pointer-events-none select-none">
        <div
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg border whitespace-nowrap backdrop-blur-md ${
            blocked
              ? "bg-rose-950/90 text-rose-200 border-rose-500"
              : turningClear
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500"
              : "bg-amber-950/90 text-amber-200 border-amber-500"
          }`}
        >
          {blocked
            ? "⚠ Vướng vật cản / Lối đi hẹp"
            : turningClear
            ? "✓ Xe lăn Ø1.5m — Đạt chuẩn xoay"
            : "ℹ Lối đi qua được — Hẹp vòng xoay Ø1.5m"}
        </div>
      </Html>
    </group>
  );
};

useGLTF.preload("/models/safety/elderly_wheelchair_web.glb");
