"use client";

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { Camera, Object3D, OrthographicCamera, PerspectiveCamera, Vector3, type Group } from "three";

const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();

export type CalculatePosition = (
  el: Object3D,
  camera: Camera,
  size: { width: number; height: number }
) => [number, number];

export interface SafeHtmlProps extends Omit<ThreeElements["group"], "ref"> {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  prepend?: boolean;
  center?: boolean;
  fullscreen?: boolean;
  eps?: number;
  portal?: React.RefObject<HTMLElement | null>;
  distanceFactor?: number;
  zIndexRange?: [number, number];
  calculatePosition?: CalculatePosition;
  as?: keyof HTMLElementTagNameMap;
  wrapperClass?: string;
}

function defaultCalculatePosition(
  el: Object3D,
  camera: Camera,
  size: { width: number; height: number }
): [number, number] {
  const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
  objectPos.project(camera);
  const widthHalf = size.width / 2;
  const heightHalf = size.height / 2;
  return [objectPos.x * widthHalf + widthHalf, -(objectPos.y * heightHalf) + heightHalf];
}

function isObjectBehindCamera(el: Object3D, camera: Camera): boolean {
  const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
  const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
  const deltaCamObj = objectPos.sub(cameraPos);
  const camDir = camera.getWorldDirection(v3);
  return deltaCamObj.angleTo(camDir) > Math.PI / 2;
}

function objectScale(el: Object3D, camera: Camera): number {
  if (camera instanceof OrthographicCamera) {
    return camera.zoom;
  }
  if (camera instanceof PerspectiveCamera) {
    const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
    const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
    const vFOV = (camera.fov * Math.PI) / 180;
    const dist = objectPos.distanceTo(cameraPos);
    const scaleFOV = 2 * Math.tan(vFOV / 2) * dist;
    return scaleFOV > 0 ? 1 / scaleFOV : 1;
  }
  return 1;
}

function objectZIndex(
  el: Object3D,
  camera: Camera,
  zIndexRange: [number, number]
): number | undefined {
  if (camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera) {
    const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
    const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
    const dist = objectPos.distanceTo(cameraPos);
    const A = (zIndexRange[1] - zIndexRange[0]) / (camera.far - camera.near);
    const B = zIndexRange[1] - A * camera.far;
    return Math.round(A * dist + B);
  }
  return undefined;
}

function applyOverlayLayout(
  groupEl: Group,
  domEl: HTMLElement,
  camera: Camera,
  size: { width: number; height: number },
  distanceFactor: number | undefined,
  zIndexRange: [number, number],
  vec: [number, number]
): boolean {
  const isVisible = !isObjectBehindCamera(groupEl, camera);
  domEl.style.display = isVisible ? "block" : "none";
  const zIndex = objectZIndex(groupEl, camera, zIndexRange);
  if (zIndex !== undefined) domEl.style.zIndex = `${zIndex}`;
  const scale = distanceFactor === undefined ? 1 : objectScale(groupEl, camera) * distanceFactor;
  domEl.style.transform = `translate3d(${vec[0]}px,${vec[1]}px,0) scale(${scale})`;
  return isVisible;
}

/**
 * React 19-safe drop-in replacement for `@react-three/drei`'s `<Html>`.
 * Defers `ReactDOM.Root.unmount()` out of React's commit/insertion-effect cleanup
 * so unmounting a Canvas or 3D child never triggers synchronous root unmount errors.
 */
