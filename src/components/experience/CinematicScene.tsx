"use client";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { RoomEnvironment } from "@/components/three/RoomEnvironment";
import { ModelRenderer } from "@/components/three/ModelRenderer";
import { WebGLBoundary, WebGLFallback } from "@/components/three/WebGLBoundary";
import { HazardFindingResult, RoomState, SceneObjectState } from "@/types";
import { assessRoom, findingPosition, ViewMode, VisualLighting } from "@/lib/experience/homeExperience";
import { cameraPose, storyPose } from "@/lib/experience/camera";
import { canWalkTo } from "@/lib/experience/navigation";

export interface CinematicSceneProps {
  room: RoomState;
  baseline: RoomState;
  mode: ViewMode;
  chapter: number;
  chapterProgress: number;
  followStory: boolean;
  lighting: VisualLighting;
  quality: "LOW" | "HIGH";
  reducedMotion: boolean;
  showWalls: boolean;
  showPaths: boolean;
  selectedObjectId: string | null;
  selectedFindingKey: string | null;
  focus: [number, number, number] | null;
  resetKey: number;
  comparison: number;
  onSelectObject: (id: string) => void;
  onSelectFinding: (finding: HazardFindingResult) => void;
  onSelectZone: (id: string) => void;
  onReady?: () => void;
  onStats?: (stats: { fps: number; calls: number; triangles: number }) => void;
  intro?: boolean;
}

function RevealRoof({ room, reducedMotion }: { room: RoomState; reducedMotion: boolean }) {
  const roof = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!roof.current) return;
    elapsed.current += Math.min(delta, 0.1);
    const value = reducedMotion ? 1 : Math.min(1, elapsed.current / 1.5);
    roof.current.position.y = room.dimensions.height + value * 1.4;
    (roof.current.material as THREE.MeshStandardMaterial).opacity = 1 - value;
    roof.current.visible = value < 1;
  });
  return <mesh ref={roof} position={[0, room.dimensions.height, 0]}>
    <boxGeometry args={[room.dimensions.width + 0.2, 0.12, room.dimensions.length + 0.2]} />
    <meshStandardMaterial color="#f5f3ed" transparent opacity={1} depthWrite={false} />
  </mesh>;
}

function CameraRig(props: CinematicSceneProps) {
  const { camera, size, gl } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const transition = useRef(true);
  const initial = useRef(true);
  const destination = useRef(cameraPose(props.room, props.mode, props.focus, size.width / size.height));
  const keys = useRef(new Set<string>());
  useEffect(() => {
    destination.current = props.followStory ? storyPose(props.room, props.chapter, props.chapterProgress, props.focus, size.width / size.height)
      : cameraPose(props.room, props.mode, props.focus, size.width / size.height);
    if (initial.current && !props.reducedMotion) camera.position.multiplyScalar(1.16);
    initial.current = false;
    transition.current = true;
  }, [props.room.id, props.mode, props.focus, props.chapter, props.chapterProgress, props.followStory, props.resetKey, size.width, size.height, props.reducedMotion, camera]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (props.mode !== "WALKTHROUGH" || (event.target as HTMLElement)?.closest("input,button,select,textarea,a")) return;
      if ("wasd".includes(event.key.toLowerCase())) { keys.current.add(event.key.toLowerCase()); event.preventDefault(); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const clear = () => keys.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); keys.current.clear(); };
  }, [props.mode]);
  useFrame((_, delta) => {
    const orbit = controls.current;
    if (!orbit) return;
    if (transition.current) {
      const amount = props.reducedMotion ? 1 : 1 - Math.exp(-delta * 4.5);
      const point = new THREE.Vector3(...destination.current.position);
      camera.position.lerp(point, amount);
      orbit.target.lerp(new THREE.Vector3(...destination.current.target), amount);
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.fov = THREE.MathUtils.lerp(perspective.fov, destination.current.fov, amount);
      perspective.updateProjectionMatrix();
      orbit.update();
      if (camera.position.distanceTo(point) < 0.008) transition.current = false;
    } else if (props.mode === "WALKTHROUGH" && keys.current.size) {
      const forward = camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const step = Math.min(delta, 0.05) * 1.25;
      const offset = new THREE.Vector3();
      if (keys.current.has("w")) offset.addScaledVector(forward, step);
      if (keys.current.has("s")) offset.addScaledVector(forward, -step);
      if (keys.current.has("a")) offset.addScaledVector(right, -step);
      if (keys.current.has("d")) offset.addScaledVector(right, step);
      const next = camera.position.clone().add(offset);
      if (canWalkTo(props.room, next.x, next.z)) { camera.position.copy(next); orbit.target.add(offset); orbit.update(); }
    }
    gl.toneMappingExposure = props.lighting === "NIGHT" ? 0.95 : 1.05;
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.09}
    enableZoom={!props.followStory}
    minDistance={props.mode === "WALKTHROUGH" ? 0.2 : 1.2} maxDistance={40}
    maxPolarAngle={Math.PI / 2 - 0.015} enablePan={props.mode !== "WALKTHROUGH"}
    onStart={() => { transition.current = false; }} />;
}

