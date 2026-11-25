"use client";

import React, { useMemo, useEffect } from "react";
import * as THREE from "three";
import { ContactShadows, useTexture, Environment, Lightformer } from "@react-three/drei";
import { RoomState } from "@/types";
const CutawayContext = React.createContext(false);

interface RoomEnvironmentProps {
  room: RoomState;
  showWalkingZones: boolean;
  showGrid: boolean;
  transparentWalls: boolean;
  isNightMode: boolean;
  lightingPreset?: "MORNING" | "AFTERNOON" | "DAYLIGHT" | "EVENING" | "NIGHT" | "STUDIO";
  quality?: "LOW" | "MEDIUM" | "HIGH";
  sceneLightingIntensitySimulated?: number;
  cutaway?: boolean;
}

/**
 * Texturized PBR Floor for the Bedroom & Walk-in Closet (Light Oak Planks)
 */
function WoodFloorSegment({
  width,
  length,
  position,
}: {
  width: number;
  length: number;
  position: [number, number, number];
}) {
  const loaded = useTexture([
    "/textures/wood/laminate_floor_02_diffuse_1k.jpg",
    "/textures/wood/laminate_floor_02_rough_1k.jpg",
    "/textures/wood/laminate_floor_02_nor_gl_1k.jpg",
  ]);
  const [diffMap, roughMap, norMap] = useMemo(() => loaded.map((texture) => texture.clone()), [loaded[0], loaded[1], loaded[2]]);
  useEffect(() => () => { [diffMap, roughMap, norMap].forEach((texture) => texture.dispose()); }, [diffMap, roughMap, norMap]);
  diffMap.colorSpace = THREE.SRGBColorSpace;

  useMemo(() => {
    [diffMap, roughMap, norMap].forEach((tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(width * 0.8, length * 0.8);
    });
  }, [diffMap, roughMap, norMap, width, length]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
      receiveShadow
    >
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial
        map={diffMap}
        roughnessMap={roughMap}
        normalMap={norMap}
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  );
}

/**
 * Texturized PBR Floor for the Bathroom (Modern Stone / Ceramic Tiles)
 */
function TileFloorSegment({
  width,
  length,
  position,
  isWet,
  paleCeramic = false,
  stone = false,
}: {
  width: number;
  length: number;
  position: [number, number, number];
  isWet?: boolean;
  paleCeramic?: boolean;
  stone?: boolean;
}) {
  const loaded = useTexture([
    "/textures/tiles/floor_tiles_06_diffuse_1k.jpg",
    "/textures/tiles/floor_tiles_06_rough_1k.jpg",
    "/textures/tiles/floor_tiles_06_nor_gl_1k.jpg",
  ]);
  const [diffMap, roughMap, norMap] = useMemo(() => loaded.map((texture) => texture.clone()), [loaded[0], loaded[1], loaded[2]]);
  useEffect(() => () => { [diffMap, roughMap, norMap].forEach((texture) => texture.dispose()); }, [diffMap, roughMap, norMap]);
  diffMap.colorSpace = THREE.SRGBColorSpace;

  useMemo(() => {
    [diffMap, roughMap, norMap].forEach((tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(width * 1.2, length * 1.2);
    });
  }, [diffMap, roughMap, norMap, width, length]);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={position}
        receiveShadow
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial
          map={paleCeramic || stone ? undefined : diffMap}
          color={stone ? "#858b87" : paleCeramic ? "#e6dfd3" : "#ffffff"}
          roughnessMap={roughMap}
          normalMap={norMap}
          roughness={isWet ? 0.08 : 0.25}
          metalness={isWet ? 0.35 : 0.05}
        />
      </mesh>

      {/* Subtle wet gloss puddle reflection if bathroom floor is wet */}
      {isWet && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[position[0], position[1] + 0.003, position[2]]}
          receiveShadow
        >
          <planeGeometry args={[width * 0.85, length * 0.85]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            roughness={0.02}
            metalness={0.9}
          />
        </mesh>
      )}
    </group>
  );
}

/**
 * Clean architectural wall segment with smooth top cap and skirting board
 */
