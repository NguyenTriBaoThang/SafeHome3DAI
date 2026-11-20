"use client";

import React, { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "@/components/three/RoomEnvironment";
import { ModelRenderer } from "@/components/three/ModelRenderer";
import { PHOTOREALISTIC_DOLLHOUSE_ROOM } from "@/data/dollhouseReferenceScene";
import { ChapterData } from "./experienceData";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

/**
 * Smooth Camera Interpolator driven by active Chapter
 */
function CinematicCameraController({
  chapter,
  isUserInteracting,
}: {
  chapter: ChapterData;
  isUserInteracting: boolean;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  const targetPos = useMemo(
    () => new THREE.Vector3(...chapter.cameraPosition),
    [chapter.cameraPosition]
  );
  const targetLook = useMemo(
    () => new THREE.Vector3(...chapter.cameraLookAt),
    [chapter.cameraLookAt]
  );

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    // Smoothly lerp towards chapter target when user is not actively dragging
    if (!isUserInteracting) {
      const lerpSpeed = Math.min(delta * 2.5, 0.08);
      camera.position.lerp(targetPos, lerpSpeed);
      controlsRef.current.target.lerp(targetLook, lerpSpeed);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.0}
      maxDistance={25.0}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}

/**
 * Cinematic 3D Scene Host
 */
export function CinematicScene({
  activeChapter,
  isComparisonActive,
  comparisonMode,
}: {
  activeChapter: ChapterData;
  isComparisonActive?: boolean;
  comparisonMode?: "BEFORE" | "AFTER";
}) {
  const [isInteracting, setIsInteracting] = React.useState(false);

  // Determine effective safe state
  const isSafe = isComparisonActive
    ? comparisonMode === "AFTER"
    : activeChapter.isSafeState;

  // Clone dollhouse room with simulated modifications based on safe state
  const sceneRoom = useMemo(() => {
    const baseRoom = JSON.parse(
      JSON.stringify(PHOTOREALISTIC_DOLLHOUSE_ROOM)
    );

    if (isSafe) {
      // 1. Tucked cable
      baseRoom.objects = baseRoom.objects.filter(
        (o: any) => o.id !== "obj-cable-hazard-01"
      );
      // 2. Fixed rug
      baseRoom.objects = baseRoom.objects.map((o: any) => {
        if (o.modelType === "rug") {
          return {
            ...o,
            isFixed: true,
            isLoose: false,
            name: "Thảm dệt dán keo cố định mép chống trượt (Safe)",
          };
        }
        return o;
      });
      // 3. Add safety grab bars & anti-slip mat if not present
      const hasGrabBar = baseRoom.objects.some(
        (o: any) => o.modelType === "grab_bar"
      );
      if (!hasGrabBar) {
        baseRoom.objects.push({
          id: "obj-simulated-grabbar-toilet",
          roomId: baseRoom.id,
          name: "Thanh vịn an toàn bồn cầu (Inox 304 tiêu chuẩn)",
          category: "SAFETY_DEVICE",
          modelType: "grab_bar",
          position: [1.8, 0.85, 2.2],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          dimensions: { width: 0.6, length: 0.1, height: 0.1 },
          isFixed: true,
          verified: true,
        });
      }
      baseRoom.lightingLevel = 320;
    } else {
      baseRoom.lightingLevel =
        activeChapter.lightingPreset === "NIGHT" ? 40 : 250;
    }

    return baseRoom;
  }, [isSafe, activeChapter.lightingPreset]);

  // Risk markers definition
  const riskMarkers = useMemo(() => {
    if (!activeChapter.showRiskMarkers && !isComparisonActive) return [];
    if (isSafe) return [];

    return [
      {
        id: "RISK-001",
        label: "Thảm trượt không cố định",
        penalty: "-18đ",
        position: [-1.4, 0.25, 1.1] as [number, number, number],
        severity: "HIGH",
      },
      {
        id: "RISK-002",
        label: "Dây điện vắt ngang lối đi",
        penalty: "-20đ",
        position: [-1.1, 0.2, 0.4] as [number, number, number],
        severity: "HIGH",
      },
      {
        id: "RISK-003",
        label: "Lối đi hẹp <80cm",
        penalty: "-14đ",
        position: [-0.6, 0.6, -0.4] as [number, number, number],
        severity: "MEDIUM",
      },
      {
        id: "RISK-004",
        label: "Chiếu sáng ban đêm 40 Lux",
        penalty: "-20đ",
        position: [-2.1, 1.8, -0.4] as [number, number, number],
        severity: "HIGH",
      },
    ];
  }, [activeChapter.showRiskMarkers, isSafe, isComparisonActive]);

  return (
    <div
      className="w-full h-full relative"
      onPointerDown={() => setIsInteracting(true)}
      onPointerUp={() => setIsInteracting(false)}
    >
      <Canvas
        shadows
        camera={{ position: [7.8, 8.6, 8.4], fov: 38 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: activeChapter.lightingPreset === "NIGHT" ? 0.75 : 1.1,
          powerPreference: "high-performance",
        }}
      >
        {/* Soft Background Tint */}
        <color
          attach="background"
          args={[
            activeChapter.lightingPreset === "NIGHT" ? "#070c14" : "#f1f5f9",
          ]}
        />

        {/* Dynamic Architectural Lighting & Environment */}
        <RoomEnvironment
          room={sceneRoom}
          showWalkingZones={activeChapter.id >= 2}
          showGrid={false}
          transparentWalls={true}
          isNightMode={activeChapter.lightingPreset === "NIGHT"}
          lightingPreset={activeChapter.lightingPreset}
        />

        {/* Camera Interpolator */}
        <CinematicCameraController
          chapter={activeChapter}
          isUserInteracting={isInteracting}
        />

        {/* Photorealistic Room Furniture Meshes */}
        <group>
          {sceneRoom.objects.map((obj: any) => {
            const hasHazard =
              !isSafe &&
              (obj.id === "obj-cable-hazard-01" ||
                obj.modelType === "rug" ||
                obj.id === "obj-nightstand-left-01");

            return (
              <ModelRenderer
                key={obj.id}
                object={obj}
                isSelected={false}
                hasHazard={hasHazard}
                hazardSeverity={hasHazard ? "HIGH" : undefined}
                onClick={() => {}}
              />
            );
          })}
        </group>

        {/* 3D Floating Risk Markers */}
        {riskMarkers.map((marker) => (
          <group key={marker.id} position={marker.position}>
            <Html center distanceFactor={10} zIndexRange={[100, 0]}>
              <div className="flex flex-col items-center pointer-events-auto cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-60" />
                  <div className="relative h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white text-[10px] font-bold">
                    !
                  </div>
                </div>
                <div className="mt-1 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-semibold whitespace-nowrap border border-slate-700 shadow-xl flex items-center gap-1.5 transition-transform group-hover:scale-105">
                  <span className="text-red-400 font-bold">{marker.penalty}</span>
                  <span>{marker.label}</span>
                </div>
              </div>
            </Html>
          </group>
        ))}

        {/* Safe State Floating Badge in Chapter 5 & 6 */}
        {isSafe && (
          <group position={[0.2, 2.6, 0.4]}>
            <Html center distanceFactor={12} zIndexRange={[100, 0]}>
              <div className="px-4 py-2 rounded-2xl bg-teal-900/90 backdrop-blur-md text-white text-xs font-bold border border-teal-500/50 shadow-2xl flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
                <span>Không gian đã được tối ưu an toàn 100/100</span>
              </div>
            </Html>
          </group>
        )}

        {/* Contact Ground Shadows */}
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.45}
          scale={14}
          blur={2.2}
          far={4}
        />
      </Canvas>
    </div>
  );
}

