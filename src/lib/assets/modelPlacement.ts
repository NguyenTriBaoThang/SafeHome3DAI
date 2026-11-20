import * as THREE from "three";

/** Normalize the measured mesh bounds, including nested node transforms, into
 * metre-sized, bottom-centred geometry. Instance transforms are applied later. */
export function normalizeModel(source: THREE.Object3D, dimensions: { width: number; height: number; length: number }) {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source, true);
  const size = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || [size.x, size.y, size.z].some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Asset has invalid bounds");
  if (Object.values(dimensions).some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Invalid physical dimensions");
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = new THREE.Vector3(dimensions.width / size.x, dimensions.height / size.y, dimensions.length / size.z);
  const normalized = new THREE.Group();
  normalized.add(source);
  normalized.scale.copy(scale);
  normalized.position.set(-center.x * scale.x, -bounds.min.y * scale.y, -center.z * scale.z);
  const result = new THREE.Group();
  result.add(normalized);
  result.updateMatrixWorld(true);
  return result;
}
