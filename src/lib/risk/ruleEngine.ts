import { AssessmentSnapshot } from "./types";
import {
  evaluateRoomHazardsCanonical,
  adaptCanonicalToLegacySnapshot,
  CanonicalAssessmentResult,
  CanonicalEngineOptions,
} from "./canonicalEngine";

export {
  evaluateRoomHazardsCanonical,
  adaptCanonicalToLegacySnapshot,
};
export type { CanonicalAssessmentResult, CanonicalEngineOptions };

/**
 * Evaluates environmental hazards on a room input.
 * Delegates directly to the pure Canonical Risk Engine (Task A03)
 * and adapts the output for backward-compatible AssessmentSnapshot consumers.
 *
 * Single Source of Truth: All evaluations execute the canonical engine.
 */
export function evaluateRoomHazards(
  rawInput: any,
  options?: CanonicalEngineOptions
): AssessmentSnapshot {
  const canonicalResult = evaluateRoomHazardsCanonical(rawInput, options);
  return adaptCanonicalToLegacySnapshot(canonicalResult, rawInput);
}