export const Html = React.forwardRef<HTMLDivElement, SafeHtmlProps>(function SafeHtml(
  {
    children,
    eps = 0.001,
    style,
    className,
    prepend = false,
    center = false,
    fullscreen = false,
    portal,
    distanceFactor,
    zIndexRange = [16777271, 0],
    calculatePosition = defaultCalculatePosition,
    as = "div",
    wrapperClass,
    ...props
  },
  ref
) {
  const { gl, camera, scene, size, events } = useThree();
  const groupRef = React.useRef<Group>(null);
  const elRef = React.useRef<HTMLElement | null>(null);
  const rootRef = React.useRef<ReactDOM.Root | null>(null);
  const oldZoom = React.useRef(0);
  const oldPosition = React.useRef<[number, number]>([0, 0]);
  const oldSize = React.useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const visibleRef = React.useRef(true);

  const target =
    portal?.current || (events.connected as HTMLElement | undefined) || (gl.domElement.parentNode as HTMLElement | null);

  const cameraRef = React.useRef(camera);
  cameraRef.current = camera;
  const sceneRef = React.useRef(scene);
  sceneRef.current = scene;
  const sizeRef = React.useRef(size);
  sizeRef.current = size;
  const wrapperClassRef = React.useRef(wrapperClass);
  wrapperClassRef.current = wrapperClass;
  const calculatePositionRef = React.useRef(calculatePosition);
  calculatePositionRef.current = calculatePosition;
  const distanceFactorRef = React.useRef(distanceFactor);
  distanceFactorRef.current = distanceFactor;
  const zIndexRangeRef = React.useRef(zIndexRange);
  zIndexRangeRef.current = zIndexRange;

  React.useLayoutEffect(() => {
    const el = document.createElement(as);
    el.style.position = "absolute";
    el.style.top = "0";
    el.style.left = "0";
    el.style.transformOrigin = "0 0";
    if (wrapperClassRef.current) el.className = wrapperClassRef.current;

    const currentRoot = ReactDOM.createRoot(el);
    elRef.current = el;
    rootRef.current = currentRoot;

    if (groupRef.current) {
      sceneRef.current.updateMatrixWorld();
      const vec = calculatePositionRef.current(groupRef.current, cameraRef.current, sizeRef.current);
      oldPosition.current = vec;
      oldZoom.current = cameraRef.current.zoom;
      oldSize.current = { width: sizeRef.current.width, height: sizeRef.current.height };
      visibleRef.current = applyOverlayLayout(
        groupRef.current,
        el,
        cameraRef.current,
        sizeRef.current,
        distanceFactorRef.current,
        zIndexRangeRef.current,
        vec
      );
    }

    return () => {
      if (elRef.current === el) elRef.current = null;
      if (rootRef.current === currentRoot) rootRef.current = null;
      el.remove();
      // React 19 forbids synchronous root.unmount() inside RenderContext/CommitContext.
      setTimeout(() => {
        currentRoot.unmount();
      }, 0);
    };
  }, [as]);

  React.useLayoutEffect(() => {
    const el = elRef.current;
    if (!el || !target) return;
    if (prepend) target.prepend(el);
    else target.appendChild(el);
  }, [target, prepend]);

  React.useLayoutEffect(() => {
    if (elRef.current && wrapperClass !== undefined) {
      elRef.current.className = wrapperClass;
    }
  }, [wrapperClass]);

  const styles = React.useMemo<React.CSSProperties>(
    () => ({
      position: "absolute",
      transform: center ? "translate3d(-50%,-50%,0)" : "none",
      ...(fullscreen && {
        top: -size.height / 2,
        left: -size.width / 2,
        width: size.width,
        height: size.height,
      }),
      ...style,
    }),
    [style, center, fullscreen, size]
  );

  React.useLayoutEffect(() => {
    rootRef.current?.render(
      <div ref={ref} style={styles} className={className}>
        {children}
      </div>
    );
  });

  useFrame(() => {
    const groupEl = groupRef.current;
    const domEl = elRef.current;
    if (!groupEl || !domEl) return;

    camera.updateMatrixWorld();
    groupEl.updateWorldMatrix(true, false);
    const vec = calculatePosition(groupEl, camera, size);

    if (
      Math.abs(oldZoom.current - camera.zoom) > eps ||
      Math.abs(oldPosition.current[0] - vec[0]) > eps ||
      Math.abs(oldPosition.current[1] - vec[1]) > eps ||
      oldSize.current.width !== size.width ||
      oldSize.current.height !== size.height
    ) {
      visibleRef.current = applyOverlayLayout(
        groupEl,
        domEl,
        camera,
        size,
        distanceFactor,
        zIndexRange,
        vec
      );
      oldPosition.current = vec;
      oldZoom.current = camera.zoom;
      oldSize.current = { width: size.width, height: size.height };
    }
  });

  return <group {...props} ref={groupRef} />;
});
