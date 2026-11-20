import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { normalizeModel } from "@/lib/assets/modelPlacement";
import { ASSET_REGISTRY, ASSET_PHYSICAL_SPECS } from "@/data/assetRegistry";

describe("Physical GLB placement", () => {
  it("fits nested transformed meshes to metre dimensions and grounds the measured support point", () => {
    const source = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(10, 20, 30));
    mesh.position.set(12, -7, 9); mesh.rotation.set(0.3, 0.8, 0.1); mesh.scale.set(2, 0.5, 1.5);
    const nested = new THREE.Group(); nested.rotation.y = 0.5; nested.add(mesh); source.add(nested);
    const model = normalizeModel(source, { width: 1.2, height: 0.8, length: 1.8 });
    const box = new THREE.Box3().setFromObject(model, true);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(0, 5);
    const size = box.getSize(new THREE.Vector3());
    expect(size.x).toBeCloseTo(1.2, 5); expect(size.y).toBeCloseTo(0.8, 5); expect(size.z).toBeCloseTo(1.8, 5);
  });
  it("preserves a wall fixture's explicit mounting elevation after model normalization", () => {
    const source = new THREE.Group(); source.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
    const instance = new THREE.Group(); instance.add(normalizeModel(source, { width: 0.6, height: 0.1, length: 0.1 }));
    instance.rotation.y = Math.PI / 2; instance.position.set(2, 0.85, 0);
    const box = new THREE.Box3().setFromObject(instance);
    expect(box.min.y).toBeCloseTo(0.85, 5);
    expect(box.getSize(new THREE.Vector3()).z).toBeCloseTo(0.6, 5);
  });
  it("rejects zero-sized or invalid assets instead of creating infinite transforms", () => {
    expect(() => normalizeModel(new THREE.Group(), { width: 1, height: 1, length: 1 })).toThrow();
  });
  it("ships loadable GLBs and does not advertise nonexistent LOD variants", () => {
    for (const asset of Object.values(ASSET_REGISTRY)) {
      const file = path.join(process.cwd(), "public", asset.glbPath);
      expect(existsSync(file), asset.glbPath).toBe(true);
      const header = readFileSync(file);
      expect(header.subarray(0, 4).toString()).toBe("glTF");
      expect(header.readUInt32LE(8)).toBe(header.length);
      expect(ASSET_PHYSICAL_SPECS[asset.id].unit).toBe("m");
      expect(asset.lodAvailable).toBe(false);
      expect(ASSET_PHYSICAL_SPECS[asset.id].lodUrls).toHaveLength(0);
    }
  });
  it("parses every shipped GLB and grounds its real transformed mesh bounds", async () => {
    const loader = new GLTFLoader();
    // Geometry validation runs in Node: skip browser image decoding while
    // parsing the actual buffers, nodes and scene transforms from every GLB.
    loader.register(() => ({ name: "HEADLESS_GEOMETRY", loadMaterial: async () => new THREE.MeshStandardMaterial() }));
    for (const asset of Object.values(ASSET_REGISTRY)) {
      const data = readFileSync(path.join(process.cwd(), "public", asset.glbPath));
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
      const gltf = await loader.parseAsync(buffer, "");
      const normalized = normalizeModel(gltf.scene, asset.nominalDimensions);
      const bounds = new THREE.Box3().setFromObject(normalized, true);
      expect(bounds.min.y, asset.id).toBeCloseTo(0, 5);
      const size = bounds.getSize(new THREE.Vector3());
      expect(size.x, asset.id).toBeCloseTo(asset.nominalDimensions.width, 5);
      expect(size.y, asset.id).toBeCloseTo(asset.nominalDimensions.height, 5);
      expect(size.z, asset.id).toBeCloseTo(asset.nominalDimensions.length, 5);
      normalized.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    }
  });
});
