"use client";

import React, { useMemo, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomState } from "@/types";

interface AccessibleSuiteModelProps {
  room: RoomState;
  cutaway: boolean;
  transparentWalls: boolean;
  showWalkingZones: boolean;
  showGrid: boolean;
  isNightMode: boolean;
  lightingPreset: "MORNING" | "AFTERNOON" | "NIGHT" | "STUDIO";
}

/**
 * Full SafeHome-integrated 3D renderer for the custom Blender Accessible Geriatric Suite.
 * Synchronizes ceiling cutaway, transparent walls, wet bathroom tile PBR (isWet),
 * grab bar count, rug remediation states (loose vs fixed), walking zones, metric grid,
 * and Lux-coupled dynamic lighting.
 */
export const AccessibleSuiteModel: React.FC<AccessibleSuiteModelProps> = ({
  room,
  cutaway,
  transparentWalls,
  showWalkingZones,
  showGrid,
  isNightMode,
  lightingPreset,
}) => {
  const { scene } = useGLTF("/models/architecture/safehome_accessible_suite.glb");

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m) => m.clone())
            : mesh.material.clone();
          const mat = (
            Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
          ) as THREE.MeshStandardMaterial;
          if (mat) {
            mat.userData.origColor = mat.color.clone();
            mat.userData.origOpacity = mat.opacity;
            mat.userData.origTransparent = mat.transparent;
            if (mat.name.includes("Glass") || mat.transparent) {
              mat.transparent = true;
              mat.opacity = 0.28;
              mat.roughness = 0.06;
              mat.side = THREE.DoubleSide;
            }
          }
        }
      }
    });
    return clone;
  }, [scene]);

  const bedsideRugObj = room.objects.find((o) => o.id === "obj-suite-rug-01");
  const bathMatObj = room.objects.find((o) => o.id === "obj-suite-bathmat-01");

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const name = mesh.name;
      const mat = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as THREE.MeshStandardMaterial | undefined;

      // 1. Ceiling cutaway sync
      if (name.startsWith("CEIL_")) {
        mesh.visible = !cutaway;
        return;
      }

      // 2. Ergonomic Ø1.5m overlay sync
      if (name.startsWith("OVERLAY_")) {
        mesh.visible = showWalkingZones;
        return;
      }

      // 3. Grab bars sync with room.grabBarsCount
      if (name.startsWith("SAFE_toilet_grab") || name.startsWith("SAFE_shower_grab") || name.startsWith("SAFE_basin_grab")) {
        mesh.visible = room.grabBarsCount > 0;
        return;
      }

      // 4. Transparent walls toggle sync
      if (
        (name.startsWith("SHELL_wall_") ||
          name.startsWith("SHELL_part_wall_") ||
          name.startsWith("SHELL_bath_wall_")) &&
        mat
      ) {
        mat.transparent = transparentWalls ? true : Boolean(mat.userData.origTransparent);
        mat.opacity = transparentWalls ? 0.22 : (mat.userData.origOpacity ?? 1.0);
        mat.depthWrite = !transparentWalls;
        mat.needsUpdate = true;
        return;
      }

      // 5. Bathroom floor wet/slip-resistant PBR sync (isWet)
      if (name === "SHELL_bathroom_floor" && mat) {
        mat.roughness = room.isWet ? 0.08 : room.isSlipResistant ? 0.78 : 0.35;
        mat.metalness = room.isWet ? 0.36 : 0.0;
        if (mat.userData.origColor) {
          mat.color.copy(mat.userData.origColor);
          if (room.isWet) mat.color.multiplyScalar(0.84);
        }
        mat.needsUpdate = true;
        return;
      }

      // 6. Bedside rug & bath mat live What-If remediation sync
      if (name === "HAZARD_bedside_rug" && mat) {
        mesh.visible = Boolean(bedsideRugObj);
        if (bedsideRugObj && mat.userData.origColor) {
          const isFixed = bedsideRugObj.isFixed && !bedsideRugObj.isLoose;
          mat.color.copy(mat.userData.origColor);
          if (isFixed) {
            mat.color.lerp(new THREE.Color("#10b981"), 0.25);
          } else {
            mat.color.lerp(new THREE.Color("#f43f5e"), 0.22);
          }
          mat.needsUpdate = true;
        }
        return;
      }

      if (name === "HAZARD_bath_mat" && mat) {
        mesh.visible = Boolean(bathMatObj);
        if (bathMatObj && mat.userData.origColor) {
          const isFixed = bathMatObj.isFixed && !bathMatObj.isLoose;
          mat.color.copy(mat.userData.origColor);
          if (isFixed) {
            mat.color.lerp(new THREE.Color("#10b981"), 0.28);
          } else {
            mat.color.lerp(new THREE.Color("#f59e0b"), 0.26);
          }
          mat.needsUpdate = true;
        }
      }
    });
  }, [
    clonedScene,
    cutaway,
    transparentWalls,
    showWalkingZones,
    room.isWet,
    room.isSlipResistant,
    room.grabBarsCount,
    bedsideRugObj?.isFixed,
    bedsideRugObj?.isLoose,
    Boolean(bedsideRugObj),
    bathMatObj?.isFixed,
    bathMatObj?.isLoose,
    Boolean(bathMatObj),
  ]);

  // Lux-coupled dynamic lighting (matches SafeHome lighting studio & CDC <50 Lux night risk)
  const effectiveNight = isNightMode || lightingPreset === "NIGHT" || room.lightingLevel < 60;
  const luxFactor = THREE.MathUtils.clamp(room.lightingLevel / 250, 0.22, 1.35);

  return (
    <group>
      <color attach="background" args={[effectiveNight ? "#0b1120" : "#dde3ea"]} />
      <hemisphereLight
        args={[
          effectiveNight ? "#334155" : "#fffaf0",
          effectiveNight ? "#0f172a" : "#64748b",
          effectiveNight ? 0.32 : 0.85 * luxFactor,
        ]}
      />
      <directionalLight
        position={[-4.5, 8.5, 5.0]}
        intensity={
          effectiveNight
            ? 0.35
            : lightingPreset === "MORNING"
            ? 1.75 * luxFactor
            : 1.45 * luxFactor
        }
        color={
          effectiveNight
            ? "#93c5fd"
            : lightingPreset === "MORNING"
            ? "#ffe9c4"
            : "#ffffff"
        }
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[-0.6, 2.4, -0.4]}
        intensity={effectiveNight ? 1.15 : 0.55 * luxFactor}
        color={effectiveNight ? "#fbbf24" : "#fff3dc"}
        distance={9}
      />
      <pointLight
        position={[2.8, 2.4, -0.4]}
        intensity={effectiveNight ? 0.7 : 0.65 * luxFactor}
        color="#f0f9ff"
        distance={7}
      />

      {/* Custom Blender Accessible Suite GLB centered at (0, 0, 0) */}
      <primitive object={clonedScene} position={[-2.95, 0, -0.25]} />

      {/* Optional Architectural Metric Grid (when showMeasurements is toggled ON) */}
      {showGrid && <gridHelper args={[10, 20, "#0f766e", "#94a3b8"]} position={[0.4, 0.004, -0.2]} />}

      {/* Walking Zone Path Strips (when showWalkingZones is toggled ON) */}
      {showWalkingZones &&
        room.walkingZones.map((zone) => {
          const [x1, z1] = zone.startPoint;
          const [x2, z2] = zone.endPoint;
          const dx = x2 - x1;
          const dz = z2 - z1;
          const len = Math.hypot(dx, dz);
          if (len < 0.05) return null;
          const angle = Math.atan2(dx, dz);
          return (
            <mesh
              key={zone.id}
              position={[(x1 + x2) / 2, 0.011, (z1 + z2) / 2]}
              rotation={[-Math.PI / 2, 0, angle]}
            >
              <planeGeometry args={[zone.width * 0.45, len]} />
              <meshBasicMaterial
                color={zone.importance === "CRITICAL" ? "#14b8a6" : "#38bdf8"}
                transparent
                opacity={0.22}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
    </group>
  );
};

useGLTF.preload("/models/architecture/safehome_accessible_suite.glb");
