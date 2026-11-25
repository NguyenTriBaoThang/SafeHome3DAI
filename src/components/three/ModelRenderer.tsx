"use client";

import React, { useMemo, useEffect, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { SceneObjectState } from "@/types";
import { ASSET_REGISTRY } from "@/data/assetRegistry";
import { ProceduralModelBody } from "./ProceduralFurniture";
import { normalizeModel } from "@/lib/assets/modelPlacement";
import { ArchitecturalBed } from "./ArchitecturalBed";
import { ArchitecturalToilet, ArchitecturalVanity } from "./ArchitecturalFixtures";

interface ModelRendererProps {
  object: SceneObjectState;
  isSelected: boolean;
  hasHazard: boolean;
  hazardSeverity?: "LOW" | "MEDIUM" | "HIGH";
  onClick: (e: any) => void;
}

/**
 * Per-object boundary so a missing/corrupted GLB file degrades gracefully to a procedural fallback
 * instead of crashing the whole WebGL scene.
 */
class AssetErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * GLB Asset Loader with automatic cloning, shadow assignment, and material tuning.
 */
function GLBModel({
  glbPath,
  assetId,
  dimensions,
}: {
  glbPath: string;
  assetId?: string;
  dimensions: { width: number; length: number; height: number };
}) {
  const { scene } = useGLTF(glbPath);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const assetDef = assetId ? ASSET_REGISTRY[assetId] : null;

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : mesh.material.clone();

        // Enhance material properties for PBR fidelity
        if (mesh.material) {
          const mat = (
            Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
          ) as THREE.MeshStandardMaterial;

          if (mat) {
            mat.envMapIntensity = 1.0;
            // Trimesh-generated GLBs may inherit metallic=1 without an IBL.
            // Keep porcelain, wood and textiles dielectric instead of black.
            if (!/metal|chrome|steel/i.test(mat.name)) mat.metalness = Math.min(mat.metalness, 0.08);
            // Glass materials tuning
            if (
              mat.name.toLowerCase().includes("glass") ||
              mat.transparent ||
              mat.opacity < 0.95
            ) {
              mat.transparent = true;
              mat.opacity = 0.35;
              mat.roughness = 0.05;
              mat.metalness = 0.1;
              mat.side = THREE.DoubleSide;
            } else if (
              mat.name.toLowerCase().includes("metal") ||
              mat.name.toLowerCase().includes("chrome")
            ) {
              mat.metalness = 0.9;
              mat.roughness = 0.15;
            }
          }
        }
      }
    });

    return normalizeModel(clone, dimensions);
  }, [scene, assetId, dimensions.width, dimensions.height, dimensions.length]);
  useEffect(() => () => clonedScene.traverse((child) => {
    if (child instanceof THREE.Mesh) (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => material.dispose());
  }), [clonedScene]);

  return <primitive object={clonedScene} />;
}

/**
 * Universal ModelRenderer that dynamically loads GLB assets or photorealistic procedural meshes.
 */
export const ModelRenderer: React.FC<ModelRendererProps> = ({
  object,
  isSelected,
  hasHazard,
  hazardSeverity,
  onClick,
}) => {
  const { assetId, glbPath, modelType, dimensions } = object;

  // Resolve GLB path from object or asset registry only if not explicitly marked procedural
  const isExplicitProcedural = assetId?.startsWith("procedural_");

  const resolvedGlb = isExplicitProcedural
    ? null
    : glbPath ||
      (assetId && ASSET_REGISTRY[assetId]?.glbPath) ||
      (modelType === "bed" ? "/models/bedroom/double_bed_photoreal.glb" : null) ||
      (modelType === "toilet" ? "/models/bathroom/toilet_modern.glb" : null) ||
      (modelType === "sink" ? "/models/bathroom/bathroom_vanity.glb" : null) ||
      (modelType === "shower" ? "/models/bathroom/shower_enclosure.glb" : null) ||
      (modelType === "plant" ? "/models/decoration/potted_plant.glb" : null) ||
      (modelType === "window" ? "/models/architecture/modern_window.glb" : null) ||
      (modelType === "grab_bar" ? "/models/safety/safety_grab_bar.glb" : null);

  const hazardColor =
    hazardSeverity === "HIGH"
      ? "#db8540"
      : hazardSeverity === "MEDIUM"
      ? "#f59e0b"
      : "#3b82f6";

  return (
    <group
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      {/* 3D Model Rendering: Real GLB or Photorealistic Procedural PBR Model with Progressive Error Fallback */}
      {modelType === "bed" ? (
        <AssetErrorBoundary fallback={<ProceduralModelBody object={object} hasHazard={hasHazard} />}>
          <Suspense fallback={<ProceduralModelBody object={object} hasHazard={hasHazard} />}>
            <ArchitecturalBed dimensions={dimensions} />
          </Suspense>
        </AssetErrorBoundary>
      ) : modelType === "toilet" ? (
        <ArchitecturalToilet dimensions={dimensions} />
      ) : modelType === "sink" ? (
        <ArchitecturalVanity dimensions={dimensions} />
      ) : resolvedGlb ? (
        <AssetErrorBoundary fallback={<ProceduralModelBody object={object} hasHazard={hasHazard} />}>
          <Suspense
            fallback={
              <mesh position={[0, dimensions.height * 0.5, 0]}>
                <boxGeometry
                  args={[dimensions.width, dimensions.height, dimensions.length]}
                />
                <meshStandardMaterial color="#94a3b8" wireframe />
              </mesh>
            }
          >
            <GLBModel
              glbPath={resolvedGlb}
              assetId={assetId}
              dimensions={dimensions}
            />
          </Suspense>
        </AssetErrorBoundary>
      ) : (
        <ProceduralModelBody object={object} hasHazard={hasHazard} />
      )}

      {/* Selected Wireframe Bounding Box Indicator */}
      {isSelected && (
        <group position={[0, dimensions.height * 0.5, 0]}>
          <mesh>
            <boxGeometry
              args={[
                dimensions.width + 0.08,
                dimensions.height + 0.08,
                dimensions.length + 0.08,
              ]}
            />
            <meshBasicMaterial
              color="#0284c7"
              wireframe
              transparent
              opacity={0.75}
            />
          </mesh>
        </group>
      )}

      {/* Subtle Hazard Danger Floor Perimeter Indicator */}
      {hasHazard && (
        <group position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh receiveShadow>
            <planeGeometry
              args={[dimensions.width + 0.2, dimensions.length + 0.2]}
            />
            <meshBasicMaterial
              color={hazardColor}
              transparent
              opacity={0.22}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <ringGeometry
              args={[
                Math.max(dimensions.width, dimensions.length) * 0.5 + 0.08,
                Math.max(dimensions.width, dimensions.length) * 0.5 + 0.12,
                32,
              ]}
            />
            <meshBasicMaterial
              color={hazardColor}
              side={THREE.DoubleSide}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

// useGLTF caches assets after first use. Load only the models used by the
// current room, including on clients which do not have a WebGL context.
