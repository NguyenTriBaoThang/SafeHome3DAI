"use client";

import React, { useMemo, Suspense } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { SceneObjectState } from "@/types";
import { ASSET_REGISTRY } from "@/data/assetRegistry";

interface ModelRendererProps {
  object: SceneObjectState;
  isSelected: boolean;
  hasHazard: boolean;
  hazardSeverity?: "LOW" | "MEDIUM" | "HIGH";
  onClick: (e: any) => void;
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

        // Enhance material properties for PBR fidelity
        if (mesh.material) {
          const mat = (
            Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
          ) as THREE.MeshStandardMaterial;

          if (mat) {
            mat.envMapIntensity = 1.0;
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

    return clone;
  }, [scene, assetId]);

  return <primitive object={clonedScene} />;
}

/**
 * High-detail Procedural Rug with textured woven surface and border fringe
 */
function ProceduralRug({
  dimensions,
  isLoose,
}: {
  dimensions: { width: number; length: number; height: number };
  isLoose?: boolean;
}) {
  return (
    <group position={[0, 0.005, 0]}>
      {/* Main woven body */}
      <mesh receiveShadow position={[0, 0.006, 0]}>
        <boxGeometry args={[dimensions.width, 0.012, dimensions.length]} />
        <meshStandardMaterial
          color={isLoose ? "#e11d48" : "#d8cfc4"}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>
      {/* Inner decorative woven weave accent */}
      <mesh receiveShadow position={[0, 0.013, 0]}>
        <boxGeometry
          args={[dimensions.width * 0.92, 0.002, dimensions.length * 0.92]}
        />
        <meshStandardMaterial
          color={isLoose ? "#fda4af" : "#beb3a6"}
          roughness={0.95}
        />
      </mesh>
      {/* Woven fringe borders on short ends */}
      <mesh receiveShadow position={[0, 0.006, dimensions.length * 0.5 + 0.02]}>
        <boxGeometry args={[dimensions.width * 0.95, 0.008, 0.04]} />
        <meshStandardMaterial color="#f0ece6" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[0, 0.006, -dimensions.length * 0.5 - 0.02]}>
        <boxGeometry args={[dimensions.width * 0.95, 0.008, 0.04]} />
        <meshStandardMaterial color="#f0ece6" roughness={0.95} />
      </mesh>
    </group>
  );
}

function ScannedFurniture({ kind, size }: { kind: string; size: SceneObjectState["dimensions"] }) {
  const { width, height, length } = size;
  const hasBack = kind === "chair" || kind === "sofa";
  const top = hasBack ? height * 0.53 : height;
  const thickness = kind === "sofa" ? 0.25 : 0.065;
  const finish = kind === "desk" ? "#bfaa91" : "#d4c4af";
  return <group>
    <mesh position={[0, top - thickness / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, thickness, length]} /><meshStandardMaterial color={finish} />
    </mesh>
    {hasBack && <mesh position={[0, (height + top) / 2, -length * 0.44]} castShadow>
      <boxGeometry args={[width, height - top, length * 0.12]} /><meshStandardMaterial color={finish} />
    </mesh>}
    {[-1, 1].flatMap(x => [-1, 1].map(z => <mesh key={`${x},${z}`} position={[x * width * 0.42, (top - thickness) / 2, z * length * 0.4]} castShadow>
      <boxGeometry args={[0.055, top - thickness, 0.055]} /><meshStandardMaterial color="#87705a" />
    </mesh>))}
  </group>;
}

/**
 * Universal ModelRenderer that dynamically loads GLB assets or procedural meshes.
 */
export const ModelRenderer: React.FC<ModelRendererProps> = ({
  object,
  isSelected,
  hasHazard,
  hazardSeverity,
  onClick,
}) => {
  const { assetId, glbPath, modelType, dimensions } = object;

  // Resolve GLB path from object or asset registry
  const resolvedGlb =
    glbPath ||
    (assetId && ASSET_REGISTRY[assetId]?.glbPath) ||
    (modelType === "bed" ? "/models/bedroom/double_bed_photoreal.glb" : null) ||
    (modelType === "nightstand"
      ? "/models/bedroom/bedside_table_lamp.glb"
      : null) ||
    (modelType === "wardrobe"
      ? "/models/wardrobe/walkin_closet_system.glb"
      : null) ||
    (modelType === "toilet" ? "/models/bathroom/toilet_modern.glb" : null) ||
    (modelType === "sink" ? "/models/bathroom/bathroom_vanity.glb" : null) ||
    (modelType === "shower"
      ? "/models/bathroom/shower_enclosure.glb"
      : null) ||
    (modelType === "plant" ? "/models/decoration/potted_plant.glb" : null) ||
    (modelType === "wall_art"
      ? "/models/decoration/framed_wall_art.glb"
      : null) ||
    (modelType === "window"
      ? "/models/architecture/modern_window.glb"
      : null) ||
    (modelType === "grab_bar" ? "/models/safety/safety_grab_bar.glb" : null);

  const hazardColor =
    hazardSeverity === "HIGH"
      ? "#ef4444"
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
      {/* 3D Model Rendering */}
      {modelType === "rug" ? (
        <ProceduralRug dimensions={dimensions} isLoose={object.isLoose} />
      ) : assetId?.startsWith("procedural_") && ["chair", "sofa", "stool", "desk"].includes(modelType) ? (
        <ScannedFurniture kind={modelType} size={dimensions} />
      ) : modelType === "curtain" ? (
        <group>
          {Array.from({ length: 24 }, (_, i) => (
            <mesh key={i} position={[(i / 24 - 0.5 + 1 / 48) * dimensions.width, dimensions.height / 2, (i % 2) * 0.025]}>
              <cylinderGeometry args={[dimensions.width / 34, dimensions.width / 34, dimensions.height, 8]} />
              <meshStandardMaterial color="#e4d9c8" roughness={1} />
            </mesh>
          ))}
        </group>
      ) : modelType === "tv" || modelType === "mirror" || modelType === "media_console" ? (
        <mesh position={[0, dimensions.height / 2, 0]} castShadow>
          <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
          <meshStandardMaterial color={modelType === "tv" ? "#242528" : modelType === "mirror" ? "#c4d1d4" : "#c7b69d"} roughness={modelType === "media_console" ? 0.7 : 0.16} />
        </mesh>
      ) : resolvedGlb ? (
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
      ) : (
        /* Fallback for unmapped primitive objects */
        <mesh
          position={[0, dimensions.height * 0.5, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry
            args={[dimensions.width, dimensions.height, dimensions.length]}
          />
          <meshStandardMaterial color="#64748b" roughness={0.6} />
        </mesh>
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

// Pre-preload common models for zero-lag rendering
try {
  useGLTF.preload("/models/bedroom/double_bed_photoreal.glb");
  useGLTF.preload("/models/bedroom/bedside_table_lamp.glb");
  useGLTF.preload("/models/wardrobe/walkin_closet_system.glb");
  useGLTF.preload("/models/wardrobe/drawer_cabinet.glb");
  useGLTF.preload("/models/bathroom/toilet_modern.glb");
  useGLTF.preload("/models/bathroom/bathroom_vanity.glb");
  useGLTF.preload("/models/bathroom/shower_enclosure.glb");
  useGLTF.preload("/models/decoration/potted_plant.glb");
  useGLTF.preload("/models/decoration/framed_wall_art.glb");
  useGLTF.preload("/models/architecture/modern_window.glb");
  useGLTF.preload("/models/safety/safety_grab_bar.glb");
} catch (e) {
  // Preload is optional in test environments
}
