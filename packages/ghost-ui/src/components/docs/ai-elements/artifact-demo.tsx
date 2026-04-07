"use client";

import { CopyIcon, DownloadIcon, ShareIcon } from "lucide-react";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactClose,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";

export function ArtifactDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <Artifact>
        <ArtifactHeader>
          <div>
            <ArtifactTitle>React Component</ArtifactTitle>
            <ArtifactDescription>
              A reusable button component with variants
            </ArtifactDescription>
          </div>
          <ArtifactActions>
            <ArtifactAction tooltip="Copy" icon={CopyIcon} />
            <ArtifactAction tooltip="Download" icon={DownloadIcon} />
            <ArtifactAction tooltip="Share" icon={ShareIcon} />
            <ArtifactClose />
          </ArtifactActions>
        </ArtifactHeader>
        <ArtifactContent>
          <pre className="font-mono text-sm">
            {`export function Button({ variant = "primary", children }) {
  return (
    <button className={styles[variant]}>
      {children}
    </button>
  );
}`}
          </pre>
        </ArtifactContent>
      </Artifact>

      <Artifact>
        <ArtifactHeader>
          <div>
            <ArtifactTitle>SVG Illustration</ArtifactTitle>
            <ArtifactDescription>
              Generated logo design concept
            </ArtifactDescription>
          </div>
          <ArtifactActions>
            <ArtifactAction tooltip="Download" icon={DownloadIcon} />
            <ArtifactClose />
          </ArtifactActions>
        </ArtifactHeader>
        <ArtifactContent className="flex items-center justify-center py-12">
          <div className="flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-3xl text-white">
            AI
          </div>
        </ArtifactContent>
      </Artifact>
    </div>
  );
}
