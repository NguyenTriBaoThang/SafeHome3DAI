"use client";

import React from "react";
import * as THREE from "three";
import { RoomState } from "@/types";

interface RoomEnvironmentProps {
  room: RoomState;
  showWalkingZones: boolean;
  showGrid: boolean;
  transparentWalls: boolean;
  isNightMode: boolean;
}

export const RoomEnvironment: React.FC<RoomEnvironmentProps> = ({
  room,
  showWalkingZones,
  showGrid,
  transparentWalls,
  isNightMode,
}) => {
  const { dimensions, floorMaterial, isWet } = room;
  const { width, length, height } = dimensions;
  const halfW = width / 2;
  const halfL = length / 2;

  // Floor color & roughness based on material
  const floorColor =
    floorMaterial === "CERAMIC_TILE"
      ? "#e2e8f0"
      : floorMaterial === "NON_SLIP_VINYL"
      ? "#cbd5e1"
      : "#b48a60"; // Warm wood

  const floorRoughness = isWet ? 0.05 : floorMaterial === "CERAMIC_TILE" ? 0.3 : 0.6;
  const wallOpacity = transparentWalls ? 0.25 : 0.85;

  return (
    <group>
      {/* Lighting setup */}
      {isNightMode ? (
        <>
          <ambientLight intensity={0.15} color="#312e81" />
          <directionalLight
            position={[5, 8, 4]}
            intensity={0.2}
            color="#6366f1"
          />
          {/* Bedside warm night lamp */}
          <pointLight
            position={[-0.6, 1.0, -1.5]}
            intensity={1.2}
            distance={4.5}
            color="#fef08a"
          />
        </>
      ) : (
        <>
          <ambientLight intensity={0.7} color="#ffffff" />
          <directionalLight
            position={[8, 12, 6]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-6}
            shadow-camera-right={6}
            shadow-camera-top={6}
            shadow-camera-bottom={-6}
          />
          <directionalLight
            position={[-6, 8, -4]}
            intensity={0.4}
            color="#93c5fd"
          />
        </>
      )}

      {/* Main Floor Mesh */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={floorRoughness}
          metalness={isWet ? 0.3 : 0.05}
        />
      </mesh>

      {/* Puddle / Wet reflection plane if floor is wet */}
      {isWet && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.005, 0]}
          receiveShadow
        >
          <planeGeometry args={[width * 0.8, length * 0.8]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            roughness={0.02}
            metalness={0.8}
          />
        </mesh>
      )}

      {/* Grid Floor Guides */}
      {showGrid && (
        <gridHelper
          args={[Math.max(width, length) * 1.5, 20, "#94a3b8", "#e2e8f0"]}
          position={[0, 0.002, 0]}
        />
      )}

      {/* Walking Zones Corridor Overlays */}
      {showWalkingZones &&
        room.walkingZones.map((zone) => {
          const dx = zone.endPoint[0] - zone.startPoint[0];
          const dz = zone.endPoint[1] - zone.startPoint[1];
          const distance = Math.hypot(dx, dz);
          const midX = (zone.startPoint[0] + zone.endPoint[0]) / 2;
          const midZ = (zone.startPoint[1] + zone.endPoint[1]) / 2;
          const angle = Math.atan2(dx, dz);

          return (
            <group
              key={zone.id}
              position={[midX, 0.008, midZ]}
              rotation={[-Math.PI / 2, 0, -angle]}
            >
              <planeGeometry args={[zone.width, distance]} />
              <meshBasicMaterial
                color={zone.importance === "CRITICAL" ? "#10b981" : "#06b6d4"}
                transparent
                opacity={0.22}
                side={THREE.DoubleSide}
              />
            </group>
          );
        })}

      {/* Architectural Cutaway Walls */}
      {/* Back Wall (Z = -halfL) */}
      <mesh position={[0, height * 0.5, -halfL]} receiveShadow>
        <boxGeometry args={[width, height, 0.15]} />
        <meshStandardMaterial
          color="#f1f5f9"
          transparent
          opacity={wallOpacity}
          roughness={0.8}
        />
      </mesh>

      {/* Left Wall (X = -halfW) */}
      <mesh position={[-halfW, height * 0.5, 0]} receiveShadow>
        <boxGeometry args={[0.15, height, length]} />
        <meshStandardMaterial
          color="#e2e8f0"
          transparent
          opacity={wallOpacity}
          roughness={0.8}
        />
      </mesh>

      {/* Low Cutaway Front Wall (X = halfW) */}
      <mesh position={[halfW, height * 0.2, 0]} receiveShadow>
        <boxGeometry args={[0.15, height * 0.4, length]} />
        <meshStandardMaterial
          color="#cbd5e1"
          transparent
          opacity={0.4}
          roughness={0.9}
        />
      </mesh>

      {/* Low Cutaway South Wall (Z = halfL) */}
      <mesh position={[0, height * 0.15, halfL]} receiveShadow>
        <boxGeometry args={[width, height * 0.3, 0.15]} />
        <meshStandardMaterial
          color="#cbd5e1"
          transparent
          opacity={0.4}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
};
