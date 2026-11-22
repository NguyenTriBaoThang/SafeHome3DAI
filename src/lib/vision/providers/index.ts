import { GeminiProvider } from "./GeminiProvider";
import { LocalDetectorProvider } from "./LocalDetectorProvider";
import { VisionProviderError, type VisionProvider } from "./contracts";

export * from "./contracts";
export { GeminiProvider, LocalDetectorProvider };

/** Server-side selection. Invalid configuration must never activate a different provider. */
export function createVisionProvider(name = process.env.VISION_PROVIDER || "gemini"): VisionProvider {
  if (name === "gemini") return new GeminiProvider();
  if (name === "local") return new LocalDetectorProvider();
  throw new VisionProviderError("INVALID_CONFIG", "VISION_PROVIDER chỉ chấp nhận gemini hoặc local.");
}
