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
  Focus,
  X,
} from "lucide-react";
import { SceneObjectState, HazardFindingResult } from "@/types";

/**
 * Camera controller that smoothly positions and frames the camera
 * based on room dimensions, presets, or focused object coordinates.
 */
function CameraController({ fitTrigger }: { fitTrigger: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { cameraPreset, cameraFocusPoint, getCurrentRoom } = useSimulationStore();
  const room = getCurrentRoom();

  useEffect(() => {
    if (!camera) return;

    // 1. Focus on specific selected object coordinate
    if (cameraFocusPoint) {
      const [fx, fy, fz] = cameraFocusPoint;
      camera.position.set(fx + 2.4, fy + 2.8, fz + 2.4);
      camera.lookAt(fx, fy + 0.3, fz);
      if (controlsRef.current) {
        controlsRef.current.target.set(fx, fy + 0.3, fz);
        controlsRef.current.update();
      }
      return;
    }

    // 2. Compute dynamic framing distance based on room diagonal
    const { width, length, height } = room.dimensions;
    const diag = Math.hypot(width, length);
    const cameraDist = Math.max(diag, height * 1.8) * 1.15;

    switch (cameraPreset) {
      case "TOP":
        camera.position.set(0, cameraDist * 1.45, 0.001);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
        break;

      case "FRONT":
        camera.position.set(0, height * 0.5, cameraDist * 1.25);
        camera.lookAt(0, height * 0.35, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, height * 0.35, 0);
          controlsRef.current.update();
        }
        break;

      case "ISOMETRIC":
      default:
        camera.position.set(cameraDist * 0.95, cameraDist * 1.05, cameraDist * 0.95);
        camera.lookAt(0, height * 0.2, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, height * 0.2, 0);
          controlsRef.current.update();
        }
        break;
    }
  }, [cameraPreset, cameraFocusPoint, room.id, fitTrigger]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.0}
      maxDistance={35}
      maxPolarAngle={cameraPreset === "TOP" ? 0.05 : Math.PI / 2 - 0.03}
    />
  );
}

interface HazardCluster {
  id: string;
  position: [number, number, number];
  items: Array<{
    object: SceneObjectState;
    hazard: HazardFindingResult;
    hazardNumber: string;
  }>;
  highestSeverity: "HIGH" | "MEDIUM" | "LOW";
}

