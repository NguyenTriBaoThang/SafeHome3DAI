"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { Html } from "./SafeHtml";
import * as THREE from "three";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { RoomEnvironment } from "./RoomEnvironment";
import { ModelRenderer } from "./ModelRenderer";
import { WheelchairDriver, WheelchairPadState } from "./WheelchairDriver";
import { AccessibleSuiteModel } from "./AccessibleSuiteModel";
import { canWalkTo } from "@/lib/experience/navigation";
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
  Camera,
  Sun,
  Sunset,
  Moon,
  Sparkles,
  RotateCcw,
  Footprints,
  ShieldAlert,
  Move,
  RotateCw,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { SceneObjectState, HazardFindingResult } from "@/types";
import { describeObjectValues, isApproximateRoomModel, roomModelLabel, SOURCE_LABEL_VI } from "@/lib/reconstruction/sceneProvenance";
import { WALL_MOUNTED_MODELS, CEILING_MOUNTED_MODELS, FLAT_FLOOR_MODELS } from "@/lib/reconstruction/spatialValidationEngine";
import { RUG_LIFT_M } from "@/lib/reconstruction/scenePlacement";
import { WebGLFallback } from "./WebGLBoundary";
import {
  QUALITY_PRESET_CONFIG,
  getSimulatedLightingConfig,
  resolveIlluminanceDisplay,
  describeRoomDimensionsWithProvenance,
  type QualityPreset,
} from "@/lib/three/lightingModel";

const REFERENCE_SAMPLE_BY_ROOM_TYPE: Record<string, { url: string; label: string }> = {
  BEDROOM: {
    url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop",
    label: "Ảnh mẫu phòng ngủ chuẩn (SafeHome)",
  },
  BATHROOM: {
    url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop",
    label: "Ảnh mẫu phòng tắm chuẩn (SafeHome)",
  },
  DOLLHOUSE: {
    url: "/reference/reference_room.jpg",
    label: "Ảnh kiến trúc tham chiếu Dollhouse",
  },
};

