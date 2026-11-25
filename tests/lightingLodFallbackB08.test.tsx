import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  QUALITY_PRESET_CONFIG,
  SIMULATED_LIGHTING_CONFIG,
  describeRoomDimensionsWithProvenance,
  getSimulatedLightingConfig,
  resolveIlluminanceDisplay,
} from "@/lib/three/lightingModel";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { WebGLBoundary, WebGLFallback } from "@/components/three/WebGLBoundary";

describe("Task B08 — 3D Lighting Separation, LOD Quality & WebGL Fallback", () => {
  it("1. Three.js lighting presets and toggleNightMode never overwrite measured or baseline lux evidence", () => {
    const store = useSimulationStore.getState();
    store.setLightingLevel(185, "measured");
    const roomBefore = useSimulationStore.getState().getCurrentRoom();
    expect(roomBefore.lightingLevel).toBe(185);
    expect(roomBefore.lightingProvenance).toBe("measured");

    // Switching Three.js visual lighting to NIGHT, STUDIO, AFTERNOON, MORNING
    useSimulationStore.getState().setLightingPreset("NIGHT");
    expect(useSimulationStore.getState().sceneLightingIntensitySimulated).toBe(
      SIMULATED_LIGHTING_CONFIG.NIGHT.sceneLightingIntensitySimulated
    );
    expect(useSimulationStore.getState().getCurrentRoom().lightingLevel).toBe(185);
    expect(useSimulationStore.getState().getCurrentRoom().lightingProvenance).toBe("measured");

    useSimulationStore.getState().setLightingPreset("STUDIO");
    useSimulationStore.getState().toggleNightMode();
    expect(useSimulationStore.getState().getCurrentRoom().lightingLevel).toBe(185);
    expect(useSimulationStore.getState().getCurrentRoom().lightingProvenance).toBe("measured");

    // Reset preset cleanly
    useSimulationStore.getState().setLightingPreset("MORNING");
  });

  it("2. resolveIlluminanceDisplay refuses to label Three.js presets or simulated rooms as actual measured lux", () => {
    const simulatedDisplay = resolveIlluminanceDisplay({
      lightingLevel: 320,
      lightingProvenance: "simulated",
    });
    expect(simulatedDisplay.actualIlluminanceLux).toBeNull();
    expect(simulatedDisplay.statusLabelVi).not.toContain("lux đo thật");
    expect(simulatedDisplay.statusLabelVi).toContain("Chưa đo");

    const photoDraftDisplay = resolveIlluminanceDisplay({
      lightingLevel: 40,
      evidenceStatus: "PHOTO_DRAFT",
    });
    expect(photoDraftDisplay.actualIlluminanceLux).toBeNull();
    expect(photoDraftDisplay.badgeTone).toBe("unmeasured");

    const measuredDisplay = resolveIlluminanceDisplay({
      lightingLevel: 42,
      lightingProvenance: "measured",
    });
    expect(measuredDisplay.actualIlluminanceLux).toBe(42);
    expect(measuredDisplay.statusLabelVi).toContain("42 lux");
    expect(measuredDisplay.badgeTone).toBe("measured");

    const nightVisual = getSimulatedLightingConfig("NIGHT", true);
    expect(nightVisual.disclaimerVi).toContain("không phải số đo lux thật");
  });

  it("3. LOD quality presets scale rendering cost (LOW disables shadows/IBL; HIGH enables PBR) and update store", () => {
    expect(QUALITY_PRESET_CONFIG.LOW.shadows).toBe(false);
    expect(QUALITY_PRESET_CONFIG.LOW.useEnvironment).toBe(false);
    expect(QUALITY_PRESET_CONFIG.LOW.useContactShadows).toBe(false);
    expect(QUALITY_PRESET_CONFIG.LOW.dpr).toBe(1);

    expect(QUALITY_PRESET_CONFIG.MEDIUM.shadows).toBe(true);
    expect(QUALITY_PRESET_CONFIG.MEDIUM.useContactShadows).toBe(false);

    expect(QUALITY_PRESET_CONFIG.HIGH.shadows).toBe(true);
    expect(QUALITY_PRESET_CONFIG.HIGH.useEnvironment).toBe(true);
    expect(QUALITY_PRESET_CONFIG.HIGH.useContactShadows).toBe(true);

    useSimulationStore.getState().setQualityPreset("LOW");
    expect(useSimulationStore.getState().qualityPreset).toBe("LOW");
    useSimulationStore.getState().setQualityPreset("MEDIUM");
    expect(useSimulationStore.getState().qualityPreset).toBe("MEDIUM");
    useSimulationStore.getState().setQualityPreset("HIGH");
    expect(useSimulationStore.getState().qualityPreset).toBe("HIGH");
  });

  it("4. Formats room dimensions with explicit source provenance", () => {
    const simulatedDims = describeRoomDimensionsWithProvenance({
      dimensions: { width: 4.5, length: 5.2, height: 2.8 },
    });
    expect(simulatedDims.text).toBe("4.5×5.2×2.8 m");
    expect(simulatedDims.sourceType).toBe("simulated");

    const confirmedDims = describeRoomDimensionsWithProvenance({
      dimensions: { width: 3.4, length: 4.1, height: 2.7 },
      dimensionProvenance: { width: "measured", length: "measured", height: "measured" },
    });
    expect(confirmedDims.sourceType).toBe("measured");
    expect(confirmedDims.sourceLabelVi).toBe("Đã đo");
  });

  it("5. WebGLFallback & WebGLBoundary provide non-blocking assessment fallback UI", () => {
    const html = renderToStaticMarkup(<WebGLFallback retry={() => {}} />);
    expect(html).toContain("Tiếp tục khám phá bằng dữ liệu");
    expect(html).toContain("/risk-assessment");
    expect(html).toContain("Thử tải lại mô hình");
    expect(WebGLBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });
});

