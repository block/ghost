import ghostUiSource from "./ghost-ui.md?raw";

export const fingerprintSamples: Record<string, string> = {
  "ghost-ui": ghostUiSource,
};

export function getFingerprintSample(name: string): string {
  const sample = fingerprintSamples[name];
  if (!sample) {
    throw new Error(
      `Unknown fingerprint sample "${name}". Available: ${Object.keys(
        fingerprintSamples,
      ).join(", ")}`,
    );
  }
  return sample;
}