export const RoomCanvas: React.FC = () => {
  const {
    getCurrentRoom,
    selectedObjectId,
    selectObject,
    showHazardOverlay,
    showWalkingZones,
    showMeasurements,
    transparentWalls,
    isNightMode,
    currentAssessment,
    focusOnLocation,
    setCameraPreset,
  } = useSimulationStore();

  const [clusterMarkers, setClusterMarkers] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  const room = getCurrentRoom();
  const findings = currentAssessment?.findings || [];

  // Auto-fit room when room ID changes
  useEffect(() => {
    setFitTrigger((prev) => prev + 1);
    selectObject(null);
    setExpandedClusterId(null);
  }, [room.id]);

  // Build a deterministic numbering map for findings: H1, H2, H3...
  const findingIndexMap = useMemo(() => {
    const map = new Map<string, string>();
    findings.forEach((f, idx) => {
      map.set(f.id, `H${idx + 1}`);
    });
    return map;
  }, [findings]);

  // Map each object ID to its active hazard finding and assigned hazardNumber
  const hazardMap = useMemo(() => {
    const map = new Map<
      string,
      { hazard: HazardFindingResult; hazardNumber: string }
    >();
    findings.forEach((f) => {
      if (f.targetObjectId && !map.has(f.targetObjectId)) {
        map.set(f.targetObjectId, {
          hazard: f,
          hazardNumber: findingIndexMap.get(f.id) || `H1`,
        });
      }
    });
    return map;
  }, [findings, findingIndexMap]);

  // Cluster nearby hazard markers if horizontal distance < 0.95m
  const { clusters, unclusteredHazards, clusteredObjectIds } = useMemo(() => {
    if (!clusterMarkers || !showHazardOverlay) {
      const allHazardObjects: Array<{
        object: SceneObjectState;
        hazard: HazardFindingResult;
        hazardNumber: string;
      }> = [];
      room.objects.forEach((obj) => {
        const entry = hazardMap.get(obj.id);
        if (entry) {
          allHazardObjects.push({
            object: obj,
            hazard: entry.hazard,
            hazardNumber: entry.hazardNumber,
          });
        }
      });
      return {
        clusters: [],
        unclusteredHazards: allHazardObjects,
        clusteredObjectIds: new Set<string>(),
      };
    }

    const hazardObjects: Array<{
      object: SceneObjectState;
      hazard: HazardFindingResult;
      hazardNumber: string;
    }> = [];
    room.objects.forEach((obj) => {
      const entry = hazardMap.get(obj.id);
      if (entry) {
        hazardObjects.push({
          object: obj,
          hazard: entry.hazard,
          hazardNumber: entry.hazardNumber,
        });
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
        const avgX =
          group.reduce((acc, it) => acc + it.object.position[0], 0) /
          group.length;
        const maxY = Math.max(
          ...group.map(
            (it) =>
              (it.object.position[1] ?? 0) + it.object.dimensions.height
          )
        );
        const avgZ =
          group.reduce((acc, it) => acc + it.object.position[2], 0) /
          group.length;

        const hasHigh = group.some(
          (it) => it.hazard.severityCategory === "HIGH"
        );
        const hasMed = group.some(
          (it) => it.hazard.severityCategory === "MEDIUM"
        );

        foundClusters.push({
          id: `cluster-${group.map((g) => g.object.id).join("-")}`,
          position: [avgX, maxY + 0.22, avgZ],
          items: group,
          highestSeverity: hasHigh ? "HIGH" : hasMed ? "MEDIUM" : "LOW",
        });
      }
    }

    const unclustered = hazardObjects.filter(
      (it) => !clustered.has(it.object.id)
    );

    return {
      clusters: foundClusters,
      unclusteredHazards: unclustered,
      clusteredObjectIds: clustered,
    };
  }, [room.objects, hazardMap, clusterMarkers, showHazardOverlay]);

  const handleFitRoom = () => {
    focusOnLocation(null);
    setFitTrigger((prev) => prev + 1);
  };

  const handleFocusSelected = () => {
    if (selectedObjectId) {
      const obj = room.objects.find((o) => o.id === selectedObjectId);
      if (obj) {
        focusOnLocation(obj.position);
      }
    }
  };

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
        <CameraController fitTrigger={fitTrigger} />

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
          const hazardEntry = hazardMap.get(obj.id);
          const hasHazard = Boolean(hazardEntry) && showHazardOverlay;
          const isClustered = clusteredObjectIds.has(obj.id);

          return (
            <group key={obj.id}>
              <ProceduralFurniture
                object={obj}
                isSelected={isSelected}
                hasHazard={hasHazard}
                hazardSeverity={hazardEntry?.hazard.severityCategory}
                onClick={() => {
                  selectObject(obj.id);
                  focusOnLocation(obj.position);
                }}
              />

              {/* Sleek Teardrop Pin Marker (H1, H2, H3...) */}
              {hazardEntry && showHazardOverlay && !isClustered && (
                <Html
                  position={[
                    obj.position[0],
                    (obj.position[1] ?? 0) + obj.dimensions.height + 0.14,
                    obj.position[2],
                  ]}
                  center
                  distanceFactor={10}
                  className="pointer-events-auto"
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      selectObject(obj.id);
                      focusOnLocation(obj.position);
                    }}
                    className="relative group cursor-pointer select-none"
                    role="button"
                    aria-label={`Nguy cơ ${hazardEntry.hazardNumber}: ${hazardEntry.hazard.title}`}
                  >
                    {/* Pin Head and Downward Pointer */}
                    <div className="flex flex-col items-center transition-transform duration-200 group-hover:scale-125 group-active:scale-95">
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-black shadow-xl border-2 border-white ${hazardEntry.hazard.severityCategory === "HIGH"
                            ? "bg-rose-600 ring-2 ring-rose-500/50"
                            : hazardEntry.hazard.severityCategory === "MEDIUM"
                              ? "bg-amber-600 ring-2 ring-amber-500/50"
                              : "bg-sky-600 ring-2 ring-sky-500/50"
                          }`}
                      >
                        {hazardEntry.hazardNumber}
                      </div>
                      {/* Downward Pointer Stem */}
                      <div
                        className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] -mt-[1px] ${hazardEntry.hazard.severityCategory === "HIGH"
                            ? "border-t-rose-600"
                            : hazardEntry.hazard.severityCategory === "MEDIUM"
                              ? "border-t-amber-600"
                              : "border-t-sky-600"
                          }`}
                      />
                    </div>

                    {/* Single-Line Clean Hover Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950/95 text-white text-[11px] font-medium shadow-2xl border border-slate-700/80 backdrop-blur-sm flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${hazardEntry.hazard.severityCategory === "HIGH"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                            }`}
                        />
                        <span className="font-bold text-rose-300">
                          {hazardEntry.hazardNumber}:
                        </span>
                        <span className="text-slate-200">
                          {hazardEntry.hazard.title}
                        </span>
                      </div>
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-950" />
                    </div>
                  </div>
                </Html>
              )}

              {/* Selected Object Info Card */}
              {isSelected && (
                <Html
                  position={[
                    obj.position[0],
                    (obj.position[1] ?? 0) +
                    obj.dimensions.height +
                    (hasHazard ? 0.48 : 0.22),
                    obj.position[2],
                  ]}
                  center
                  distanceFactor={10}
                  className="pointer-events-none select-none z-10"
                >
                  <div className="flex flex-col items-center animate-fade-in pointer-events-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-white border border-sky-400 backdrop-blur-md shadow-2xl text-center min-w-[140px] relative">
                      <div className="text-[11px] font-bold text-sky-200 flex items-center justify-between gap-2">
                        <span>{obj.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectObject(null);
                          }}
                          className="text-slate-400 hover:text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">
                        {obj.dimensions.width.toFixed(1)}m ×{" "}
                        {obj.dimensions.length.toFixed(1)}m ×{" "}
                        {obj.dimensions.height.toFixed(1)}m
                      </div>
                      {hasHazard && (
                        <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-rose-300 font-semibold flex items-center justify-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span>
                            {hazardEntry?.hazardNumber}: {hazardEntry?.hazard.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Html>
              )}

              {/* Optional Subtle Object Name Label */}
              {showAllLabels && !isSelected && !hasHazard && (
                <Html
                  position={[
                    obj.position[0],
                    (obj.position[1] ?? 0) + obj.dimensions.height + 0.12,
                    obj.position[2],
                  ]}
                  center
                  distanceFactor={12}
                  className="pointer-events-none opacity-80"
                >
                  <div className="px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-300 text-[9px] font-medium border border-slate-700/60 backdrop-blur-sm whitespace-nowrap">
                    {obj.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}

        {/* Clustered Hazard Badges (Aggregates multiple hazards within 0.95m radius) */}
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
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-white text-[11px] font-bold shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-white ${isHigh
                      ? "bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-500/40"
                      : "bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-500/40"
                    }`}
                  aria-label={`${cluster.items.length} nguy cơ gộp`}
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>+{cluster.items.length} Nguy cơ</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {/* Downward Stem */}
                <div
                  className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] -mt-[1px] ${isHigh ? "border-t-rose-600" : "border-t-amber-600"
                    }`}
                />

                {/* Expanded Cluster Popover */}
                {isExpanded && (
                  <div className="absolute top-9 w-64 bg-slate-950/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl p-2.5 space-y-1.5 text-left text-xs text-white animate-fade-in z-50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>Gom cụm nguy cơ lân cận:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedClusterId(null);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
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
                        className="w-full text-left p-1.5 rounded-lg hover:bg-slate-800 transition flex items-start gap-2 group"
                      >
                        <span
                          className={`mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-black text-white shrink-0 ${item.hazard.severityCategory === "HIGH"
                              ? "bg-rose-600"
                              : "bg-amber-600"
                            }`}
                        >
                          {item.hazardNumber}
                        </span>
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

      {/* Floating 3D Camera Controls Toolbar (Top-Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 text-white text-xs shadow-lg">
        <span className="text-[11px] text-slate-400 font-medium px-1.5 hidden sm:inline">
          Góc nhìn:
        </span>
        <button
          onClick={() => {
            focusOnLocation(null);
            setCameraPreset("ISOMETRIC");
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          Isometric
        </button>
        <button
          onClick={() => {
            focusOnLocation(null);
            setCameraPreset("TOP");
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          Mặt bằng
        </button>
        <button
          onClick={() => {
            focusOnLocation(null);
            setCameraPreset("FRONT");
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
        >
          Chính diện
        </button>
        <button
          onClick={handleFitRoom}
          className="px-2.5 py-1 rounded-lg bg-teal-600/80 hover:bg-teal-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
          title="Tự động căn chỉnh toàn bộ phòng vào khung nhìn"
        >
          <Maximize2 className="h-3 w-3" />
          <span>Fit Room</span>
        </button>
      </div>

      {/* Bottom Floating Visual Toggles & Clustering Switch */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/60 pointer-events-auto shadow-lg text-xs text-white">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showHazardOverlay}
              onChange={() =>
                useSimulationStore.getState().toggleHazardOverlay()
              }
              className="rounded text-rose-500 focus:ring-rose-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-rose-300">
              Cảnh báo nguy cơ
            </span>
          </label>

          <span className="text-slate-600">|</span>

          <label
            className="flex items-center gap-1.5 cursor-pointer"
            title="Gom cụm các cảnh báo nằm gần nhau (<0.95m) để chống đè lấn nhãn"
          >
            <input
              type="checkbox"
              checked={clusterMarkers}
              onChange={(e) => setClusterMarkers(e.target.checked)}
              className="rounded text-teal-500 focus:ring-teal-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-teal-300">
              Gom cụm chống đè
            </span>
          </label>

          <span className="text-slate-600">|</span>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAllLabels}
              onChange={(e) => setShowAllLabels(e.target.checked)}
              className="rounded text-sky-500 focus:ring-sky-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-slate-300">
              Tên đồ vật
            </span>
          </label>

          <span className="text-slate-600">|</span>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showWalkingZones}
              onChange={() =>
                useSimulationStore.getState().toggleWalkingZones()
              }
              className="rounded text-emerald-500 focus:ring-emerald-400 h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium text-emerald-300">
              Hành lang
            </span>
          </label>

          {selectedObjectId && (
            <>
              <span className="text-slate-600">|</span>
              <button
                onClick={handleFocusSelected}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 transition"
              >
                <Focus className="h-3 w-3" />
                <span>Focus vật thể</span>
              </button>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 pointer-events-auto text-[11px] text-slate-300 flex items-center gap-3 hidden sm:flex shadow-lg">
          <span className="flex items-center gap-1">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-rose-600 text-[9px] font-black text-white">
              H
            </span>
            <span className="font-semibold text-rose-400">Nguy cơ cao</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-[9px] font-black text-white">
              H
            </span>
            <span>Cần lưu ý</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Lối đi an toàn</span>
          </span>
        </div>
      </div>
    </div>
  );
};
