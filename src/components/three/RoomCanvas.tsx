"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { RoomEnvironment } from "./RoomEnvironment";
import { ProceduralFurniture } from "./ProceduralFurniture";
import {
  AlertTriangle,
  Layers,
  Eye,
  Sliders,
  Maximize2,
  ChevronDown,
  Info,
  CheckCircle2,
} from "lucide-react";
import { SceneObjectState, HazardFindingResult } from "@/types";

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

interface HazardCluster {
  id: string;
  position: [number, number, number];
  items: Array<{
    object: SceneObjectState;
    hazard: HazardFindingResult;
  }>;
  highestSeverity: "HIGH" | "MEDIUM" | "LOW";
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

  const [clusterMarkers, setClusterMarkers] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);

  const room = getCurrentRoom();
  const findings = currentAssessment?.findings || [];

  // Map object ID to active hazard finding if any
  const hazardMap = useMemo(() => {
    return new Map(
      findings
        .filter((f) => f.targetObjectId)
        .map((f) => [f.targetObjectId!, f])
    );
  }, [findings]);

  // Cluster nearby hazard markers if distance < 0.95m
  const { clusters, unclusteredHazards, clusteredObjectIds } = useMemo(() => {
    if (!clusterMarkers || !showHazardOverlay) {
      return { clusters: [], unclusteredHazards: [], clusteredObjectIds: new Set<string>() };
    }

    const hazardObjects: Array<{ object: SceneObjectState; hazard: HazardFindingResult }> = [];
    room.objects.forEach((obj) => {
      const hazard = hazardMap.get(obj.id);
      if (hazard) {
        hazardObjects.push({ object: obj, hazard });
      }
    });

    const clustered = new Set<string>();
    const foundClusters: HazardCluster[] = [];

    for (let i = 0; i < hazardObjects.length; i++) {
      if (clustered.has(hazardObjects[i].object.id)) continue;

      const group = [hazardObjects[i]];
      const posA = hazardObjects[i].object.position;

      for (let j = i + 1; j < hazardObjects.length; j++) {
        if (clustered.has(hazardObjects[j].object.id)) continue;
        const posB = hazardObjects[j].object.position;
        const dist = Math.hypot(posA[0] - posB[0], posA[2] - posB[2]);

        if (dist < 0.95) {
          group.push(hazardObjects[j]);
        }
      }

      if (group.length > 1) {
        group.forEach((item) => clustered.add(item.object.id));
        // Calculate center
        const avgX = group.reduce((acc, it) => acc + it.object.position[0], 0) / group.length;
        const maxY = Math.max(...group.map((it) => it.object.position[1] + it.object.dimensions.height));
        const avgZ = group.reduce((acc, it) => acc + it.object.position[2], 0) / group.length;

        const hasHigh = group.some((it) => it.hazard.severityCategory === "HIGH");
        const hasMed = group.some((it) => it.hazard.severityCategory === "MEDIUM");

        foundClusters.push({
          id: `cluster-${group.map((g) => g.object.id).join("-")}`,
          position: [avgX, maxY + 0.35, avgZ],
          items: group,
          highestSeverity: hasHigh ? "HIGH" : hasMed ? "MEDIUM" : "LOW",
        });
      }
    }

    const unclustered = hazardObjects.filter((it) => !clustered.has(it.object.id));

    return {
      clusters: foundClusters,
      unclusteredHazards: unclustered,
      clusteredObjectIds: clustered,
    };
  }, [room.objects, hazardMap, clusterMarkers, showHazardOverlay]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-2xl overflow-hidden shadow-inner select-none">
      <Canvas
        shadows
        camera={{ position: [7, 8, 7], fov: 42 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onPointerMissed={() => {
          selectObject(null);
          setExpandedClusterId(null);
        }}
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
          const isClustered = clusteredObjectIds.has(obj.id);

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

              {/* Individual Non-Clustered Hazard Marker */}
              {hasHazard && !isClustered && (
                <Html
                  position={[
                    obj.position[0],
                    obj.position[1] + obj.dimensions.height + 0.28,
                    obj.position[2],
                  ]}
                  center
                  distanceFactor={10}
                  className="pointer-events-auto"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectObject(obj.id);
                      focusOnLocation(obj.position);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow-lg transition-transform hover:scale-110 active:scale-95 border ${
                      hazard?.severityCategory === "HIGH"
                        ? "bg-rose-600 hover:bg-rose-700 border-rose-300 ring-2 ring-rose-500/40 animate-pulse"
                        : "bg-amber-600 hover:bg-amber-700 border-amber-300 ring-2 ring-amber-500/40"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>{hazard?.severityCategory === "HIGH" ? "Nguy cơ cao" : "Cần lưu ý"}</span>
                  </button>
                </Html>
              )}

              {/* Selected Object Info Card */}
              {isSelected && (
                <Html
                  position={[
                    obj.position[0],
                    obj.position[1] + obj.dimensions.height + (hasHazard ? 0.65 : 0.25),
                    obj.position[2],
                  ]}
                  center
                  distanceFactor={10}
                  className="pointer-events-none select-none z-10"
                >
                  <div className="flex flex-col items-center animate-fade-in">
                    <div className="px-3 py-1.5 rounded-xl bg-sky-900/90 text-white border border-sky-400 backdrop-blur-md shadow-xl text-center min-w-[130px]">
                      <div className="text-[11px] font-bold text-sky-200">{obj.name}</div>
                      <div className="text-[9px] text-sky-300/80">
                        {obj.dimensions.width.toFixed(1)}m × {obj.dimensions.length.toFixed(1)}m
                      </div>
                      {hasHazard && (
                        <div className="mt-1 pt-1 border-t border-sky-700 text-[10px] text-rose-300 font-semibold">
                          ⚠️ {hazard?.title}
                        </div>
                      )}
                    </div>
                  </div>
                </Html>
              )}

              {/* Optional Verbose Object Name Label (when showAllLabels is enabled and not selected) */}
              {showAllLabels && !isSelected && !hasHazard && (
                <Html
                  position={[
                    obj.position[0],
                    obj.position[1] + obj.dimensions.height + 0.15,
                    obj.position[2],
                  ]}
                  center
                  distanceFactor={12}
                  className="pointer-events-none opacity-80"
                >
                  <div className="px-2 py-0.5 rounded-md bg-slate-900/70 text-slate-300 text-[9px] font-medium border border-slate-700/50 backdrop-blur-sm">
                    {obj.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}

        {/* Clustered Hazard Badges (Avoids Overlapping Multiple Badges in 1m Radius) */}
        {clusters.map((cluster) => {
          const isExpanded = expandedClusterId === cluster.id;
          const isHigh = cluster.highestSeverity === "HIGH";

          return (
            <Html
              key={cluster.id}
              position={cluster.position}
              center
              distanceFactor={10}
              className="pointer-events-auto z-20"
            >
              <div className="relative flex flex-col items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedClusterId(isExpanded ? null : cluster.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-[11px] font-bold shadow-xl transition-all hover:scale-105 active:scale-95 border ${
                    isHigh
                      ? "bg-rose-600 hover:bg-rose-700 border-rose-300 ring-4 ring-rose-500/30"
                      : "bg-amber-600 hover:bg-amber-700 border-amber-300 ring-4 ring-amber-500/30"
                  }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{cluster.items.length} Mối nguy</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Expanded Cluster Popover */}
                {isExpanded && (
                  <div className="absolute top-8 w-60 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl p-2.5 space-y-1.5 text-left text-xs text-white animate-fade-in">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800">
                      Gom cụm khu vực gần nhau:
                    </div>
                    {cluster.items.map((item) => (
                      <button
                        key={item.object.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectObject(item.object.id);
                          focusOnLocation(item.object.position);
                          setExpandedClusterId(null);
                        }}
                        className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800 transition flex items-start gap-1.5 group"
                      >
                        <span
                          className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                            item.hazard.severityCategory === "HIGH" ? "bg-rose-500" : "bg-amber-500"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-200 group-hover:text-teal-300 truncate text-[11px]">
                            {item.hazard.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.object.name}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Html>
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
          Mặt bằng
        </button>
        <button
          onClick={() => useSimulationStore.getState().setCameraPreset("FRONT")}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          Chính diện
        </button>
      </div>

      {/* Bottom Floating Visual Toggles & Clustering Switch */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 pointer-events-auto shadow-lg text-xs text-white">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showHazardOverlay}
              onChange={() => useSimulationStore.getState().toggleHazardOverlay()}
              className="rounded text-rose-500 focus:ring-rose-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-rose-300">Cảnh báo nguy cơ</span>
          </label>

          <span className="text-slate-600">|</span>

          <label className="flex items-center gap-1.5 cursor-pointer" title="Gom cụm các cảnh báo nằm gần nhau (<1m) để chống chồng nhãn">
            <input
              type="checkbox"
              checked={clusterMarkers}
              onChange={(e) => setClusterMarkers(e.target.checked)}
              className="rounded text-teal-500 focus:ring-teal-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-teal-300">Gom cụm chống đè</span>
          </label>

          <span className="text-slate-600">|</span>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllLabels}
              onChange={(e) => setShowAllLabels(e.target.checked)}
              className="rounded text-sky-500 focus:ring-sky-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-slate-300">Hiện mọi tên đồ vật</span>
          </label>

          <span className="text-slate-600">|</span>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showWalkingZones}
              onChange={() => useSimulationStore.getState().toggleWalkingZones()}
              className="rounded text-emerald-500 focus:ring-emerald-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-emerald-300">Hành lang</span>
          </label>
        </div>

        {/* Legend */}
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 pointer-events-auto text-[11px] text-slate-300 flex items-center gap-3 hidden sm:flex shadow-lg">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-semibold text-rose-400">Nguy cơ cao</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Cần lưu ý</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Lối đi thông thoáng</span>
          </span>
        </div>
      </div>
    </div>
  );
};