function CutawayWall({
  extents,
  position,
  opacity = 1.0,
  isTiled = false,
  showCap = true,
}: {
  extents: [number, number, number]; // [width, height, depth]
  position: [number, number, number];
  opacity?: number;
  isTiled?: boolean;
  showCap?: boolean;
}) {
  const cutaway = React.useContext(CutawayContext);
  const [w, originalHeight, d] = extents;
  const shortened = cutaway && d > w && position[0] > -1 && originalHeight > 1.5;
  const h = shortened ? 0.72 : originalHeight;
  const displayPosition: [number, number, number] = shortened ? [position[0], h / 2, position[2]] : position;
  if (cutaway && d > w && position[1] > 2 && originalHeight < 0.7) return null;
  const wallColor = isTiled ? "#f1f5f9" : "#fafaf9"; // Warm matte plaster
  const capColor = "#ffffff";

  return (
    <group position={displayPosition}>
      {/* Wall Body */}
      <mesh receiveShadow castShadow position={[0, 0, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={wallColor}
          roughness={0.85}
          metalness={0.02}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Finished Smooth Wall Cap (Top Surface) */}
      {showCap && (
        <mesh position={[0, h * 0.5 + 0.006, 0]} receiveShadow>
          <boxGeometry args={[w + 0.01, 0.012, d + 0.01]} />
          <meshStandardMaterial color={capColor} roughness={0.4} />
        </mesh>
      )}

      {/* Skirting Board (Phào chân tường) */}
      {h > 1.0 && (
        <mesh position={[0, -h * 0.5 + 0.04, 0]}>
          <boxGeometry args={[w, 0.08, d + 0.015]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.5} />
        </mesh>
      )}
    </group>
  );
}

export const RoomEnvironment: React.FC<RoomEnvironmentProps> = ({
  room,
  showWalkingZones,
  showGrid,
  transparentWalls,
  isNightMode,
  lightingPreset = "MORNING",
  quality = "HIGH",
  sceneLightingIntensitySimulated,
  cutaway = false,
}) => {
  const isDollhouse =
    room.layoutType === "DOLLHOUSE_MULTI_ZONE" ||
    room.id === "room-photoreal-dollhouse-01";
  const { dimensions, floorMaterial, isWet } = room;
  const { width, length, height } = dimensions;

  const wallOpacity = cutaway ? 1 : transparentWalls ? 0.28 : 1.0;
  const activeLight = isNightMode ? "NIGHT" : lightingPreset === "DAYLIGHT" ? "AFTERNOON" : lightingPreset;
  const shadowSize = quality === "LOW" ? 512 : quality === "MEDIUM" ? 768 : 1024;
  const simScale = sceneLightingIntensitySimulated ?? (activeLight === "NIGHT" ? 0.35 : 1.0);
  const shadowsEnabled = quality !== "LOW";

  return (
    <CutawayContext.Provider value={cutaway}><group>
      {/* --- ARCHITECTURAL LIGHTING SYSTEM --- */}
      {quality === "HIGH" && <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} color="#fff6e9" scale={[10, 8, 1]} position={[0, 7, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#f1f6ff" scale={[10, 5, 1]} position={[-7, 3, -4]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#ffefe0" scale={[7, 4, 1]} position={[6, 3, 5]} rotation={[0, -Math.PI / 2, 0]} />
      </Environment>}
      {activeLight === "NIGHT" ? (
        <>
          <ambientLight intensity={0.12 * (simScale / 0.35)} color="#1e1b4b" />
          <directionalLight
            position={[5, 8, 4]}
            intensity={0.25 * (simScale / 0.35)}
            color="#6366f1"
          />
          {/* Bedside Warm Night Lamps */}
          <pointLight
            position={[-2.95, 0.8, -1.65]}
            intensity={1.8}
            distance={4.5}
            color="#fef08a"
            castShadow={shadowsEnabled}
          />
          <pointLight
            position={[-2.95, 0.8, 0.85]}
            intensity={1.8}
            distance={4.5}
            color="#fef08a"
            castShadow={shadowsEnabled}
          />
          {/* Bathroom Soft Vanity Light */}
          <pointLight
            position={[3.35, 1.8, -0.35]}
            intensity={1.4}
            distance={5.0}
            color="#fde047"
          />
        </>
      ) : activeLight === "MORNING" || activeLight === "EVENING" ? (
        <>
          {/* Warm Golden Morning Sunlight streaming from the rear window */}
          <ambientLight intensity={0.65 * simScale} color="#fdfbf7" />
          <directionalLight
            position={[-6, 13, -8]}
            intensity={(activeLight === "EVENING" ? 1.1 : 1.85) * simScale}
            color={activeLight === "EVENING" ? "#ffcf99" : "#fff8e7"}
            castShadow={shadowsEnabled}
            shadow-mapSize={[shadowSize, shadowSize]}
            shadow-camera-left={-8}
            shadow-camera-right={8}
            shadow-camera-top={8}
            shadow-camera-bottom={-8}
            shadow-bias={-0.0001}
          />
          {/* Soft Sky Blue Bounce Light from Front-Right */}
          <directionalLight
            position={[8, 10, 6]}
            intensity={0.45 * simScale}
            color="#e0f2fe"
          />
          {/* Secondary Fill */}
          <hemisphereLight
            args={["#fff8f0", "#94a3b8", 0.5 * simScale]}
            position={[0, 10, 0]}
          />
        </>
      ) : activeLight === "AFTERNOON" ? (
        <>
          <ambientLight intensity={0.75 * simScale} color="#ffffff" />
          <directionalLight
            position={[3, 15, 2]}
            intensity={1.6 * simScale}
            color="#ffffff"
            castShadow={shadowsEnabled}
            shadow-mapSize={[shadowSize, shadowSize]}
            shadow-camera-left={-7}
            shadow-camera-right={7}
            shadow-camera-top={7}
            shadow-camera-bottom={-7}
          />
          <directionalLight
            position={[-6, 8, -5]}
            intensity={0.4 * simScale}
            color="#bfdbfe"
          />
        </>
      ) : (
        /* Neutral Studio Architectural Viz Lighting */
        <>
          <ambientLight intensity={0.8 * simScale} color="#ffffff" />
          <directionalLight
            position={[8, 14, 8]}
            intensity={1.2 * simScale}
            color="#ffffff"
            castShadow={shadowsEnabled}
            shadow-mapSize={[shadowSize, shadowSize]}
          />
          <directionalLight
            position={[-8, 10, -6]}
            intensity={0.6 * simScale}
            color="#e2e8f0"
          />
        </>
      )}

      {/* --- CONTACT SHADOWS ON FLOOR FOR GROUNDING --- */}
      {quality === "HIGH" && <ContactShadows
        key={`${lightingPreset}-${room.objects.map((object) => object.position.join(",")).join(";")}`}
        frames={1}
        position={[0, 0.001, 0]}
        opacity={0.45}
        scale={14}
        blur={1.8}
        far={3.5}
        resolution={512}
        color="#0f172a"
      />}

      {/* --- ARCHITECTURAL PODIUM / BASE SLAB --- */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[width + 0.3, 0.12, length + 0.3]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
      </mesh>

      {/* --- MULTI-ZONE DOLLHOUSE ARCHITECTURE --- */}
      {isDollhouse ? (
        <group>
          {/* Floor Zone A: Bedroom (X: -3.8 to -0.6, width = 3.2m, length = 5.2m, centered at X: -2.2, Z: -0.2) */}
          <WoodFloorSegment
            width={3.2}
            length={5.2}
            position={[-2.2, 0.002, -0.2]}
          />

          {/* Floor Zone B: Walk-in Closet & Corridor (X: -0.6 to 1.3, width = 1.9m, length = 5.2m, centered at X: 0.35, Z: -0.2) */}
          <WoodFloorSegment
            width={1.9}
            length={5.2}
            position={[0.35, 0.002, -0.2]}
          />

          {/* Floor Zone C: Bathroom (X: 1.3 to 3.7, width = 2.4m, length = 5.2m, centered at X: 2.5, Z: -0.2) */}
          <TileFloorSegment
            width={2.4}
            length={5.2}
            position={[2.5, 0.002, -0.2]}
            isWet={isWet}
            stone
          />

          {/* Floor Threshold Strip between Corridor and Bathroom (at X = 1.3) */}
          <mesh position={[1.3, 0.004, -0.2]} receiveShadow>
            <boxGeometry args={[0.04, 0.008, 5.2]} />
            <meshStandardMaterial
              color="#cbd5e1"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>

          {/* --- WALLS WITH ARCHITECTURAL CUTAWAY --- */}
          {/* 1. Tall Rear Wall (North, Z = -2.8, full height 2.7m) */}
          {/* Bedroom window wall segment (with window cutout) */}
          <CutawayWall
            extents={[1.4, 2.7, 0.16]}
            position={[-3.1, 1.35, -2.8]}
            opacity={wallOpacity}
          />
          <CutawayWall
            extents={[0.9, 2.7, 0.16]}
            position={[-1.0, 1.35, -2.8]}
            opacity={wallOpacity}
          />
          {/* Wall header above window */}
          <CutawayWall
            extents={[1.8, 0.45, 0.16]}
            position={[-2.05, 2.475, -2.8]}
            opacity={wallOpacity}
          />
          {/* Wall sill below window */}
          <CutawayWall
            extents={[1.8, 0.45, 0.16]}
            position={[-2.05, 0.225, -2.8]}
            opacity={wallOpacity}
          />

          {/* Walk-in Closet rear wall segment */}
          <CutawayWall
            extents={[1.9, 2.7, 0.16]}
            position={[0.35, 1.35, -2.8]}
            opacity={wallOpacity}
          />

          {/* Bathroom rear wall segment (Tiled) */}
          <CutawayWall
            extents={[2.4, 2.7, 0.16]}
            position={[2.5, 1.35, -2.8]}
            opacity={wallOpacity}
            isTiled
          />

          {/* 2. Tall Left Exterior Wall (West, X = -3.8, full height 2.7m) */}
          <CutawayWall
            extents={[0.16, 2.7, 5.2]}
            position={[-3.8, 1.35, -0.2]}
            opacity={wallOpacity}
          />

          {/* 3. Interior Partition Wall between Bedroom and Walk-in Closet (at X = -0.6) */}
          {/* Rear section (behind closet) */}
          <CutawayWall
            extents={[0.14, 2.7, 2.4]}
            position={[-0.6, 1.35, -1.6]}
            opacity={wallOpacity}
          />
          {/* Doorway Header above passage */}
          <CutawayWall
            extents={[0.14, 0.5, 1.0]}
            position={[-0.6, 2.45, 0.1]}
            opacity={wallOpacity}
          />
          {/* Front cutaway section (lowered to 0.65m for dollhouse visibility) */}
          <CutawayWall
            extents={[0.14, 0.65, 1.8]}
            position={[-0.6, 0.325, 1.5]}
            opacity={wallOpacity}
          />

          {/* 4. Half-Height Partition Wall between Walk-in Closet and Walkway (at Z = 0.6) */}
          {/* Exact half-height wall from the reference image separating clothes from hallway */}
          <CutawayWall
            extents={[1.5, 1.05, 0.14]}
            position={[0.15, 0.525, 0.6]}
            opacity={wallOpacity}
          />

          {/* 5. Interior Partition Wall between Walkway and Bathroom (at X = 1.3) */}
          {/* Rear section (separating shower from closet) */}
          <CutawayWall
            extents={[0.14, 2.7, 3.2]}
            position={[1.3, 1.35, -1.2]}
            opacity={wallOpacity}
            isTiled
          />
          {/* Doorway Header above bathroom door */}
          <CutawayWall
            extents={[0.14, 0.5, 0.9]}
            position={[1.3, 2.45, 0.85]}
            opacity={wallOpacity}
          />
          {/* Front section beside toilet (cutaway to 0.65m) */}
          <CutawayWall
            extents={[0.14, 0.65, 1.1]}
            position={[1.3, 0.325, 1.85]}
            opacity={wallOpacity}
          />

          {/* 6. Tall Right Exterior Wall (East, X = 3.7, full height 2.7m) */}
          <CutawayWall
            extents={[0.16, 2.7, 5.2]}
            position={[3.7, 1.35, -0.2]}
            opacity={wallOpacity}
            isTiled
          />

          {/* 7. Low Cutaway South Front Wall (Z = 2.4, cut down to 0.65m with white caps) */}
          {/* Front Bedroom segment */}
          <CutawayWall
            extents={[3.2, 0.65, 0.16]}
            position={[-2.2, 0.325, 2.4]}
            opacity={wallOpacity}
          />
          {/* Front Corridor segment */}
          <CutawayWall
            extents={[1.9, 0.65, 0.16]}
            position={[0.35, 0.325, 2.4]}
            opacity={wallOpacity}
          />
          {/* Front Bathroom segment */}
          <CutawayWall
            extents={[2.4, 0.65, 0.16]}
            position={[2.5, 0.325, 2.4]}
            opacity={wallOpacity}
          />
        </group>
      ) : (
        /* Standard Single Room Mode (Fully Upgraded with PBR Textures & Architectural Skirting) */
        <group>
          {floorMaterial === "CERAMIC_TILE" || floorMaterial === "NON_SLIP_VINYL" ? (
            <TileFloorSegment
              width={width}
              length={length}
              position={[0, 0.002, 0]}
              isWet={isWet}
              paleCeramic={floorMaterial === "CERAMIC_TILE"}
            />
          ) : (
            <WoodFloorSegment
              width={width}
              length={length}
              position={[0, 0.002, 0]}
            />
          )}

          {/* Architectural Cutaway Walls with Skirting and Caps */}
          {/* 1. North / Rear Main Wall (Full Height - Solid Backdrop for Furniture & Art) */}
          <CutawayWall
            extents={[width, height, 0.16]}
            position={[0, height * 0.5, -length / 2]}
            opacity={transparentWalls ? 0.9 : 1.0}
            isTiled={floorMaterial === "CERAMIC_TILE"}
          />

          {/* 2. West / Left Wall (Full Height - Side Backdrop for Bench & Divider) */}
          <CutawayWall
            extents={[0.16, height, length]}
            position={[-width / 2, height * 0.5, 0]}
            opacity={transparentWalls ? 0.82 : 1.0}
            isTiled={floorMaterial === "CERAMIC_TILE"}
          />

          {/* 3. East / Right Wall (Cut down to 0.75m for Dollhouse perspective visibility) */}
          <CutawayWall
            extents={[0.16, Math.min(height * 0.35, 0.85), length]}
            position={[width / 2, Math.min(height * 0.35, 0.85) * 0.5, 0]}
            opacity={Math.min(wallOpacity, 0.55)}
            isTiled={floorMaterial === "CERAMIC_TILE"}
          />

          {/* 4. South / Front Wall (Cut down to 0.5m so camera can look into the room cleanly) */}
          <CutawayWall
            extents={[width, Math.min(height * 0.22, 0.55), 0.16]}
            position={[0, Math.min(height * 0.22, 0.55) * 0.5, length / 2]}
            opacity={Math.min(wallOpacity, 0.4)}
            isTiled={floorMaterial === "CERAMIC_TILE"}
          />
        </group>
      )}

      {/* Grid Floor Guides if enabled */}
      {showGrid && (
        <gridHelper
          args={[Math.max(width, length) * 1.5, 24, "#0284c7", "#94a3b8"]}
          position={[0, 0.008, 0]}
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
            <mesh
              key={zone.id}
              position={[midX, 0.012, midZ]}
              rotation={[-Math.PI / 2, 0, -angle]}
            >
              <planeGeometry args={[zone.width, distance]} />
              <meshBasicMaterial
                color={zone.importance === "CRITICAL" ? "#10b981" : "#06b6d4"}
                transparent
                opacity={0.25}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })}
    </group></CutawayContext.Provider>
  );
};
