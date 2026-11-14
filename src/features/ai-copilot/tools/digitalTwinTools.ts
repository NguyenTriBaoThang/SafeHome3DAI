/**
 * SafeHome Copilot — Digital Twin 3D Integration Interface Specification
 * Defines typed tool interfaces for future integration between AI Copilot and 3D simulation.
 * Future modification actions must require explicit user confirmation.
 */

import { RoomState, SceneObjectState, HazardFindingResult, ScenarioComparison } from "@/types";

export interface RoomContextPayload {
  roomId: string;
  roomName: string;
  roomType: string;
  dimensions: { width: number; length: number; height: number };
  lightingLux: number;
  isWet: boolean;
  isSlipResistant: boolean;
  grabBarsCount: number;
  totalObjects: number;
  activeHazardsCount: number;
}

export interface HazardExplanation {
  hazardId: string;
  hazardType: string;
  title: string;
  severityCategory: "LOW" | "MEDIUM" | "HIGH";
  detectionRuleId: string;
  geometricMeasurement: string;
  standardsReference: string;
  underlyingMechanism: string;
  recommendedModifications: string[];
}

export interface RoomModificationSuggestion {
  suggestionId: string;
  targetObjectId?: string;
  targetObjectName?: string;
  proposedAction: "MOVE" | "FIX" | "ADD_DEVICE" | "REMOVE" | "ADJUST_LIGHTING";
  description: string;
  estimatedCostVND: string;
  requiresUserConfirmation: true; // Mandatory guardrail
  parameters: Record<string, any>;
}

export interface DigitalTwinToolProvider {
  /**
   * Retrieves summary parameters of a 3D room.
   */
  getRoomContext(roomId: string): Promise<RoomContextPayload | null>;

  /**
   * Retrieves list of 3D objects placed in the configured room.
   */
  getSceneObjects(roomId: string): Promise<SceneObjectState[]>;

  /**
   * Retrieves current active environmental hazard findings from the Rule Engine.
   */
  getHazardFindings(roomId: string): Promise<HazardFindingResult[]>;

  /**
   * Provides detailed explainability details for a specific detected hazard.
   */
  explainHazard(hazardId: string): Promise<HazardExplanation | null>;

  /**
   * Suggests room modifications to eliminate hazards. Requires user confirmation before execution.
   */
  suggestRoomModifications(roomId: string): Promise<RoomModificationSuggestion[]>;

  /**
   * Compares baseline vs modified assessment snapshots.
   */
  compareAssessmentResults(
    beforeId: string,
    afterId: string
  ): Promise<ScenarioComparison | null>;
}

/**
 * Default implementation connected to existing in-memory/persisted room state.
 */
export const digitalTwinTools: DigitalTwinToolProvider = {
  async getRoomContext(roomId: string) {
    return null; // Ready for connection
  },
  async getSceneObjects(roomId: string) {
    return [];
  },
  async getHazardFindings(roomId: string) {
    return [];
  },
  async explainHazard(hazardId: string) {
    return null;
  },
  async suggestRoomModifications(roomId: string) {
    return [];
  },
  async compareAssessmentResults(beforeId: string, afterId: string) {
    return null;
  },
};

