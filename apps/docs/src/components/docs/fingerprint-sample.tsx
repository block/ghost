import { getFingerprintSample } from "@/content/fingerprint-samples";
import { FingerprintPreview } from "./fingerprint-preview";

interface FingerprintSampleProps {
  name: string;
  showLint?: boolean;
  showBody?: boolean;
}

export function FingerprintSample({
  name,
  showLint,
  showBody,
}: FingerprintSampleProps) {
  const source = getFingerprintSample(name);
  return (
    <FingerprintPreview
      source={source}
      showLint={showLint}
      showBody={showBody}
    />
  );
}