function MovingObject({ object, selected, hazard, reducedMotion, onClick }: {
  object: SceneObjectState; selected: boolean; hazard?: HazardFindingResult; reducedMotion: boolean; onClick: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(...object.position), [object.position]);
  const centered = useMemo(() => ({ ...object, position: [0, 0, 0] as [number, number, number] }), [object]);
  useFrame((_, delta) => {
    group.current?.position.lerp(target, reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 5));
  });
  return <group ref={group} position={object.position}>
    <ModelRenderer object={centered} isSelected={selected} hasHazard={Boolean(hazard)} hazardSeverity={hazard?.severityCategory} onClick={onClick} />
  </group>;
}

function Home({ room, props, baseline = false }: { room: RoomState; props: CinematicSceneProps; baseline?: boolean }) {
  const assessment = useMemo(() => assessRoom(room), [room]);
  const revealRisks = props.mode === "RISK" || (props.chapter >= 2 && props.chapter <= 3);
  return <group>
    {props.intro && !baseline && <RevealRoof room={room} reducedMotion={props.reducedMotion} />}
    <RoomEnvironment room={room} showWalkingZones={props.showPaths} showGrid={false} cutaway={!props.showWalls && props.mode !== "INTERIOR" && props.mode !== "WALKTHROUGH"}
      transparentWalls={!props.showWalls || props.mode === "INTERIOR" || props.mode === "WALKTHROUGH"}
      isNightMode={props.lighting === "NIGHT"} lightingPreset={props.lighting} quality={props.quality} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.135, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} /><shadowMaterial transparent opacity={0.075} />
    </mesh>
    {room.objects.filter((object) => object.isActive !== false).map((object) => <MovingObject key={object.id} object={object}
      selected={!baseline && props.selectedObjectId === object.id}
      hazard={revealRisks ? assessment.findings.find((finding) => finding.targetObjectId === object.id) : undefined}
      reducedMotion={props.reducedMotion} onClick={() => !baseline && props.onSelectObject(object.id)} />)}
    {!baseline && props.mode !== "COMPARE" && room.zones?.map((zone) => <mesh key={zone.id} rotation={[-Math.PI / 2, 0, 0]}
      position={[(zone.bounds.minX + zone.bounds.maxX) / 2, 0.009, (zone.bounds.minZ + zone.bounds.maxZ) / 2]}
      onClick={(event) => { event.stopPropagation(); props.onSelectZone(zone.id); }}>
      <planeGeometry args={[zone.bounds.maxX - zone.bounds.minX, zone.bounds.maxZ - zone.bounds.minZ]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>)}
    {!baseline && revealRisks && props.mode !== "COMPARE" && assessment.findings.map((finding, index) => {
      const key = finding.detectionRuleId + ":" + (finding.targetObjectId || "room");
      return <group key={key} position={findingPosition(finding, room)}>
        <Html center zIndexRange={[20, 0]}>
          <button type="button" className={"experience-hotspot " + (finding.severityCategory === "HIGH" ? "high" : finding.severityCategory === "MEDIUM" ? "medium" : "low")}
            aria-label={"H" + (index + 1) + ": " + finding.title} aria-pressed={props.selectedFindingKey === key}
            onClick={(event) => { event.stopPropagation(); props.onSelectFinding(finding); }}>
            <span>H{index + 1}</span><span className="hotspot-label">{finding.title}</span>
          </button>
        </Html>
      </group>;
    })}
  </group>;
}

