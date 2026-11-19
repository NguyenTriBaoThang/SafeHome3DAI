# SafeHome 3D AI — Realistic AI Room Reconstruction & Photorealistic Digital Twin
## Architectural Plan, Pipeline Design, Asset Registry & Implementation Roadmap

**Document Status:** Approved Architecture Plan  
**Target Module:** Realistic AI Room Scanner & Photorealistic 3D Spatial Reconstruction  
**Integration:** Next.js 14 App Router, Three.js / React Three Fiber, Prisma ORM, Deterministic Clinical Risk Engine  
**Date:** November 2026  

---

## 1. Executive Summary & Core Objectives

The goal of this architectural milestone is to implement a production-grade, end-to-end **AI Room Scanner & Photorealistic 3D Reconstruction** pipeline for **SafeHome 3D AI**.

Elderly fall prevention requires precise environmental awareness. Rather than presenting generic or primitive geometric boxes, the system enables users to upload photos or scanning videos of real bedrooms and bathrooms, detect indoor entities with high accuracy, project them into metric 3D coordinates, match them with realistic GLB models (with natural wood, linen, ceramic, metal, and glass materials), allow interactive human verification/editing, and seamlessly feed into the deterministic WHO/CDC fall risk engine.

---

## 2. Current State Audit & Reusability Matrix

### 2.1. Reusable Components (Keep & Extend)
1. **Clinical Risk Engine (`src/lib/risk/`)**:
   - 8 deterministic rules (WHO 2021 & CDC STEADI) in `ruleEngine.ts`.
   - Priority policy, explanation engine, and score calculation.
   - 85/85 Vitest test cases passing. **Must not be broken or altered.**
2. **Security & Input Validation (`src/lib/vision/imagePreprocessor.ts`)**:
   - Magic byte header checks (`FFD8FF` for JPEG, `89504E47` for PNG).
   - Zero GPS EXIF metadata stripping.
3. **Database Schema (`prisma/schema.prisma`)**:
   - `Room`, `SceneObject`, `SimulationScenario`, `RoomImage`, `VisionAnalysis`, `ObjectDetection`, `VisionObservation`, `VisionClarification`.
4. **Three.js Core Foundation (`src/components/three/`)**:
   - `RoomCanvas.tsx`, `RoomViewer.tsx`, `RoomEnvironment.tsx`, `ModelRenderer.tsx`.
   - High-fidelity GLB models in `public/models` (`double_bed_photoreal.glb`, `toilet_modern.glb`, `shower_enclosure.glb`, etc.).
   - HDRI lighting (`public/hdri/brown_photostudio_02_1k.hdr`) and PBR textures (`public/textures/`).

### 2.2. New & Enhanced Components to Build
1. **Interactive 3D Editor with TransformControls & 5 Viewing Modes**:
   - Seamless switching between:
     - **Mode A — Isometric Dollhouse** (front walls cut away, 3/4 aerial view).
     - **Mode B — Realistic Interior** (eye-level in-room view).
     - **Mode C — First Person Walkthrough** (WASD/cursor keys + pointer rotation, wall collision bounds).
     - **Mode D — Top-Down Floor Plan** (architectural view with dimension markings).
     - **Mode E — Safety Hazard Analysis** (3D risk clustering, hazard perimeter circles, inspection fly-to).
   - Direct 3D manipulation via Three.js `TransformControls` (Translate, Rotate, Snap to floor).
2. **AI Inference & Depth Adapter (`src/lib/vision/`)**:
   - `VisionInferenceProvider`: Support for configurable inference endpoints (FastAPI / YOLOv8 / Depth Anything V2) and robust deterministic fallback datasets.
   - Multi-frame video sampler: Client-side video frame extraction for multi-angle scanning.
3. **Spatial Reconstruction & Semantic 3D Scene Graph (`src/lib/reconstruction/`)**:
   - Camera unprojection from 2D bounding boxes to 3D metric world space ($X, Y, Z$).
   - Floor plane leveling ($Y=0$) and room boundary constraint solver.
   - Comprehensive TypeScript & Zod schemas for `SemanticSceneGraph` with provenance tracking.
4. **Intelligent Asset Matching Engine (`src/lib/assets/assetMatcher.ts`)**:
   - Aspect ratio, category, and visual property matching to select optimal GLB assets from `ASSET_REGISTRY`.
   - Procedural high-detail fallbacks with PBR textures when exact GLB models are not available.
5. **AI Room Scanner Wizard (`src/components/scanner/`)**:
   - Step 1: Room space selection (Bedroom, Bathroom, Living Room).
   - Step 2: Media upload (Single image, multiple views, room scanning video).
   - Step 3: AI processing progress visualization.
   - Step 4: Human-in-the-loop verification (edit bounding boxes, room dimensions, object categories).
   - Step 5: Interactive 3D scene preview & layout adjustment.
   - Step 6: Risk analysis & transfer to What-If simulation.

