"use client";

import React from "react";
import * as THREE from "three";
import { SceneObjectState } from "@/types";

interface ObjectModelProps {
  object: SceneObjectState;
  isSelected: boolean;
  hasHazard: boolean;
  hazardSeverity?: "LOW" | "MEDIUM" | "HIGH";
  onClick: (e: any) => void;
}

export const ProceduralFurniture: React.FC<ObjectModelProps> = ({
  object,
  isSelected,
  hasHazard,
  hazardSeverity,
  onClick,
}) => {
  const { modelType, dimensions } = object;

  // Determine highlight border / emission
  const hazardColor =
    hazardSeverity === "HIGH"
      ? "#ef4444"
      : hazardSeverity === "MEDIUM"
      ? "#f59e0b"
      : "#3b82f6";

  const renderModel = () => {
    switch (modelType) {
      case "bed":
        return (
          <group>
            {/* Wooden Bed Base */}
            <mesh position={[0, dimensions.height * 0.25, 0]} castShadow receiveShadow>
              <boxGeometry args={[dimensions.width, dimensions.height * 0.4, dimensions.length]} />
              <meshStandardMaterial color="#8b5a2b" roughness={0.6} />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, dimensions.height * 0.55, 0]} castShadow receiveShadow>
              <boxGeometry
                args={[dimensions.width * 0.95, dimensions.height * 0.35, dimensions.length * 0.95]}
              />
              <meshStandardMaterial color="#f8fafc" roughness={0.8} />
            </mesh>
            {/* Bed Sheet / Duvet */}
            <mesh position={[0, dimensions.height * 0.58, dimensions.length * 0.1]} castShadow>
              <boxGeometry
                args={[dimensions.width * 0.96, dimensions.height * 0.36, dimensions.length * 0.7]}
              />
              <meshStandardMaterial color="#38bdf8" roughness={0.7} />
            </mesh>
            {/* Pillows */}
            <mesh position={[-dimensions.width * 0.24, dimensions.height * 0.78, -dimensions.length * 0.35]} castShadow>
              <boxGeometry args={[dimensions.width * 0.38, 0.12, 0.45]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
            <mesh position={[dimensions.width * 0.24, dimensions.height * 0.78, -dimensions.length * 0.35]} castShadow>
              <boxGeometry args={[dimensions.width * 0.38, 0.12, 0.45]} />
              <meshStandardMaterial color="#ffffff" roughness={0.5} />
            </mesh>
            {/* Headboard */}
            <mesh
              position={[0, dimensions.height * 0.7, -dimensions.length * 0.48]}
              castShadow
            >
              <boxGeometry args={[dimensions.width, dimensions.height * 0.8, 0.08]} />
              <meshStandardMaterial color="#654321" roughness={0.5} />
            </mesh>
          </group>
        );

      case "nightstand":
        return (
          <group>
            <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
              <meshStandardMaterial color="#a0522d" roughness={0.6} />
            </mesh>
            {/* Table Lamp Base */}
            <mesh position={[0, dimensions.height + 0.08, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.09, 0.16, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.2} />
            </mesh>
            {/* Lamp Shade with emission */}
            <mesh position={[0, dimensions.height + 0.22, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.14, 0.14, 16]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#fde047"
                emissiveIntensity={0.6}
              />
            </mesh>
          </group>
        );

      case "wardrobe":
        return (
          <group>
            <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
              <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
              <meshStandardMaterial color="#5c3d2e" roughness={0.5} />
            </mesh>
            {/* Door seam accent */}
            <mesh position={[dimensions.width * 0.51, dimensions.height * 0.5, 0]}>
              <boxGeometry args={[0.01, dimensions.height * 0.95, 0.02]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        );

      case "rug":
        return (
          <group>
            <mesh position={[0, 0.015, 0]} receiveShadow>
              <boxGeometry args={[dimensions.width, 0.02, dimensions.length]} />
              <meshStandardMaterial
                color={object.isLoose ? "#e11d48" : "#0d9488"}
                roughness={0.9}
              />
            </mesh>
            {/* Border stripes */}
            <mesh position={[0, 0.022, 0]} receiveShadow>
              <boxGeometry args={[dimensions.width * 0.9, 0.01, dimensions.length * 0.9]} />
              <meshStandardMaterial
                color={object.isLoose ? "#fda4af" : "#99f6e4"}
                roughness={0.9}
              />
            </mesh>
          </group>
        );

      case "cable":
        return (
          <group>
            {/* Electrical cable crossing floor */}
            <mesh position={[0, 0.015, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, dimensions.length, 12]} />
              <meshStandardMaterial color="#0f172a" roughness={0.4} />
            </mesh>
            {/* Power plug / socket box at one end */}
            <mesh position={[0, 0.03, -dimensions.length * 0.48]} castShadow>
              <boxGeometry args={[0.08, 0.06, 0.12]} />
              <meshStandardMaterial color="#ffffff" roughness={0.3} />
            </mesh>
          </group>
        );

      case "coffee_table":
        return (
          <group>
            {/* Table top */}
            <mesh position={[0, dimensions.height, 0]} castShadow receiveShadow>
              <boxGeometry args={[dimensions.width, 0.04, dimensions.length]} />
              <meshStandardMaterial color="#334155" roughness={0.3} />
            </mesh>
            {/* 4 Legs */}
            {[
              [-dimensions.width * 0.42, -dimensions.length * 0.42],
              [dimensions.width * 0.42, -dimensions.length * 0.42],
              [-dimensions.width * 0.42, dimensions.length * 0.42],
              [dimensions.width * 0.42, dimensions.length * 0.42],
            ].map(([lx, lz], i) => (
              <mesh
                key={i}
                position={[lx, dimensions.height * 0.5, lz]}
                castShadow
              >
                <cylinderGeometry args={[0.025, 0.025, dimensions.height, 12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.7} />
              </mesh>
            ))}
          </group>
        );

      case "box":
        return (
          <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#d97706" roughness={0.8} />
          </mesh>
        );

      case "toilet":
        return (
          <group>
            {/* Toilet Base */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <boxGeometry args={[dimensions.width * 0.7, 0.4, dimensions.length * 0.7]} />
              <meshStandardMaterial color="#ffffff" roughness={0.1} />
            </mesh>
            {/* Toilet Bowl */}
            <mesh position={[0, 0.42, dimensions.length * 0.15]} castShadow>
              <cylinderGeometry
                args={[dimensions.width * 0.42, dimensions.width * 0.35, 0.12, 24]}
              />
              <meshStandardMaterial color="#ffffff" roughness={0.1} />
            </mesh>
            {/* Water Tank */}
            <mesh position={[0, 0.55, -dimensions.length * 0.28]} castShadow>
              <boxGeometry args={[dimensions.width * 0.8, 0.45, 0.22]} />
              <meshStandardMaterial color="#ffffff" roughness={0.1} />
            </mesh>
          </group>
        );

      case "sink":
        return (
          <group>
            {/* Vanity Cabinet */}
            <mesh position={[0, dimensions.height * 0.45, 0]} castShadow receiveShadow>
              <boxGeometry
                args={[dimensions.width, dimensions.height * 0.9, dimensions.length]}
              />
              <meshStandardMaterial color="#0f766e" roughness={0.4} />
            </mesh>
            {/* White Ceramic Countertop */}
            <mesh position={[0, dimensions.height * 0.92, 0]} castShadow>
              <boxGeometry
                args={[dimensions.width * 1.05, 0.06, dimensions.length * 1.05]}
              />
              <meshStandardMaterial color="#ffffff" roughness={0.1} />
            </mesh>
            {/* Chrome Faucet */}
            <mesh position={[0, dimensions.height + 0.1, -dimensions.length * 0.25]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.18, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        );

      case "shower":
        return (
          <group>
            {/* Shower Tray Base */}
            <mesh position={[0, 0.04, 0]} receiveShadow>
              <boxGeometry args={[dimensions.width, 0.08, dimensions.length]} />
              <meshStandardMaterial color="#f1f5f9" roughness={0.2} />
            </mesh>
            {/* Frosted Glass Screen */}
            <mesh position={[-dimensions.width * 0.48, dimensions.height * 0.5, 0]} castShadow>
              <boxGeometry args={[0.03, dimensions.height, dimensions.length]} />
              <meshStandardMaterial
                color="#e0f2fe"
                transparent
                opacity={0.45}
                roughness={0.1}
              />
            </mesh>
            {/* Shower Column & Head */}
            <mesh position={[dimensions.width * 0.4, dimensions.height * 0.55, -dimensions.length * 0.4]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, dimensions.height * 0.9, 12]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
          </group>
        );

      case "grab_bar":
        return (
          <group>
            {/* Stainless steel handrail */}
            <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, dimensions.length, 16]} />
              <meshStandardMaterial
                color="#e2e8f0"
                metalness={0.95}
                roughness={0.1}
              />
            </mesh>
            {/* Wall Flange 1 */}
            <mesh position={[-dimensions.length * 0.48, 0, -0.05]}>
              <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
            {/* Wall Flange 2 */}
            <mesh position={[dimensions.length * 0.48, 0, -0.05]}>
              <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
            </mesh>
          </group>
        );

      case "sofa":
        return (
          <group>
            {/* Seat base */}
            <mesh position={[0, dimensions.height * 0.35, 0]} castShadow receiveShadow>
              <boxGeometry args={[dimensions.width, dimensions.height * 0.5, dimensions.length]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
            </mesh>
            {/* Backrest */}
            <mesh position={[-dimensions.width * 0.35, dimensions.height * 0.75, 0]} castShadow>
              <boxGeometry args={[dimensions.width * 0.3, dimensions.height * 0.7, dimensions.length]} />
              <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
            </mesh>
            {/* Left Armrest */}
            <mesh position={[0, dimensions.height * 0.6, -dimensions.length * 0.46]} castShadow>
              <boxGeometry args={[dimensions.width, dimensions.height * 0.5, dimensions.length * 0.12]} />
              <meshStandardMaterial color="#1e40af" roughness={0.7} />
            </mesh>
            {/* Right Armrest */}
            <mesh position={[0, dimensions.height * 0.6, dimensions.length * 0.46]} castShadow>
              <boxGeometry args={[dimensions.width, dimensions.height * 0.5, dimensions.length * 0.12]} />
              <meshStandardMaterial color="#1e40af" roughness={0.7} />
            </mesh>
          </group>
        );

      default:
        return (
          <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#64748b" roughness={0.5} />
          </mesh>
        );
    }
  };

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
      {renderModel()}

      {/* Selected Bounding Indicator */}
      {isSelected && (
        <mesh position={[0, dimensions.height * 0.5, 0]}>
          <boxGeometry
            args={[
              dimensions.width + 0.1,
              dimensions.height + 0.1,
              dimensions.length + 0.1,
            ]}
          />
          <meshBasicMaterial
            color="#0ea5e9"
            wireframe
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Hazard Warning Outline Ring */}
      {hasHazard && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[
              Math.max(dimensions.width, dimensions.length) * 0.55,
              Math.max(dimensions.width, dimensions.length) * 0.65,
              32,
            ]}
          />
          <meshBasicMaterial
            color={hazardColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  );
};