function ExposureSync({ exposure }: { exposure: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

/**
 * First-person keyboard & navigation controller for WASD walkthrough
 */
function WalkthroughNavigator({
  roomDims,
}: {
  roomDims: { width: number; length: number };
}) {
  const { camera } = useThree();
  const { cameraPreset } = useSimulationStore();

  useEffect(() => {
    if (cameraPreset !== "WALKTHROUGH") return;

    const halfW = roomDims.width / 2 - 0.35;
    const halfL = roomDims.length / 2 - 0.35;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,button,[contenteditable=true]")) return;
      const step = 0.22;
      const key = e.key.toLowerCase();
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      dir.y = 0;
      dir.normalize();

      const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);
      const previous = camera.position.clone();

      if (key === "w" || key === "arrowup") {
        camera.position.addScaledVector(dir, step);
      } else if (key === "s" || key === "arrowdown") {
        camera.position.addScaledVector(dir, -step);
      } else if (key === "a" || key === "arrowleft") {
        camera.position.addScaledVector(sideDir, -step);
      } else if (key === "d" || key === "arrowright") {
        camera.position.addScaledVector(sideDir, step);
      } else return;
      e.preventDefault();
      if (!canWalkTo(useSimulationStore.getState().getCurrentRoom(), camera.position.x, camera.position.z)) camera.position.copy(previous);

      // Keep within room perimeter walls & eye-level height
      camera.position.x = Math.max(-halfW, Math.min(halfW, camera.position.x));
      camera.position.z = Math.max(-halfL, Math.min(halfL, camera.position.z));
      camera.position.y = 1.6;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cameraPreset, camera, roomDims]);

  return null;
}

/**
 * Camera controller that smoothly positions and frames the camera
 * for Dollhouse, Interior, Top, Front, Walkthrough, and Safety views.
 */
function CameraController({ fitTrigger }: { fitTrigger: number }) {
  const { camera, size } = useThree();
  const controlsRef = useRef<any>(null);
  const desiredPosition = useRef(new THREE.Vector3());
  const desiredTarget = useRef(new THREE.Vector3());
  const transitioning = useRef(false);
  const { cameraPreset, cameraFocusPoint, getCurrentRoom, currentAssessment } =
    useSimulationStore();
  const room = getCurrentRoom();
  const isDollhouse =
    room.layoutType === "DOLLHOUSE_MULTI_ZONE" ||
    room.id === "room-photoreal-dollhouse-01";

  useEffect(() => {
    if (!camera) return;
    const previousPosition = camera.position.clone();
    const previousTarget = controlsRef.current?.target.clone() || new THREE.Vector3();

    // 1. Focus on specific selected object coordinate
    if (cameraFocusPoint) {
      const [fx, fy, fz] = cameraFocusPoint;
      desiredPosition.current.set(fx + 2.2, fy + 2.4, fz + 2.2);
      desiredTarget.current.set(fx, fy + 0.3, fz);
      transitioning.current = true;
      return;
    }

    // 2. Framing distance based on room diagonal
    const { width, length, height } = room.dimensions;
    const diag = Math.hypot(width, length);
    // Optimized framing distance so the room prominently fills ~70-75% of viewport
    const cameraDist = Math.max(diag * 0.65, height * 1.35);

    switch (cameraPreset) {
      case "TOP":
        camera.position.set(0, cameraDist * 1.35, 0.001);
        camera.lookAt(0, 0, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
        break;

      case "WALKTHROUGH":
        camera.position.set(0, 1.6, length * 0.35);
        camera.lookAt(0, 1.5, -length * 0.2);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, 1.5, -length * 0.2);
          controlsRef.current.update();
        }
        break;

      case "SAFETY":
        // Prioritize camera on highest severity hazard
        const findings = currentAssessment?.findings || [];
        const highHazard = findings.find((f) => f.severityCategory === "HIGH") || findings[0];
        const targetObj = room.objects.find((o) => o.id === highHazard?.targetObjectId) || room.objects[0];
        if (targetObj) {
          const [tx, ty, tz] = targetObj.position;
          camera.position.set(tx + 2.0, ty + 1.8, tz + 2.0);
          camera.lookAt(tx, ty + 0.3, tz);
          if (controlsRef.current) {
            controlsRef.current.target.set(tx, ty + 0.3, tz);
            controlsRef.current.update();
          }
        } else {
          camera.position.set(cameraDist * 0.8, cameraDist * 0.9, cameraDist * 0.8);
          camera.lookAt(0, height * 0.25, 0);
        }
        break;

      case "COMPARISON":
        // Cinematic perspective for before/after layout comparison
        if (isDollhouse) {
          camera.position.set(5.2, 5.8, 5.6);
          camera.lookAt(0.2, 0.4, 0);
          if (controlsRef.current) {
            controlsRef.current.target.set(0.2, 0.4, 0);
            controlsRef.current.update();
          }
        } else {
          camera.position.set(cameraDist * 0.75, cameraDist * 0.85, cameraDist * 0.75);
          camera.lookAt(0, height * 0.3, 0);
          if (controlsRef.current) {
            controlsRef.current.target.set(0, height * 0.3, 0);
            controlsRef.current.update();
          }
        }
        break;

      case "INTERIOR":
        // Eye-level view inside the room
        if (isDollhouse) {
          camera.position.set(-2.0, 1.45, 1.2);
          camera.lookAt(-0.5, 1.1, -1.0);
          if (controlsRef.current) {
            controlsRef.current.target.set(-0.5, 1.1, -1.0);
            controlsRef.current.update();
          }
        } else {
          camera.position.set(0, 1.45, length * 0.35);
          camera.lookAt(0, 1.1, -length * 0.15);
          if (controlsRef.current) {
            controlsRef.current.target.set(0, 1.1, -length * 0.15);
            controlsRef.current.update();
          }
        }
        break;

      case "FRONT":
        camera.position.set(0, height * 0.45, cameraDist * 1.15);
        camera.lookAt(0, height * 0.35, 0);
        if (controlsRef.current) {
          controlsRef.current.target.set(0, height * 0.35, 0);
          controlsRef.current.update();
        }
        break;

      case "ISOMETRIC":
      default:
        // Precise 3/4 aerial isometric perspective matching the architectural reference photo
        if (isDollhouse) {
          camera.position.set(6.8, 7.6, 7.2);
          camera.lookAt(0.1, 0.3, -0.1);
          if (controlsRef.current) {
            controlsRef.current.target.set(0.1, 0.3, -0.1);
            controlsRef.current.update();
          }
        } else {
          const target = new THREE.Vector3(0, height * 0.43, 0);
          const direction = new THREE.Vector3(0.32, 0.58, 1).normalize();
          const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
          const up = new THREE.Vector3().crossVectors(direction, right);
          const perspective = camera as THREE.PerspectiveCamera;
          const tanY = Math.tan(THREE.MathUtils.degToRad(perspective.getEffectiveFOV() / 2));
          const tanX = tanY * size.width / Math.max(1, size.height);
          // Fit all eight corners, including the wall caps, inside the canvas
          // with space above and below for the floating controls.
          let distance = 0;
          for (const x of [-width / 2 - 0.16, width / 2 + 0.16]) {
            for (const y of [-0.16, height + 0.08]) {
              for (const z of [-length / 2 - 0.16, length / 2 + 0.16]) {
                const corner = new THREE.Vector3(x, y, z).sub(target);
                const offset = Math.max(Math.abs(corner.dot(right)) / (0.90 * tanX),
                  Math.abs(corner.dot(up)) / (0.76 * tanY));
                distance = Math.max(distance, corner.dot(direction) + offset);
              }
            }
          }
          camera.position.copy(target).addScaledVector(direction, distance);
          camera.lookAt(target);
          if (controlsRef.current) {
            controlsRef.current.target.copy(target);
            controlsRef.current.update();
          }
        }
        break;
    }
    desiredPosition.current.copy(camera.position);
    desiredTarget.current.copy(controlsRef.current?.target || new THREE.Vector3());
    camera.position.copy(previousPosition);
    controlsRef.current?.target.copy(previousTarget);
    transitioning.current = true;
  }, [cameraPreset, cameraFocusPoint, room.id, fitTrigger, isDollhouse, size.width, size.height]);

  useFrame((_, delta) => {
    if (!transitioning.current || !controlsRef.current) return;
    const amount = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1 - Math.exp(-delta * 5);
    camera.position.lerp(desiredPosition.current, amount);
    controlsRef.current.target.lerp(desiredTarget.current, amount);
    controlsRef.current.update();
    if (camera.position.distanceTo(desiredPosition.current) < 0.005) transitioning.current = false;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      onStart={() => { transitioning.current = false; }}
      enableDamping
      dampingFactor={0.08}
      minDistance={0.5}
      maxDistance={Math.max(40, Math.hypot(room.dimensions.width, room.dimensions.length) * 6)}
      maxPolarAngle={Math.PI / 2 - 0.02}
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
    lightingPreset,
    setLightingPreset,
    sceneLightingIntensitySimulated,
    qualityPreset,
    setQualityPreset,
    currentAssessment,
    focusOnLocation,
    cameraPreset,
    setCameraPreset,
    transformMode,
    setTransformMode,
    updateObjectPosition,
    updateObjectRotation,
  } = useSimulationStore();

  const [clusterMarkers, setClusterMarkers] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(
    null
  );
  const [fitTrigger, setFitTrigger] = useState(0);
  const [showWheelchair, setShowWheelchair] = useState(true);
  const [showSourceCompare, setShowSourceCompare] = useState(false);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  const [manualCompareImage, setManualCompareImage] = useState<{ url: string; label: string } | null>(null);
  const [webglLost, setWebglLost] = useState(false);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [canvasEpoch, setCanvasEpoch] = useState(0);
  const removeCanvasListeners = useRef<(() => void) | null>(null);
  const compareFileInputRef = useRef<HTMLInputElement>(null);
  const wheelchairPadRef = useRef<WheelchairPadState>({
    fwd: false,
    back: false,
    left: false,
    right: false,
  });
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const room = getCurrentRoom();
  const qualityCfg = QUALITY_PRESET_CONFIG[qualityPreset];
  const simulatedLightCfg = getSimulatedLightingConfig(lightingPreset, isNightMode);
  const illuminanceDisplay = resolveIlluminanceDisplay(room);
  const dimensionsDisplay = describeRoomDimensionsWithProvenance(room);

  useEffect(() => {
    try {
      const probe = document.createElement("canvas");
      const ctx = probe.getContext("webgl2") || probe.getContext("webgl");
      setWebglSupported(Boolean(ctx));
      (ctx as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setWebglSupported(false);
    }
    return () => removeCanvasListeners.current?.();
  }, [canvasEpoch]);
  const isAccessibleSuite = room.id === "room-accessible-suite-01";
  const findings = currentAssessment?.findings || [];
  const persistedSourceImages = useMemo(
    () => (room.sourceImageUrls || []).filter((url): url is string => Boolean(url && !url.startsWith("blob:")))
      .concat((room.sourceImageUrls || []).filter((url) => Boolean(url && url.startsWith("blob:")))),
    [room.sourceImageUrls]
  );
  const referenceSample = REFERENCE_SAMPLE_BY_ROOM_TYPE[room.roomType];

  useEffect(() => {
    return () => {
      if (manualCompareImage?.url.startsWith("blob:")) {
        URL.revokeObjectURL(manualCompareImage.url);
      }
    };
  }, [manualCompareImage]);

  // Auto-fit room when room ID changes
  useEffect(() => {
    setFitTrigger((prev) => prev + 1);
    selectObject(null);
    setExpandedClusterId(null);
    setShowSourceCompare(false);
    setActiveSourceIdx(0);
    setManualCompareImage(null);
    if (room.id === "room-accessible-suite-01") {
      setShowWheelchair(true);
    }
  }, [room.id]);

  // Deterministic numbering map for findings: H1, H2, H3...
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

  // Screenshot Capture Handler
  const handleScreenshot = () => {
    const canvas = canvasContainerRef.current?.querySelector("canvas");
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `safehome-dollhouse-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.png`;
      a.click();
    } catch (e) {
      console.warn("Screenshot failed:", e);
    }
  };

  const activeSourceUrl =
    manualCompareImage?.url || persistedSourceImages[activeSourceIdx] || persistedSourceImages[0] || null;
  const activeSourceLabel = manualCompareImage
    ? manualCompareImage.label
    : room.id === "room-photoreal-dollhouse-01"
    ? "Ảnh kiến trúc tham chiếu"
    : "Ảnh gốc dùng dựng mô hình 3D";

  const handleSelectCompareFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setManualCompareImage({ url, label: `Ảnh đối chiếu: ${file.name}` });
    e.target.value = "";
  };

  return (
    <div
      ref={canvasContainerRef}
      className="relative w-full h-full min-h-[340px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 rounded-2xl overflow-hidden shadow-inner select-none flex flex-col md:flex-row"
    >
      <input
        ref={compareFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleSelectCompareFile}
      />

      {/* --- LEFT COMPARISON PANE: SOURCE / REFERENCE PHOTO --- */}
      {showSourceCompare && (
        <div className="w-full md:w-[44%] h-[250px] md:h-full pt-16 pb-16 px-3 bg-slate-950/95 border-b md:border-b-0 md:border-r border-slate-700/80 flex flex-col gap-2 z-10 shrink-0">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <ImageIcon className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span className="font-bold text-slate-100 truncate">
                {activeSourceUrl ? activeSourceLabel : "Đối chiếu ảnh mẫu / ảnh gốc"}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => compareFileInputRef.current?.click()}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 transition"
                title="Chọn ảnh khác từ máy để đối chiếu"
              >
                <Upload className="h-3 w-3 text-teal-400" />
                <span>Chọn ảnh</span>
              </button>
              {manualCompareImage && persistedSourceImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setManualCompareImage(null)}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 text-[10px] font-semibold transition"
                >
                  Ảnh gốc
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSourceCompare(false)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                aria-label="Đóng đối chiếu ảnh"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {activeSourceUrl ? (
            <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
              <img
                src={activeSourceUrl}
                alt={activeSourceLabel}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 flex flex-col items-center justify-center text-center gap-2.5 text-xs text-slate-300">
              <ImageIcon className="h-7 w-7 text-slate-500" />
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Phòng này chưa lưu kèm URL ảnh gốc. Bạn có thể chọn ảnh từ máy hoặc xem ảnh mẫu tham chiếu để đối chiếu bố cục.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => compareFileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1.5 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Chọn ảnh từ máy</span>
                </button>
                {referenceSample && (
                  <button
                    type="button"
                    onClick={() => setManualCompareImage(referenceSample)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-[11px] font-semibold transition"
                  >
                    Xem ảnh mẫu tham chiếu
                  </button>
                )}
              </div>
            </div>
          )}

          {!manualCompareImage && persistedSourceImages.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-0.5">
              {persistedSourceImages.map((src, idx) => (
                <button
                  key={`${src.slice(0, 32)}-${idx}`}
                  type="button"
                  onClick={() => setActiveSourceIdx(idx)}
                  className={`h-10 w-14 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    idx === activeSourceIdx ? "border-teal-400" : "border-slate-700 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={src} alt={`Ảnh nguồn ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- RIGHT PANE: INTERACTIVE 3D WEBGL CANVAS --- */}
      <div className="relative flex-1 min-h-[320px] h-full">
        {!webglSupported || webglLost ? (
          <WebGLFallback
            retry={() => {
              setWebglLost(false);
              setWebglSupported(true);
              setCanvasEpoch((prev) => prev + 1);
            }}
          />
        ) : (
        <Canvas
          key={canvasEpoch}
          // Fill the viewer even when its height comes from a flex item/min-height.
          // A percentage-height Canvas in normal flow can fall back to 150px.
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          shadows={qualityCfg.shadows}
          dpr={qualityCfg.dpr}
          gl={{
            preserveDrawingBuffer: true,
            antialias: qualityCfg.antialias,
            toneMapping: THREE.ACESFilmicToneMapping,
            powerPreference: "high-performance",
          }}
          fallback={<WebGLFallback />}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = simulatedLightCfg.toneMappingExposure;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            const canvas = gl.domElement;
            removeCanvasListeners.current?.();
            const onLost = (event: Event) => {
              event.preventDefault();
              if (canvas.isConnected) setWebglLost(true);
            };
            const onRestored = () => {
              if (!canvas.isConnected) return;
              setWebglLost(false);
              setCanvasEpoch((prev) => prev + 1);
            };
            canvas.addEventListener("webglcontextlost", onLost);
            canvas.addEventListener("webglcontextrestored", onRestored);
            removeCanvasListeners.current = () => {
              canvas.removeEventListener("webglcontextlost", onLost);
              canvas.removeEventListener("webglcontextrestored", onRestored);
            };
          }}
          camera={{ position: [5.2, 6.2, 5.8], fov: 38 }}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onPointerMissed={() => {
            selectObject(null);
            setExpandedClusterId(null);
          }}
        >
        <ExposureSync exposure={simulatedLightCfg.toneMappingExposure} />
        <CameraController fitTrigger={fitTrigger} />

        {isAccessibleSuite ? (
          <React.Suspense fallback={null}>
            <AccessibleSuiteModel
              room={room}
              cutaway={cameraPreset === "ISOMETRIC" || cameraPreset === "TOP"}
              transparentWalls={transparentWalls}
              showWalkingZones={showWalkingZones}
              showGrid={showMeasurements}
              isNightMode={isNightMode}
              lightingPreset={lightingPreset}
            />
          </React.Suspense>
        ) : (
          <RoomEnvironment
            room={room}
            showWalkingZones={showWalkingZones}
            showGrid={showMeasurements}
            transparentWalls={transparentWalls}
            isNightMode={isNightMode}
            lightingPreset={lightingPreset}
            quality={qualityPreset}
            sceneLightingIntensitySimulated={sceneLightingIntensitySimulated}
          />
        )}

        {/* Interactive Elderly Wheelchair Driver (WASD / D-Pad + Ø1.5m Turning Circle) */}
        {showWheelchair && (
          <React.Suspense fallback={null}>
            <WheelchairDriver
              room={room}
              active={showWheelchair && cameraPreset !== "WALKTHROUGH"}
              padRef={wheelchairPadRef}
            />
          </React.Suspense>
        )}

        {/* 3D Scene Objects with Photorealistic ModelRenderer (works for ALL rooms including Accessible Suite!) */}
        {room.objects.map((obj) => {
          const isSelected = selectedObjectId === obj.id;
          const hazardEntry = hazardMap.get(obj.id);
          const hasHazard = Boolean(hazardEntry) && showHazardOverlay;
          const isClustered = clusteredObjectIds.has(obj.id);
          const isSuiteBuiltin = isAccessibleSuite && Boolean(obj.assetId?.startsWith("suite_builtin_"));

          return (
            <group key={obj.id}>
              {isSuiteBuiltin ? (
                <mesh
                  position={[
                    obj.position[0],
                    (obj.position[1] ?? 0) + obj.dimensions.height / 2,
                    obj.position[2],
                  ]}
                  rotation={obj.rotation}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectObject(obj.id);
                    focusOnLocation(obj.position);
                  }}
                >
                  <boxGeometry
                    args={[
                      obj.dimensions.width,
                      Math.max(obj.dimensions.height, 0.05),
                      obj.dimensions.length,
                    ]}
                  />
                  <meshBasicMaterial
                    color={isSelected ? "#38bdf8" : "#f43f5e"}
                    transparent
                    opacity={isSelected ? 0.18 : 0.0}
                    wireframe={isSelected}
                    depthWrite={false}
                  />
                </mesh>
              ) : (
                <ModelRenderer
                  object={obj}
                  isSelected={isSelected}
                  hasHazard={hasHazard}
                  hazardSeverity={hazardEntry?.hazard.severityCategory}
                  onClick={() => {
                    selectObject(obj.id);
                    focusOnLocation(obj.position);
                  }}
                />
              )}

              {/* Sleek Teardrop Pin Marker (H1, H2, H3...) */}
              {hazardEntry && showHazardOverlay && !isClustered && (
                <Html
                  position={[
                    obj.position[0],
                    (obj.position[1] ?? 0) + obj.dimensions.height + 0.16,
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
                    <div className="flex flex-col items-center transition-transform duration-200 group-hover:scale-125 group-active:scale-95">
                      <div
                        className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-black shadow-xl border-2 border-white ${
                          hazardEntry.hazard.severityCategory === "HIGH"
                            ? "bg-rose-600 ring-2 ring-rose-500/50"
                            : hazardEntry.hazard.severityCategory === "MEDIUM"
                            ? "bg-amber-600 ring-2 ring-amber-500/50"
                            : "bg-sky-600 ring-2 ring-sky-500/50"
                        }`}
                      >
                        {hazardEntry.hazardNumber}
                      </div>
                      <div
                        className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] -mt-[1px] ${
                          hazardEntry.hazard.severityCategory === "HIGH"
                            ? "border-t-rose-600"
                            : hazardEntry.hazard.severityCategory === "MEDIUM"
                            ? "border-t-amber-600"
                            : "border-t-sky-600"
                        }`}
                      />
                    </div>

                    {/* Clean Hover Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-fade-in">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950/95 text-white text-[11px] font-medium shadow-2xl border border-slate-700/80 backdrop-blur-sm flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            hazardEntry.hazard.severityCategory === "HIGH"
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
                      (hasHazard ? 0.48 : 0.24),
                    obj.position[2],
                  ]}
                  center
                  /* fixed pixel size: the inspector must stay readable at any zoom */
                  className="pointer-events-none select-none z-10"
                >
                  <div className="flex flex-col items-center animate-fade-in pointer-events-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-900/95 text-white border border-sky-400 backdrop-blur-md shadow-2xl text-center min-w-[230px] relative">
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
                      <div className="mt-1 space-y-0.5 text-left" data-testid="object-inspector">
                        {describeObjectValues(obj).map((row) => (
                          <div key={row.key} className="flex items-center justify-between gap-2 text-[9px] text-slate-300">
                            <span>{row.label}: <span className="text-white">{row.value}</span></span>
                            <span
                              data-source={row.source}
                              className={`rounded px-1 py-px text-[8px] font-bold whitespace-nowrap ${
                                row.source === "measured" || row.source === "user_confirmed" ? "bg-emerald-700 text-emerald-50" : row.source === "vision_estimated" ? "bg-amber-700 text-amber-50" : "bg-slate-600 text-slate-100"
                              }`}
                            >
                              {SOURCE_LABEL_VI[row.source]}
                            </span>
                          </div>
                        ))}
                      </div>
                      {obj.verified && (
                        <div className="text-[9px] text-emerald-400 font-semibold mt-0.5 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Gợi ý AI đã được người dùng xác nhận (vẫn là ước lượng)</span>
                        </div>
                      )}
                      {hasHazard && (
                        <div className="mt-1 pt-1 border-t border-slate-800 text-[10px] text-rose-300 font-semibold flex items-center justify-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                          <span>
                            {hazardEntry?.hazardNumber}:{" "}
                            {hazardEntry?.hazard.title}
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

        {/* Clustered Hazard Badges */}
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
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-white text-[11px] font-bold shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-white ${
                    isHigh
                      ? "bg-rose-600 hover:bg-rose-700 ring-2 ring-rose-500/40"
                      : "bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-500/40"
                  }`}
                  aria-label={`${cluster.items.length} nguy cơ gộp`}
                >
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>+{cluster.items.length} Nguy cơ</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] -mt-[1px] ${
                    isHigh ? "border-t-rose-600" : "border-t-amber-600"
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
                          className={`mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-black text-white shrink-0 ${
                            item.hazard.severityCategory === "HIGH"
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

        {/* First Person Walkthrough Controls */}
        <WalkthroughNavigator roomDims={room.dimensions} />

        {/* Interactive TransformControls Gizmo for Selected Object */}
        {selectedObjectId && transformMode && (() => {
          const selObj = room.objects.find((o) => o.id === selectedObjectId);
          if (!selObj) return null;
          return (
            <TransformControls
              position={selObj.position}
              mode={transformMode}
              translationSnap={0.05}
              rotationSnap={Math.PI / 12}
              onObjectChange={(e: any) => {
                if (e?.target?.object) {
                  const p = e.target.object.position;
                  const halfW = room.dimensions.width / 2;
                  const halfL = room.dimensions.length / 2;
                  const clampedX = Math.max(-halfW + 0.1, Math.min(halfW - 0.1, p.x));
                  const clampedZ = Math.max(-halfL + 0.1, Math.min(halfL - 0.1, p.z));
                  const m = selObj.modelType;
                  const isElevated = WALL_MOUNTED_MODELS.has(m) || CEILING_MOUNTED_MODELS.has(m);
                  const isFlatFloor = FLAT_FLOOR_MODELS.has(m);
                  const targetY = isElevated ? Number(p.y.toFixed(2)) : isFlatFloor ? RUG_LIFT_M : selObj.parentObjectId ? selObj.position[1] : 0;

                  updateObjectPosition(selObj.id, [
                    Number(clampedX.toFixed(2)),
                    targetY,
                    Number(clampedZ.toFixed(2)),
                  ]);
                  if (transformMode === "rotate") {
                    updateObjectRotation(selObj.id, [
                      0,
                      Number(e.target.object.rotation.y.toFixed(2)),
                      0,
                    ]);
                  }
                }
              }}
            />
          );
        })()}
        </Canvas>
        )}
      </div>

      {/* --- TOP FLOATING TOOLBAR: CAMERA, LIGHTING & QUALITY PRESETS --- */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-20">
        {/* Lighting & LOD Selector (Top-Left) */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 pointer-events-auto text-white shadow-lg shrink-0 max-w-full">
          <span className="text-xs text-slate-300 font-medium px-1.5 hidden xl:flex items-center gap-1 whitespace-nowrap shrink-0">
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <span>Ánh sáng 3D:</span>
          </span>
          <button
            type="button"
            aria-pressed={lightingPreset === "MORNING"}
            onClick={() => setLightingPreset("MORNING")}
            className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              lightingPreset === "MORNING"
                ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Ánh sáng 3D nắng sớm mô phỏng (không thay đổi lux đo thật)"
          >
            <span>Nắng sớm</span>
          </button>
          <button
            type="button"
            aria-pressed={lightingPreset === "AFTERNOON"}
            onClick={() => setLightingPreset("AFTERNOON")}
            className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              lightingPreset === "AFTERNOON"
                ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Ánh sáng 3D ban ngày mô phỏng (không thay đổi lux đo thật)"
          >
            <span>Ban ngày</span>
          </button>
          <button
            type="button"
            aria-pressed={lightingPreset === "NIGHT"}
            onClick={() => setLightingPreset("NIGHT")}
            className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              lightingPreset === "NIGHT"
                ? "bg-indigo-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Ánh sáng 3D ban đêm mô phỏng (chỉ hiển thị render, không phải lux đo thật)"
          >
            <Moon className="h-3 w-3 shrink-0" />
            <span>Ban đêm</span>
          </button>
          <button
            type="button"
            aria-pressed={lightingPreset === "STUDIO"}
            onClick={() => setLightingPreset("STUDIO")}
            className={`min-h-[36px] sm:min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              lightingPreset === "STUDIO"
                ? "bg-teal-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Ánh sáng 3D studio mô phỏng (không thay đổi lux đo thật)"
          >
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>Studio</span>
          </button>

          <span className="text-slate-600 px-0.5 hidden sm:inline shrink-0" aria-hidden="true">|</span>
          <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label="Chất lượng đồ họa 3D (LOD)">
            {(["LOW", "MEDIUM", "HIGH"] as QualityPreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={qualityPreset === preset}
                onClick={() => setQualityPreset(preset)}
                title={QUALITY_PRESET_CONFIG[preset].labelVi}
                className={`min-h-[36px] sm:min-h-[32px] px-2 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                  qualityPreset === preset
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
                    : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                }`}
              >
                {QUALITY_PRESET_CONFIG[preset].shortLabelVi}
              </button>
            ))}
          </div>
        </div>

        {/* Camera Views & Actions (Top-Right) */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 pointer-events-auto text-white shadow-lg max-w-full">
          <span className="text-xs text-slate-300 font-medium px-1.5 hidden xl:flex items-center gap-1 whitespace-nowrap shrink-0">
            <Camera className="h-3.5 w-3.5 text-teal-400" />
            <span>Góc nhìn:</span>
          </span>
          <button
            onClick={() => {
              focusOnLocation(null);
              setCameraPreset("ISOMETRIC");
            }}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
              cameraPreset === "ISOMETRIC"
                ? "bg-teal-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Góc nhìn 3D Isometric Dollhouse toàn cảnh"
          >
            Dollhouse
          </button>
          <button
            onClick={() => {
              focusOnLocation(null);
              setCameraPreset("INTERIOR");
            }}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
              cameraPreset === "INTERIOR"
                ? "bg-teal-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Góc nhìn đứng tầm mắt bên trong phòng"
          >
            Tầm mắt
          </button>
          <button
            onClick={() => {
              focusOnLocation(null);
              setCameraPreset("TOP");
            }}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 ${
              cameraPreset === "TOP"
                ? "bg-teal-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Xem mặt bằng từ trên xuống"
          >
            Mặt bằng
          </button>
          <button
            onClick={() => {
              focusOnLocation(null);
              setCameraPreset("WALKTHROUGH");
            }}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              cameraPreset === "WALKTHROUGH"
                ? "bg-teal-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Đi vào phòng bằng phím WASD hoặc mũi tên"
          >
            <Footprints className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Walkthrough</span>
          </button>
          <button
            onClick={() => {
              focusOnLocation(null);
              setCameraPreset("SAFETY");
            }}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              cameraPreset === "SAFETY"
                ? "bg-rose-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Tập trung góc nhìn vào điểm nguy cơ cao nhất"
          >
            <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
            <span className="hidden sm:inline">Nguy cơ</span>
          </button>
          <button
            onClick={() => {
              focusOnLocation(null);
              setCameraPreset("COMPARISON");
            }}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              cameraPreset === "COMPARISON"
                ? "bg-teal-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Xem góc nhìn phối cảnh Trước / Sau cải tạo"
          >
            <Sliders className="h-3 w-3 text-sky-400 shrink-0" />
            <span className="hidden sm:inline">Trước/Sau</span>
          </button>
          <button
            onClick={() => {
              if (cameraPreset === "WALKTHROUGH") setCameraPreset("ISOMETRIC");
              setShowWheelchair((v) => !v);
            }}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              showWheelchair
                ? "bg-emerald-600 text-white font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Bật/tắt nhân vật người cao tuổi ngồi xe lăn (Lái bằng WASD / Mũi tên)"
          >
            <span>♿</span>
            <span className="hidden sm:inline">Xe lăn 3D</span>
          </button>
          <button
            type="button"
            aria-pressed={showSourceCompare}
            onClick={() => setShowSourceCompare((v) => !v)}
            className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0 ${
              showSourceCompare
                ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200"
            }`}
            title="Đối chiếu trực tiếp mô hình 3D với ảnh mẫu / ảnh gốc"
          >
            <ImageIcon className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Đối chiếu ảnh</span>
          </button>
          <button
            onClick={handleFitRoom}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap shrink-0"
            title="Tự động căn chỉnh toàn bộ phòng vào vừa khung nhìn"
          >
            <Maximize2 className="h-3 w-3 shrink-0" />
            <span>Fit</span>
          </button>
          <button
            onClick={handleScreenshot}
            className="min-h-[32px] px-2.5 py-1 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0"
            title="Chụp ảnh khung nhìn 3D hiện tại (PNG)"
          >
            <Camera className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline">Chụp</span>
          </button>
        </div>
      </div>

      {/* --- BOTTOM FLOATING STACK: D-PAD + PROVENANCE (ROW 1) ABOVE TOGGLES & LEGEND (ROW 2) --- */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2 pointer-events-none z-20">
        {/* Row 1: Wheelchair D-pad & WASD hint (Left) + Provenance badges B08 (Right) */}
        <div
          className={`flex flex-wrap items-end justify-between gap-2 pointer-events-none ${
            showSourceCompare ? "md:pl-[45%]" : ""
          }`}
        >
          {showWheelchair && cameraPreset !== "WALKTHROUGH" ? (
            <div className="flex items-end gap-2 pointer-events-auto">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-emerald-500/40 shadow-xl">
                <div />
                <button
                  onPointerDown={() => { wheelchairPadRef.current.fwd = true; }}
                  onPointerUp={() => { wheelchairPadRef.current.fwd = false; }}
                  onPointerLeave={() => { wheelchairPadRef.current.fwd = false; }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 active:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center"
                  title="Tiến (W / ↑)"
                  aria-label="Xe lăn: Tiến"
                >
                  ▲
                </button>
                <div />
                <button
                  onPointerDown={() => { wheelchairPadRef.current.left = true; }}
                  onPointerUp={() => { wheelchairPadRef.current.left = false; }}
                  onPointerLeave={() => { wheelchairPadRef.current.left = false; }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 active:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center"
                  title="Trái (A / ←)"
                  aria-label="Xe lăn: Trái"
                >
                  ◀
                </button>
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-300 text-[11px] flex items-center justify-center">
                  ♿
                </div>
                <button
                  onPointerDown={() => { wheelchairPadRef.current.right = true; }}
                  onPointerUp={() => { wheelchairPadRef.current.right = false; }}
                  onPointerLeave={() => { wheelchairPadRef.current.right = false; }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 active:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center"
                  title="Phải (D / →)"
                  aria-label="Xe lăn: Phải"
                >
                  ▶
                </button>
                <div />
                <button
                  onPointerDown={() => { wheelchairPadRef.current.back = true; }}
                  onPointerUp={() => { wheelchairPadRef.current.back = false; }}
                  onPointerLeave={() => { wheelchairPadRef.current.back = false; }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-emerald-600 active:bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center"
                  title="Lùi (S / ↓)"
                  aria-label="Xe lăn: Lùi"
                >
                  ▼
                </button>
                <div />
              </div>
              <div className="hidden lg:block px-2.5 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/70 text-[10.5px] text-slate-200 shadow-lg">
                <div className="font-bold text-emerald-300">Lái xe lăn kiểm định Ø1.5m</div>
                <div className="text-slate-400">Phím <kbd className="px-1 bg-slate-800 rounded text-white">WASD</kbd> / Mũi tên • <kbd className="px-1 bg-slate-800 rounded text-white">Shift</kbd> nhanh</div>
              </div>
            </div>
          ) : (
            <div />
          )}

          {/* Provenance labels (B08): room model, dimensions, simulated 3D lighting vs actual physical lux */}
          <div className="flex flex-col items-end gap-1 ml-auto max-w-full sm:max-w-md pointer-events-none">
            <div
              data-testid="room-model-label"
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold border ${
                isApproximateRoomModel(room) ? "bg-amber-950/85 text-amber-200 border-amber-700/70" : "bg-emerald-950/85 text-emerald-200 border-emerald-700/70"
              }`}
            >
              {roomModelLabel(room)} ·{" "}
              <span data-testid="room-dimensions-badge">
                {dimensionsDisplay.text} ({dimensionsDisplay.sourceLabelVi})
              </span>
            </div>
            <div
              data-testid="b08-lighting-provenance"
              className="rounded-lg px-2 py-0.5 text-[11px] font-medium border bg-slate-950/85 text-slate-200 border-slate-700/80 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 shadow"
            >
              <span data-testid="simulated-lighting-badge" className="text-sky-200">
                3D: {simulatedLightCfg.labelVi} ({sceneLightingIntensitySimulated.toFixed(2)}×)
              </span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <span
                data-testid="actual-lux-badge"
                className={
                  illuminanceDisplay.badgeTone === "measured"
                    ? "text-emerald-300 font-semibold"
                    : illuminanceDisplay.badgeTone === "estimated"
                    ? "text-amber-200"
                    : "text-slate-300"
                }
              >
                {illuminanceDisplay.statusLabelVi}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Toggles & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 pointer-events-auto shadow-lg text-xs text-white max-w-full">
            <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0">
              <input
                type="checkbox"
                checked={showHazardOverlay}
                onChange={() =>
                  useSimulationStore.getState().toggleHazardOverlay()
                }
                className="rounded text-rose-500 focus:ring-rose-400 h-3.5 w-3.5"
              />
              <span className="text-xs font-medium text-rose-300">
                Cảnh báo nguy cơ
              </span>
            </label>

            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">|</span>

            <label
              className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Gom cụm các cảnh báo nằm gần nhau (<0.95m) để chống đè lấn nhãn"
            >
              <input
                type="checkbox"
                checked={clusterMarkers}
                onChange={(e) => setClusterMarkers(e.target.checked)}
                className="rounded text-teal-500 focus:ring-teal-400 h-3.5 w-3.5"
              />
              <span className="text-xs font-medium text-teal-300">
                Gom cụm chống đè
              </span>
            </label>

            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">|</span>

            <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0">
              <input
                type="checkbox"
                checked={showAllLabels}
                onChange={(e) => setShowAllLabels(e.target.checked)}
                className="rounded text-sky-500 focus:ring-sky-400 h-3.5 w-3.5"
              />
              <span className="text-xs font-medium text-slate-300">
                Tên đồ vật
              </span>
            </label>

            <span className="text-slate-600 hidden sm:inline" aria-hidden="true">|</span>

            <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0">
              <input
                type="checkbox"
                checked={showWalkingZones}
                onChange={() =>
                  useSimulationStore.getState().toggleWalkingZones()
                }
                className="rounded text-emerald-500 focus:ring-emerald-400 h-3.5 w-3.5"
              />
              <span className="text-xs font-medium text-emerald-300">
                Hành lang
              </span>
            </label>

            {selectedObjectId && (
              <>
                <span className="text-slate-600 hidden sm:inline" aria-hidden="true">|</span>
                <button
                  onClick={handleFocusSelected}
                  className="flex items-center gap-1 text-xs font-bold text-sky-400 hover:text-sky-300 transition whitespace-nowrap shrink-0"
                >
                  <Focus className="h-3 w-3" />
                  <span>Focus vật thể</span>
                </button>
              </>
            )}
          </div>

          {/* Legend */}
          <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 pointer-events-auto text-[11px] text-slate-300 hidden sm:flex items-center gap-2.5 shadow-lg whitespace-nowrap shrink-0">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-rose-600 text-[10px] font-black text-white">
                H
              </span>
              <span className="font-semibold text-rose-400">Nguy cơ cao</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-600 text-[10px] font-black text-white">
                H
              </span>
              <span>Cần lưu ý</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Lối đi an toàn</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
