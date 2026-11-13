"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { RoomEnvironment } from "./RoomEnvironment";
import { ProceduralFurniture } from "./ProceduralFurniture";
import { AlertCircle, AlertTriangle, ShieldCheck } from "lucide-react";

/**
 * Camera controller that smoothly animates camera when preset or focus point changes.
 */
function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { cameraPreset, cameraFocusPoint, getCurrentRoom } = useSimulationStore();
  const room = getCurrentRoom();

  useEffect(() => {
    if (!camera) return;

    if (cameraFocusPoint) {
      // Focus on specific object / coordinate
      const [fx, fy, fz] = cameraFocusPoint;
      camera.position.set(fx + 2.5, fy + 3.0, fz + 2.5);
      camera.lookAt(fx, fy, fz);
      if (controlsRef.current) {
        controlsRef.current.target.set(fx, fy, fz);
        controlsRef.current.update();
      }
      return;
    }

    const dist = Math.max(room.dimensions.width, room.dimensions.length);

    switch (cameraPreset) {
      case "TOP":
        camera.position.set(0, dist * 2.2, 0.001);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
        break;

      case "FRONT":
        camera.position.set(0, room.dimensions.height * 0.7, dist * 1.8);
        camera.lookAt(0, room.dimensions.height * 0.4, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, room.dimensions.height * 0.4, 0);
          controlsRef.current.update();
        }
        break;

      case "ISOMETRIC":
      default:
        camera.position.set(dist * 1.4, dist * 1.6, dist * 1.4);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
        break;
    }
  }, [cameraPreset, cameraFocusPoint, room.id]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.5}
      maxDistance={25}
      maxPolarAngle={cameraPreset === "TOP" ? 0.05 : Math.PI / 2 - 0.02}
    />
  );
}

export const RoomCanvas: React.FC = () => {
  const {
    getCurrentRoom,
    selectedObjectId,
    selectObject,
    showLabels,
    showHazardOverlay,
    showWalkingZones,
    showMeasurements,
    transparentWalls,
    isNightMode,
    currentAssessment,
    focusOnLocation,
  } = useSimulationStore();

  const room = getCurrentRoom();
  const findings = currentAssessment?.findings || [];

  // Map object ID to active hazard finding if any
  const hazardMap = new Map(
    findings
      .filter((f) => f.targetObjectId)
      .map((f) => [f.targetObjectId!, f])
  );

  return (
    <div className="relative w-full h-full min-h-[480px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-2xl overflow-hidden shadow-inner">
      <Canvas
        shadows
        camera={{ position: [7, 8, 7], fov: 42 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerMissed={() => selectObject(null)}
      >
        <CameraController />

        <RoomEnvironment
          room={room}
          showWalkingZones={showWalkingZones}
          showGrid={showMeasurements}
          transparentWalls={transparentWalls}
          isNightMode={isNightMode}
        />

        {/* 3D Scene Objects */}
        {room.objects.map((obj) => {
          const isSelected = selectedObjectId === obj.id;
          const hazard = hazardMap.get(obj.id);
          const hasHazard = Boolean(hazard) && showHazardOverlay;

          return (
            <group key={obj.id}>
              <ProceduralFurniture
                object={obj}
                isSelected={isSelected}
                hasHazard={hasHazard}
                hazardSeverity={hazard?.severityCategory}
                onClick={() => {
                  selectObject(obj.id);
                  focusOnLocation(obj.position);
                }}
              />

              {/* Floating 3D HTML Badge for Hazard Warning or Name Label */}
              {showLabels && (
                <Html
                  position={[
                    obj.position[0],
                    obj.position[1] + obj.dimensions.height + 0.25,
                    obj.position[2],
                  ]}
                  center
                  distanceFactor={10}
                  className="pointer-events-none select-none"
                >
                  <div className="flex flex-col items-center">
                    {hasHazard && (
                      <div className="flex items-center gap-1 px-2 py-0.5 mb-1 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-lg animate-bounce border border-white/50">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Nguy cơ {hazard?.severityCategory}</span>
                      </div>
                    )}
                    <div
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-md shadow transition-all border ${
                        isSelected
                          ? "bg-sky-500 text-white border-sky-300 scale-105"
                          : hasHazard
                          ? "bg-rose-950/80 text-rose-200 border-rose-500/50"
                          : "bg-slate-900/75 text-slate-200 border-slate-700/60"
                      }`}
                    >
                      {obj.name}
                    </div>
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </Canvas>

      {/* Floating 3D Overlay Controls in top-right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 text-white text-xs shadow-lg">
        <span className="text-[11px] text-slate-400 font-medium px-2">Góc nhìn:</span>
        <button
          onClick={() => useSimulationStore.getState().setCameraPreset("ISOMETRIC")}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          Isometric
        </button>
        <button
          onClick={() => useSimulationStore.getState().setCameraPreset("TOP")}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          Mặt bằng (Top)
        </button>
        <button
          onClick={() => useSimulationStore.getState().setCameraPreset("FRONT")}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          Chính diện
        </button>
      </div>

      {/* Bottom Floating Visual Toggles */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/60 pointer-events-auto shadow-lg text-xs text-white">
          <label className="flex items-center gap-1.5 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={() => useSimulationStore.getState().toggleLabels()}
              className="rounded text-teal-500 focus:ring-teal-400 h-3.5 w-3.5"
            />
            <span className="text-[11px]">Nhãn vật thể</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={showHazardOverlay}
              onChange={() => useSimulationStore.getState().toggleHazardOverlay()}
              className="rounded text-rose-500 focus:ring-rose-400 h-3.5 w-3.5"
            />
            <span className="text-[11px]">Đánh dấu nguy cơ</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={showWalkingZones}
              onChange={() => useSimulationStore.getState().toggleWalkingZones()}
              className="rounded text-emerald-500 focus:ring-emerald-400 h-3.5 w-3.5"
            />
            <span className="text-[11px]">Hành lang đi lại</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={transparentWalls}
              onChange={() => useSimulationStore.getState().toggleTransparentWalls()}
              className="rounded text-sky-500 focus:ring-sky-400 h-3.5 w-3.5"
            />
            <span className="text-[11px]">Tường trong suốt</span>
          </label>
        </div>

        {/* Legend */}
        <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 pointer-events-auto text-[11px] text-slate-300 flex items-center gap-3 hidden sm:flex">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Nguy cơ cao
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Trung bình
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Hành lang an toàn
          </span>
        </div>
      </div>
    </div>
  );
};