function RenderScenes(props: CinematicSceneProps) {
  const { gl, scene, camera, size } = useThree();
  const previousScene = useMemo(() => { const value = new THREE.Scene(); value.background = new THREE.Color("#f0f1eb"); return value; }, []);
  const frames = useRef({ time: 0, count: 0 });
  useEffect(() => { props.onReady?.(); }, []);
  useFrame((_, delta) => {
    if (props.mode === "COMPARE") {
      const split = Math.round(size.width * props.comparison / 100);
      gl.setScissorTest(true);
      gl.setViewport(0, 0, size.width, size.height);
      gl.setScissor(0, 0, split, size.height); gl.render(previousScene, camera);
      gl.setScissor(split, 0, size.width - split, size.height); gl.render(scene, camera);
      gl.setScissorTest(false);
    } else gl.render(scene, camera);
    frames.current.count++; frames.current.time += delta;
    if (frames.current.time >= 2) {
      props.onStats?.({ fps: Math.round(frames.current.count / frames.current.time), calls: gl.info.render.calls, triangles: gl.info.render.triangles });
      frames.current = { time: 0, count: 0 };
    }
  }, 1);
  return <>
    <color attach="background" args={["#f0f1eb"]} />
    <Home room={props.room} props={props} />
    {props.mode === "COMPARE" && createPortal(<Home room={props.baseline} props={props} baseline />, previousScene)}
    <CameraRig {...props} />
  </>;
}

export function CinematicScene(props: CinematicSceneProps) {
  const [epoch, setEpoch] = useState(0);
  const [lost, setLost] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const removeListeners = useRef<(() => void) | null>(null);
  useEffect(() => () => removeListeners.current?.(), []);
  useEffect(() => {
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2") || probe.getContext("webgl");
      setSupported(Boolean(context));
      (context as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { setSupported(false); }
  }, [epoch]);
  return <div className="experience-canvas" style={{ position: "absolute", inset: 0 }} data-testid="experience-viewport">
    {supported === false ? <WebGLFallback retry={() => { setSupported(null); setEpoch((value) => value + 1); }} /> : supported === true &&
    <WebGLBoundary resetKey={epoch} onFailure={() => setLoaded(true)}>
      <Canvas key={epoch} shadows={props.quality === "HIGH"} dpr={props.quality === "LOW" ? 1 : [1, 1.7]}
        camera={{ position: [9.5, 10.5, 12], fov: 38, near: 0.08, far: 150 }}
        gl={{ antialias: props.quality === "HIGH", powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, preserveDrawingBuffer: true }}
        fallback={<WebGLFallback />} onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          const canvas = gl.domElement;
          canvas.dataset.renderer = "ready";
          removeListeners.current?.();
          const lostContext = (event: Event) => { event.preventDefault(); if (canvas.isConnected) setLost(true); };
          const restoredContext = () => { if (!canvas.isConnected) return; removeListeners.current?.(); setLost(false); setLoaded(false); setEpoch((value) => value + 1); };
          canvas.addEventListener("webglcontextlost", lostContext);
          canvas.addEventListener("webglcontextrestored", restoredContext);
          removeListeners.current = () => { canvas.removeEventListener("webglcontextlost", lostContext); canvas.removeEventListener("webglcontextrestored", restoredContext); };
        }}>
        <Suspense fallback={null}>
          <RenderScenes {...props} onReady={() => { setLoaded(true); props.onReady?.(); }} />
        </Suspense>
      </Canvas>
    </WebGLBoundary>}
    {!loaded && !lost && supported !== false && <div className="experience-loading" role="status"><span />Đang chuẩn bị không gian sống…</div>}
    {lost && <div className="experience-loading"><p>Kết nối đồ họa đang khôi phục.</p><button onClick={() => { setLost(false); setLoaded(false); setEpoch((value) => value + 1); }}>Tải lại mô hình</button></div>}
  </div>;
}

