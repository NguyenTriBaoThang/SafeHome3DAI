"use client";

import React, { useMemo, useEffect } from "react";
import { RoundedBox, useTexture } from "@react-three/drei";
import * as THREE from "three";

/** Original parametric bedding: a continuous folded textile surface rather
 * than a rectangular duvet. Geometry is authored in metres with a floor pivot. */
export function ArchitecturalBed({ dimensions }: { dimensions: { width: number; height: number; length: number } }) {
  const maps = useTexture(["/textures/fabrics/rough_linen_diffuse_1k.jpg", "/textures/fabrics/rough_linen_nor_gl_1k.jpg"]);
  const fabric = useMemo(() => maps.map((map) => { const copy = map.clone(); copy.wrapS = copy.wrapT = THREE.RepeatWrapping; copy.repeat.set(2, 3); return copy; }), [maps[0], maps[1]]);
  fabric[0].colorSpace = THREE.SRGBColorSpace;
  const duvet = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1.92, 1.65, 56, 48);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index), z = positions.getZ(index);
      const drape = Math.pow(Math.max(0, Math.abs(x) - 0.79) / 0.17, 1.35) * 0.25;
      const fold = Math.sin(x * 22 + z * 8) * 0.012 + Math.sin(z * 17 + Math.cos(x * 4)) * 0.012;
      positions.setY(index, 0.57 - drape + fold + Math.exp(-Math.pow((z + 0.6) * 12, 2)) * 0.055);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => { duvet.dispose(); fabric.forEach((texture) => texture.dispose()); }, [duvet, fabric]);
  return <group scale={[dimensions.width / 2, dimensions.height, dimensions.length / 2.12]}>
    <RoundedBox args={[1.83, 0.28, 2.02]} position={[0, 0.2, 0]} radius={0.045} smoothness={3} castShadow receiveShadow><meshStandardMaterial color="#89735e" roughness={0.68} /></RoundedBox>
    <RoundedBox args={[2, 0.82, 0.14]} position={[0, 0.59, -0.99]} radius={0.045} smoothness={4} castShadow><meshStandardMaterial color="#c7b9a5" map={fabric[0]} normalMap={fabric[1]} roughness={0.95} /></RoundedBox>
    <RoundedBox args={[1.82, 0.25, 1.96]} position={[0, 0.42, 0]} radius={0.07} smoothness={4} castShadow receiveShadow><meshStandardMaterial color="#f7f4ed" roughness={0.9} /></RoundedBox>
    <mesh geometry={duvet} position={[0, 0, 0.22]} castShadow receiveShadow><meshStandardMaterial color="#e8e2d6" map={fabric[0]} normalMap={fabric[1]} normalScale={new THREE.Vector2(0.18, 0.18)} roughness={0.98} side={THREE.DoubleSide} /></mesh>
    {[-0.47, 0.47].map((x) => <RoundedBox key={x} args={[0.73, 0.2, 0.43]} position={[x, 0.65, -0.7]} rotation={[0.12, x * 0.08, x * 0.04]} radius={0.095} smoothness={5} castShadow><meshStandardMaterial map={fabric[0]} color="#f2eee5" roughness={1} /></RoundedBox>)}
    <RoundedBox args={[1.9, 0.045, 0.42]} position={[0, 0.59, 0.65]} radius={0.02} smoothness={3} castShadow><meshStandardMaterial map={fabric[0]} color="#8e8376" roughness={0.95} /></RoundedBox>
    {[-0.72, 0.72].flatMap((x) => [-0.8, 0.8].map((z) => <mesh key={`${x}-${z}`} position={[x, 0.06, z]} castShadow><cylinderGeometry args={[0.035, 0.025, 0.12, 10]} /><meshStandardMaterial color="#584d43" roughness={0.5} /></mesh>))}
  </group>;
}