---

## 3. End-to-End Pipeline Architecture

```text
USER INPUT
   ├── Single Image (JPEG / PNG / WebP)
   ├── Multi-angle Image Set
   └── Room Scanning Video (MP4 / WebM -> Frame Extractor)
         │
         ▼
MEDIA VALIDATION GATEWAY
   ├── Magic Byte Verification (Anti-spoofing)
   ├── Client-side EXIF GPS Stripping
   └── Resolution & File Size Clamping (Max 10MB, 4096x4096px)
         │
         ▼
AI COMPUTER VISION INFERENCE
   ├── Object Detection (YOLOv8 / YOLOv11 taxonomy: 18 elderly fall entities)
   ├── Instance Masking / Boundary Box Localization
   └── Monocular Depth Estimation (Depth Anything V2 adapter)
         │
         ▼
SPATIAL RECONSTRUCTION ENGINE
   ├── Perspective Ray Unprojection (Camera space -> Metric World space)
   ├── Floor Plane Grounding (Y = 0 clamp, prevents hovering/sinking)
   ├── Room Dimension Scaling (Anchor object calibration)
   └── Multi-view Association & Deduplication
         │
         ▼
SEMANTIC 3D SCENE GRAPH
   ├── Room Envelope: width, length, height, floor material, lux level
   └── Objects: id, category, assetId, position [x,y,z], rotation [x,y,z], dimensions, confidence, provenance
         │
         ▼
ASSET MATCHING ENGINE
   ├── Match Category + Aspect Ratio (W:L:H) -> Best GLB in ASSET_REGISTRY
   └── Apply PBR Material Variations (Oak, Walnut, Linen, Porcelain, Tiles)
         │
         ▼
PHOTOREALISTIC THREE.JS / R3F RENDERER
   ├── PBR Standard Materials, ACES Filmic Tone Mapping, Soft Shadows
   ├── 5 View Modes: Dollhouse, Interior, Walkthrough, Top-down, Safety
   └── Interactive TransformControls + Snap-to-Floor
         │
         ▼
SAFETY ASSESSMENT & WHAT-IF SIMULATION
   ├── 8 Deterministic Clinical Rules (WHO / CDC STEADI)
   ├── Smart Hazard Clustering (<0.95m Euclidean)
   └── Guided Survey Sync for Unobserved Features (e.g. non-slip backing)
```

---

## 4. Semantic Scene Graph Data Contract

```typescript
export interface SemanticSceneGraph {
  sceneId: string;
  roomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM";
  geometrySource: "ai_vision_reconstructed" | "survey_calibrated" | "manual_blueprint";
  dimensions: {
    width: number;   // meters (X axis)
    length: number;  // meters (Z axis)
    height: number;  // meters (Y axis)
    unit: "m";
  };
  floorProperties: {
    material: "WOOD" | "CERAMIC_TILE" | "NON_SLIP_VINYL";
    isSlipResistant: boolean;
    isWet: boolean;
  };
  lightingLevelLux: number;
  objects: SemanticSceneObject[];
  metadata: {
    sourceImages: string[];
    calibrationAnchor?: string;
    reconstructionTimestamp: string;
    version: string;
  };
}

export interface SemanticSceneObject {
  id: string;
  category: string;
  name: string;
  assetId: string;
  glbPath?: string;
  position: [number, number, number]; // [X, Y, Z] in meters, Y=0 on floor
  rotation: [number, number, number]; // [Euler angles in radians]
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  detectionConfidence: number;
  measurementStatus: "estimated" | "calibrated" | "user_verified";
  verified: boolean;
  isFixed: boolean;
  isLoose?: boolean;
  isWalkwayObstacle?: boolean;
  riskIds: string[];
  sourceDetectionId?: string;
}
```

---

## 5. Implementation Roadmap & Verification Milestones

1. **Phase 1**: Architecture Plan & Contracts Documentation *(Completed in this file)*.
2. **Phase 2**: Asset Registry Extension & 3D Interactive Editor with TransformControls, First-Person Walkthrough, and 5 Camera Modes.
3. **Phase 3**: AI Inference & Depth Adapter with support for real endpoints, multi-frame video extraction, and safe fallback datasets.
4. **Phase 4**: Spatial Reconstruction, Camera Unprojection, Floor Grounding, and Asset Matching Engine.
5. **Phase 5**: 6-Step AI Room Scanner UI Wizard integrated into the application.
6. **Phase 6**: Seamless sync with Clinical Risk Engine, Clarification Questions, and What-If Simulator.
7. **Phase 7**: Comprehensive Automated Testing (Vitest) & Production Next.js Build Validation.
