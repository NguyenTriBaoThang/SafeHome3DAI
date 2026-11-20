"use client";
import React, { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

type Dimensions = { width: number; height: number; length: number };

export function ArchitecturalToilet({ dimensions }: { dimensions: Dimensions }) {
  const profile = useMemo(() => [new THREE.Vector2(0.08, 0.18), new THREE.Vector2(0.12, 0.24), new THREE.Vector2(0.17, 0.28), new THREE.Vector2(0.205, 0.36), new THREE.Vector2(0.21, 0.43), new THREE.Vector2(0.19, 0.445), new THREE.Vector2(0.15, 0.43), new THREE.Vector2(0.12, 0.35)], []);
  return <group scale={[dimensions.width / 0.44, dimensions.height / 0.86, dimensions.length / 0.68]}>
    <RoundedBox args={[0.28, 0.19, 0.43]} position={[0, 0.1, -0.035]} radius={0.05} smoothness={5} castShadow receiveShadow><meshStandardMaterial color="#f5f4ef" roughness={0.18} /></RoundedBox>
    <mesh position={[0, 0, 0.08]} scale={[1, 1, 1.26]} castShadow receiveShadow><latheGeometry args={[profile, 40]} /><meshStandardMaterial color="#f9faf5" roughness={0.14} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, 0.454, 0.08]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 1.25, 0.55]} castShadow><torusGeometry args={[0.172, 0.025, 10, 40]} /><meshStandardMaterial color="#fffefa" roughness={0.25} /></mesh>
    <RoundedBox args={[0.35, 0.51, 0.15]} position={[0, 0.59, -0.26]} radius={0.045} smoothness={5} castShadow><meshStandardMaterial color="#fafbf7" roughness={0.16} /></RoundedBox>
    <mesh position={[0.07, 0.853, -0.26]}><cylinderGeometry args={[0.025, 0.025, 0.009, 24]} /><meshStandardMaterial color="#c0c5c1" metalness={0.8} roughness={0.22} /></mesh>
  </group>;
}

export function ArchitecturalVanity({ dimensions }: { dimensions: Dimensions }) {
  return <group scale={[dimensions.width / 1.22, dimensions.height / 1.95, dimensions.length / 0.54]}>
    <RoundedBox args={[1.18, 0.66, 0.5]} position={[0, 0.45, 0]} radius={0.015} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#b69a78" roughness={0.6} /></RoundedBox>
    {[-0.29, 0.29].map((x) => <group key={x}><mesh position={[x, 0.46, 0.254]}><boxGeometry args={[0.57, 0.64, 0.012]} /><meshStandardMaterial color="#cab08e" roughness={0.65} /></mesh><mesh position={[x, 0.6, 0.268]}><boxGeometry args={[0.2, 0.015, 0.017]} /><meshStandardMaterial color="#7b7468" metalness={0.7} roughness={0.25} /></mesh></group>)}
    <RoundedBox args={[1.22, 0.06, 0.54]} position={[0, 0.81, 0]} radius={0.015} smoothness={3} castShadow><meshStandardMaterial color="#f4f3ed" roughness={0.16} /></RoundedBox>
    <RoundedBox args={[0.68, 0.09, 0.35]} position={[0, 0.86, 0.025]} radius={0.04} smoothness={4} castShadow><meshStandardMaterial color="#f7f9f5" roughness={0.12} /></RoundedBox>
    <RoundedBox args={[0.55, 0.015, 0.245]} position={[0, 0.908, 0.025]} radius={0.07} smoothness={4}><meshStandardMaterial color="#c8d3ce" roughness={0.25} /></RoundedBox>
    <mesh position={[0, 0.965, -0.17]} castShadow><cylinderGeometry args={[0.016, 0.019, 0.27, 20]} /><meshStandardMaterial color="#b7c1be" metalness={0.85} roughness={0.17} /></mesh>
    <mesh position={[0, 1.085, -0.11]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.13, 16]} /><meshStandardMaterial color="#b7c1be" metalness={0.85} roughness={0.17} /></mesh>
    <RoundedBox args={[1.08, 0.87, 0.035]} position={[0, 1.515, -0.245]} radius={0.035} smoothness={4}><meshStandardMaterial color="#f9f8ef" emissive="#fff4d9" emissiveIntensity={0.12} /></RoundedBox>
    <RoundedBox args={[1.02, 0.81, 0.016]} position={[0, 1.515, -0.221]} radius={0.025} smoothness={4}><meshStandardMaterial color="#c1cbc4" metalness={0.9} roughness={0.12} /></RoundedBox>
  </group>;
}
