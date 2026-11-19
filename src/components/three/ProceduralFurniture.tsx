"use client";

import React from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { SceneObjectState } from "@/types";

interface ObjectModelProps {
  object: SceneObjectState;
  isSelected?: boolean;
  hasHazard?: boolean;
  hazardSeverity?: "LOW" | "MEDIUM" | "HIGH";
  onClick?: (e: any) => void;
}

/**
 * Photorealistic Procedural 3D Geometry Body Renderer
 * Renders physically accurate, beautiful furniture meshes with PBR materials
 * for every room entity (living room, bedroom, bathroom, fixtures).
 */
export const ProceduralModelBody: React.FC<{
  object: SceneObjectState;
  hasHazard?: boolean;
}> = ({ object, hasHazard }) => {
  const { modelType, dimensions } = object;

  switch (modelType) {
    case "sofa": {
      const woodFrame = "#854d0e"; // Natural warm oak / teak
      const fabricColor = object.surfaceColor ?? "#64746d"; // Modern deep slate fabric
      const backFabric = fabricColor;
      const cushionCount = dimensions.width >= 1.8 ? 3 : 2;
      const seatHeight = dimensions.height * 0.44;
      const backrestHeight = dimensions.height * 0.56;
      const armWidth = Math.min(0.14, dimensions.width * 0.08);
      const innerWidth = dimensions.width - armWidth * 2;
      const cushionWidth = innerWidth / cushionCount;

      return (
        <group>
          {/* Solid Wooden Plinth / Base Frame */}
          <mesh position={[0, seatHeight * 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, seatHeight * 0.64, dimensions.length]} />
            <meshStandardMaterial color={woodFrame} roughness={0.45} />
          </mesh>

          {/* Modular Seat Cushions */}
          {Array.from({ length: cushionCount }).map((_, i) => {
            const cx = -innerWidth * 0.5 + cushionWidth * (i + 0.5);
            return (
              <RoundedBox args={[cushionWidth * 0.96, 0.16, dimensions.length * 0.86]} radius={0.045} smoothness={3}
                key={`seat-${i}`}
                position={[cx, seatHeight + 0.07, dimensions.length * 0.04]}
                castShadow
                receiveShadow
              >
                <meshStandardMaterial color={fabricColor} roughness={0.82} />
              </RoundedBox>
            );
          })}

          {/* Backrest Wooden Structure along Rear Wall */}
          <mesh position={[0, seatHeight + backrestHeight * 0.5, -dimensions.length * 0.4]} castShadow>
            <boxGeometry args={[dimensions.width * 0.98, backrestHeight, dimensions.length * 0.2]} />
            <meshStandardMaterial color={woodFrame} roughness={0.45} />
          </mesh>

          {/* Modular Back Cushions */}
          {Array.from({ length: cushionCount }).map((_, i) => {
            const cx = -innerWidth * 0.5 + cushionWidth * (i + 0.5);
            return (
              <RoundedBox args={[cushionWidth * 0.94, backrestHeight * 0.82, 0.15]} radius={0.045} smoothness={3} rotation={[-0.10, 0, 0]}
                key={`back-${i}`}
                position={[cx, seatHeight + backrestHeight * 0.46, -dimensions.length * 0.26]}
                castShadow
              >
                <meshStandardMaterial color={backFabric} roughness={0.85} />
              </RoundedBox>
            );
          })}

          {/* Wooden Left Armrest */}
          <mesh position={[-dimensions.width * 0.5 + armWidth * 0.5, dimensions.height * 0.54, 0]} castShadow>
            <boxGeometry args={[armWidth, dimensions.height * 0.64, dimensions.length * 0.98]} />
            <meshStandardMaterial color={woodFrame} roughness={0.4} />
          </mesh>

          {/* Wooden Right Armrest */}
          <mesh position={[dimensions.width * 0.5 - armWidth * 0.5, dimensions.height * 0.54, 0]} castShadow>
            <boxGeometry args={[armWidth, dimensions.height * 0.64, dimensions.length * 0.98]} />
            <meshStandardMaterial color={woodFrame} roughness={0.4} />
          </mesh>

          {/* Accent Throw Pillows */}
          <mesh position={[-innerWidth * 0.36, seatHeight + 0.18, -dimensions.length * 0.15]} castShadow>
            <boxGeometry args={[0.3, 0.24, 0.12]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
          </mesh>
          <mesh position={[innerWidth * 0.36, seatHeight + 0.18, -dimensions.length * 0.15]} castShadow>
            <boxGeometry args={[0.3, 0.24, 0.12]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
          </mesh>
        </group>
      );
    }

    case "coffee_table":
    case "table": {
      const topThick = 0.04;
      const legThick = 0.055;
      const woodColor = object.surfaceColor ?? "#ac855d"; // Warm natural oak
      const darkWood = "#78350f"; // Rich walnut
      return (
        <group>
          {/* Upper Table Top Surface */}
          <mesh position={[0, dimensions.height - topThick * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, topThick, dimensions.length]} />
            <meshStandardMaterial color={woodColor} roughness={0.38} metalness={0.05} />
          </mesh>

          {/* Lower Storage Shelf (2-Tier Design) */}
          <mesh position={[0, dimensions.height * 0.32, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width * 0.92, 0.025, dimensions.length * 0.88]} />
            <meshStandardMaterial color={darkWood} roughness={0.45} />
          </mesh>

          {/* Integrated Storage Drawer Block */}
          <mesh position={[dimensions.width * 0.25, dimensions.height * 0.24, 0]} castShadow>
            <boxGeometry args={[dimensions.width * 0.38, dimensions.height * 0.38, dimensions.length * 0.82]} />
            <meshStandardMaterial color={woodColor} roughness={0.42} />
          </mesh>
          {/* Drawer Handle */}
          <mesh position={[dimensions.width * 0.25, dimensions.height * 0.24, dimensions.length * 0.42]}>
            <boxGeometry args={[0.1, 0.02, 0.015]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>

          {/* 4 Sturdy Solid Wood Legs */}
          {[
            [-dimensions.width * 0.44, -dimensions.length * 0.42],
            [dimensions.width * 0.44, -dimensions.length * 0.42],
            [-dimensions.width * 0.44, dimensions.length * 0.42],
            [dimensions.width * 0.44, dimensions.length * 0.42],
          ].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, dimensions.height * 0.5, lz]} castShadow receiveShadow>
              <boxGeometry args={[legThick, dimensions.height, legThick]} />
              <meshStandardMaterial color={darkWood} roughness={0.4} />
            </mesh>
          ))}

          {/* Decorative Serving Tray on Top */}
          <mesh position={[-dimensions.width * 0.12, dimensions.height + 0.012, 0]} castShadow>
            <boxGeometry args={[dimensions.width * 0.32, 0.018, dimensions.length * 0.42]} />
            <meshStandardMaterial color="#18181b" roughness={0.5} />
          </mesh>
        </group>
      );
    }

    case "bench":
    case "stool": {
      const woodColor = "#92400e"; // Natural warm oak
      const cushionColor = object.surfaceColor ?? "#64746d"; // Deep slate fabric
      const frameHeight = dimensions.height * 0.64;
      const cushionHeight = dimensions.height * 0.36;
      return (
        <group>
          {/* Wooden Base Frame */}
          <mesh position={[0, frameHeight * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width * 0.96, frameHeight, dimensions.length * 0.92]} />
            <meshStandardMaterial color={woodColor} roughness={0.48} />
          </mesh>
          {/* Open lower cutout for clean architectural bench look */}
          <mesh position={[0, frameHeight * 0.45, 0]}>
            <boxGeometry args={[dimensions.width * 0.78, frameHeight * 0.68, dimensions.length * 0.98]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
          {/* Thick Comfortable Padded Seat Cushion on Top */}
          <mesh position={[0, frameHeight + cushionHeight * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, cushionHeight, dimensions.length]} />
            <meshStandardMaterial color={cushionColor} roughness={0.85} />
          </mesh>
        </group>
      );
    }

    case "rug": {
      const isHazard = object.isLoose || hasHazard;
      return (
        <group position={[0, 0.005, 0]}>
          {/* Main Woven Carpet Body - Sophisticated Slate / Charcoal Grey */}
          <mesh position={[0, 0.01, 0]} receiveShadow>
            <boxGeometry args={[dimensions.width, 0.016, dimensions.length]} />
            <meshStandardMaterial
              color={object.surfaceColor ?? "#868780"}
              roughness={0.92}
              metalness={0.02}
            />
          </mesh>
          {/* Subtle Inner Pattern Inlay */}
          <mesh position={[0, 0.018, 0]} receiveShadow>
            <boxGeometry args={[dimensions.width * 0.92, 0.005, dimensions.length * 0.92]} />
            <meshStandardMaterial color={object.surfaceColor ?? "#97978f"} roughness={0.95} />
          </mesh>
          {/* Fringe Borders on Short Ends */}
          <mesh position={[0, 0.012, dimensions.length * 0.5 + 0.015]} receiveShadow>
            <boxGeometry args={[dimensions.width * 0.96, 0.008, 0.03]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.012, -dimensions.length * 0.5 - 0.015]} receiveShadow>
            <boxGeometry args={[dimensions.width * 0.96, 0.008, 0.03]} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.9} />
          </mesh>

          {/* Safety Fall Hazard: Glowing Perimeter Outline (NO solid blinding red fill) */}
          {isHazard && (
            <group position={[0, 0.024, 0]}>
              <lineSegments>
                <edgesGeometry
                  args={[
                    new THREE.BoxGeometry(
                      dimensions.width + 0.04,
                      0.01,
                      dimensions.length + 0.04
                    ),
                  ]}
                />
                <lineBasicMaterial color="#ef4444" />
              </lineSegments>
              {/* Corner hazard marker pads */}
              {[
                [-dimensions.width * 0.48, -dimensions.length * 0.48],
                [dimensions.width * 0.48, -dimensions.length * 0.48],
                [-dimensions.width * 0.48, dimensions.length * 0.48],
                [dimensions.width * 0.48, dimensions.length * 0.48],
              ].map(([cx, cz], i) => (
                <mesh key={i} position={[cx, 0.002, cz]}>
                  <planeGeometry args={[0.1, 0.1]} />
                  <meshBasicMaterial color="#ef4444" transparent opacity={0.65} />
                </mesh>
              ))}
            </group>
          )}
        </group>
      );
    }

    case "wall_art":
    case "painting": {
      const panelWidth = dimensions.width * 0.28;
      const panelHeight = dimensions.height * 0.94;
      return (
        <group position={[0, 0, 0]}>
          {/* 3 Modern Gallery Canvas Art Panels */}
          {[-dimensions.width * 0.34, 0, dimensions.width * 0.34].map((px, i) => (
            <group key={i} position={[px, 0, 0]}>
              {/* Thin Black Frame */}
              <mesh castShadow>
                <boxGeometry args={[panelWidth, panelHeight, 0.025]} />
                <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.2} />
              </mesh>
              {/* Canvas Inset */}
              <mesh position={[0, 0, 0.014]}>
                <planeGeometry args={[panelWidth * 0.92, panelHeight * 0.9]} />
                <meshStandardMaterial
                  color={i === 1 ? "#fafaf9" : i === 0 ? "#fef08a" : "#cbd5e1"}
                  roughness={0.65}
                />
              </mesh>
              {/* Abstract Graphic Accent */}
              {i === 0 && (
                <mesh position={[0, 0, 0.016]}>
                  <circleGeometry args={[panelWidth * 0.22, 24]} />
                  <meshBasicMaterial color="#eab308" />
                </mesh>
              )}
              {i === 1 && (
                <mesh position={[0, 0, 0.016]}>
                  <planeGeometry args={[panelWidth * 0.32, panelHeight * 0.38]} />
                  <meshBasicMaterial color="#18181b" />
                </mesh>
              )}
              {i === 2 && (
                <mesh position={[0, 0, 0.016]} rotation={[0, 0, Math.PI]}>
                  <coneGeometry args={[panelWidth * 0.24, panelHeight * 0.34, 3]} />
                  <meshBasicMaterial color="#f59e0b" />
                </mesh>
              )}
            </group>
          ))}
        </group>
      );
    }

    case "ceiling_fan":
    case "fan": {
      const bladeLen = dimensions.width * 0.42;
      const bladeW = 0.14;
      return (
        <group position={[0, 0, 0]}>
          {/* Ceiling Canopy */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.06, 16]} />
            <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Downrod */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 12]} />
            <meshStandardMaterial color="#18181b" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Motor Housing */}
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.14, 0.09, 24]} />
            <meshStandardMaterial color="#27272a" metalness={0.6} roughness={0.3} />
          </mesh>
          {/* 5 Aerodynamic Wooden Blades */}
          {Array.from({ length: 5 }).map((_, i) => {
            const angle = (i * Math.PI * 2) / 5;
            return (
              <group key={i} rotation={[0, angle, 0]}>
                <mesh position={[bladeLen * 0.55 + 0.1, 0.01, 0]} rotation={[0.18, 0, 0]} castShadow>
                  <boxGeometry args={[bladeLen, 0.012, bladeW]} />
                  <meshStandardMaterial color="#78350f" roughness={0.4} />
                </mesh>
              </group>
            );
          })}
          {/* Integrated LED Light Fixture Bowl */}
          <mesh position={[0, -0.05, 0]}>
            <sphereGeometry args={[0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.85} roughness={0.1} />
          </mesh>
          <pointLight position={[0, -0.15, 0]} intensity={1.5} distance={5} color="#fffbeb" />
        </group>
      );
    }

    case "air_conditioner":
    case "ac": {
      return (
        <group position={[0, 0, 0]}>
          {/* Main AC Indoor Body */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.05} />
          </mesh>
          {/* Lower Air Vents / Louver */}
          <mesh position={[0, -dimensions.height * 0.32, dimensions.length * 0.48]}>
            <boxGeometry args={[dimensions.width * 0.9, 0.04, 0.02]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
          </mesh>
          {/* LED Status Light */}
          <mesh position={[dimensions.width * 0.38, -dimensions.height * 0.18, dimensions.length * 0.51]}>
            <circleGeometry args={[0.012, 16]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
        </group>
      );
    }

    case "slat_partition":
    case "partition": {
      const span = dimensions.width;
      const count = Math.max(3, Math.round(span / 0.10));
      const pitch = span / count;
      const timber = object.surfaceColor ?? "#ad835c";
      return (
        <group>
          {[0.025, dimensions.height - 0.025].map(y => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <boxGeometry args={[span, 0.05, dimensions.length]} />
              <meshStandardMaterial color={timber} roughness={0.6} />
            </mesh>
          ))}
          {Array.from({ length: count }, (_, i) => (
            <mesh key={i} position={[(i + 0.5) * pitch - span / 2, dimensions.height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[pitch * 0.48, dimensions.height - 0.1, dimensions.length]} />
              <meshStandardMaterial color={timber} roughness={0.6} />
            </mesh>
          ))}
        </group>
      );
    }

    case "curtain": {
      const { width, length, height } = dimensions;
      const folds = Math.max(4, Math.round(width / 0.1));
      const hem = new THREE.Shape();
      // Extrude a continuous pleated cross section from the hem up to the rail.
      const wave = (i: number) => Math.cos(i * Math.PI / 4) * length * 0.40;
      hem.moveTo(-width / 2, wave(0));
      const segments = folds * 8;
      for (let i = 1; i <= segments; i++) hem.lineTo(width * (i / segments - 0.5), wave(i));
      for (let i = segments; i >= 0; i--) hem.lineTo(width * (i / segments - 0.5), wave(i) + 0.008);
      hem.closePath();
      return (
        <group>
          <mesh position={[0, height - 0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.015, 0.015, width, 12]} />
            <meshStandardMaterial color="#645d54" metalness={0.45} roughness={0.4} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <extrudeGeometry args={[hem, {depth: height - 0.03, bevelEnabled: false}]} />
            <meshStandardMaterial color={object.surfaceColor ?? "#dbd5c6"} roughness={0.95} />
          </mesh>
        </group>
      );
    }

    case "chair": {
      const seatH = dimensions.height * 0.52;
      const legThick = 0.04;
      return (
        <group>
          {/* Padded Seat Cushion */}
          <mesh position={[0, seatH, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, 0.08, dimensions.length]} />
            <meshStandardMaterial color="#334155" roughness={0.85} />
          </mesh>
          {/* Wooden Seat Frame */}
          <mesh position={[0, seatH - 0.04, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width * 0.94, 0.04, dimensions.length * 0.94]} />
            <meshStandardMaterial color="#92400e" roughness={0.5} />
          </mesh>
          {/* Backrest curved support and slat */}
          <mesh position={[0, seatH + (dimensions.height - seatH) * 0.5, -dimensions.length * 0.42]} castShadow>
            <boxGeometry args={[dimensions.width * 0.9, dimensions.height - seatH, 0.04]} />
            <meshStandardMaterial color="#92400e" roughness={0.5} />
          </mesh>
          {/* 4 Wooden Tapered Legs */}
          {[
            [-dimensions.width * 0.4, -dimensions.length * 0.4],
            [dimensions.width * 0.4, -dimensions.length * 0.4],
            [-dimensions.width * 0.4, dimensions.length * 0.4],
            [dimensions.width * 0.4, dimensions.length * 0.4],
          ].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, seatH * 0.5 - 0.02, lz]} castShadow receiveShadow>
              <boxGeometry args={[legThick, seatH - 0.04, legThick]} />
              <meshStandardMaterial color="#78350f" roughness={0.45} />
            </mesh>
          ))}
        </group>
      );
    }

    case "desk": {
      const topThick = 0.04;
      return (
        <group>
          {/* Desktop Surface */}
          <mesh position={[0, dimensions.height - topThick * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, topThick, dimensions.length]} />
            <meshStandardMaterial color="#a16207" roughness={0.4} />
          </mesh>
          {/* Left Drawer Pedestal */}
          <mesh position={[-dimensions.width * 0.35, (dimensions.height - topThick) * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width * 0.28, dimensions.height - topThick, dimensions.length * 0.9]} />
            <meshStandardMaterial color="#78350f" roughness={0.5} />
          </mesh>
          {/* Right Legs */}
          {[
            [dimensions.width * 0.44, -dimensions.length * 0.42],
            [dimensions.width * 0.44, dimensions.length * 0.42],
          ].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, (dimensions.height - topThick) * 0.5, lz]} castShadow>
              <boxGeometry args={[0.05, dimensions.height - topThick, 0.05]} />
              <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
        </group>
      );
    }

    case "nightstand": {
      return (
        <group>
          {/* Wooden 2-Drawer Cabinet */}
          <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#92400e" roughness={0.48} />
          </mesh>
          {/* Drawer Handle 1 */}
          <mesh position={[0, dimensions.height * 0.65, dimensions.length * 0.51]}>
            <boxGeometry args={[dimensions.width * 0.3, 0.015, 0.015]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} />
          </mesh>
          {/* Drawer Handle 2 */}
          <mesh position={[0, dimensions.height * 0.28, dimensions.length * 0.51]}>
            <boxGeometry args={[dimensions.width * 0.3, 0.015, 0.015]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.8} />
          </mesh>
          {/* Table Lamp Base */}
          <mesh position={[0, dimensions.height + 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.08, 0.14, 16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.7} roughness={0.2} />
          </mesh>
          {/* Lamp Shade with Warm Glow */}
          <mesh position={[0, dimensions.height + 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.13, 0.13, 16]} />
            <meshStandardMaterial
              color="#fef08a"
              emissive="#fde047"
              emissiveIntensity={0.65}
            />
          </mesh>
        </group>
      );
    }

    case "media_console":
    case "tv": {
      return (
        <group>
          {/* Wooden Low Credenza / Media Console */}
          <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#78350f" roughness={0.4} />
          </mesh>
          {/* Front Panel Inset */}
          <mesh position={[0, dimensions.height * 0.5, dimensions.length * 0.51]}>
            <boxGeometry args={[dimensions.width * 0.94, dimensions.height * 0.8, 0.01]} />
            <meshStandardMaterial color="#451a03" roughness={0.5} />
          </mesh>
          {modelType === "tv" && (
            /* TV Screen mounted on stand */
            <mesh position={[0, dimensions.height + 0.35, 0]} castShadow>
              <boxGeometry args={[dimensions.width * 0.9, 0.55, 0.03]} />
              <meshStandardMaterial color="#09090b" roughness={0.1} metalness={0.9} />
            </mesh>
          )}
        </group>
      );
    }

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

    case "wardrobe":
    case "cabinet":
      return (
        <group>
          <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#5c3d2e" roughness={0.5} />
          </mesh>
          {/* Door seam accent */}
          <mesh position={[0, dimensions.height * 0.5, dimensions.length * 0.51]}>
            <boxGeometry args={[0.01, dimensions.height * 0.95, 0.02]} />
            <meshStandardMaterial color="#1e293b" />
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
          {/* Shower Column */}
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

    case "door":
      return (
        <group position={[0, dimensions.height * 0.5, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#92400e" roughness={0.45} />
          </mesh>
          <mesh position={[dimensions.width * 0.35, 0, 0.04]} castShadow>
            <boxGeometry args={[0.12, 0.03, 0.03]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      );

    case "window":
      return (
        <group position={[0, dimensions.height * 0.5, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[dimensions.width * 0.88, dimensions.height * 0.9]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.35} roughness={0.05} metalness={0.1} />
          </mesh>
        </group>
      );

    case "plant":
    case "potted_plant":
      return (
        <group position={[0, 0, 0]}>
          <mesh position={[0, dimensions.height * 0.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[dimensions.width * 0.42, dimensions.width * 0.34, dimensions.height * 0.5, 24]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
          </mesh>
          <mesh position={[0, dimensions.height * 0.48, 0]}>
            <cylinderGeometry args={[dimensions.width * 0.4, dimensions.width * 0.4, 0.02, 16]} />
            <meshStandardMaterial color="#3f2e21" roughness={0.9} />
          </mesh>
          {Array.from({ length: 6 }).map((_, i) => {
            const ang = (i * Math.PI * 2) / 6;
            return (
              <mesh
                key={i}
                position={[Math.cos(ang) * dimensions.width * 0.2, dimensions.height * 0.72, Math.sin(ang) * dimensions.length * 0.2]}
                rotation={[0.3, ang, 0.2]}
                castShadow
              >
                <sphereGeometry args={[dimensions.width * 0.22, 12, 12]} />
                <meshStandardMaterial color="#15803d" roughness={0.6} />
              </mesh>
            );
          })}
        </group>
      );

    default:
      return (
        <group>
          {/* Architectural minimalist credenza / wooden low accent piece */}
          <mesh position={[0, dimensions.height * 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[dimensions.width, dimensions.height, dimensions.length]} />
            <meshStandardMaterial color="#92400e" roughness={0.48} />
          </mesh>
          <mesh position={[0, dimensions.height * 0.5, dimensions.length * 0.02]}>
            <boxGeometry args={[dimensions.width * 0.94, dimensions.height * 0.85, dimensions.length]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
          </mesh>
        </group>
      );
  }
};

/**
 * Standalone ProceduralFurniture with interactive click & selection overlays
 */
export const ProceduralFurniture: React.FC<ObjectModelProps> = ({
  object,
  isSelected,
  hasHazard,
  hazardSeverity,
  onClick,
}) => {
  const { dimensions } = object;

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
        onClick?.(e);
      }}
    >
      <ProceduralModelBody object={object} hasHazard={hasHazard} />

      {/* Selected Bounding Indicator */}
      {isSelected && (
        <group position={[0, dimensions.height * 0.5, 0]}>
          <mesh>
            <boxGeometry
              args={[
                dimensions.width + 0.06,
                dimensions.height + 0.06,
                dimensions.length + 0.06,
              ]}
            />
            <meshBasicMaterial
              color="#0284c7"
              wireframe
              transparent
              opacity={0.65}
            />
          </mesh>
        </group>
      )}

      {/* Subtle Hazard Danger Floor Perimeter (Fitted to object footprint) */}
      {hasHazard && (
        <group position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh receiveShadow>
            <planeGeometry
              args={[dimensions.width + 0.16, dimensions.length + 0.16]}
            />
            <meshBasicMaterial
              color={hazardColor}
              transparent
              opacity={0.25}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh>
            <ringGeometry
              args={[
                Math.max(dimensions.width, dimensions.length) * 0.5 + 0.06,
                Math.max(dimensions.width, dimensions.length) * 0.5 + 0.1,
                32,
              ]}
            />
            <meshBasicMaterial
              color={hazardColor}
              side={THREE.DoubleSide}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};
