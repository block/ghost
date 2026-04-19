"use client";

import { FileTree, FileTreeFile, FileTreeFolder } from "@ghost/ui";

export function FileTreeDemo() {
  return (
    <div className="grid max-w-sm gap-6">
      <FileTree
        defaultExpanded={new Set(["src", "src/components", "src/lib"])}
        selectedPath="src/components/button.tsx"
      >
        <FileTreeFolder path="src" name="src">
          <FileTreeFolder path="src/components" name="components">
            <FileTreeFile path="src/components/button.tsx" name="button.tsx" />
            <FileTreeFile path="src/components/card.tsx" name="card.tsx" />
            <FileTreeFile path="src/components/dialog.tsx" name="dialog.tsx" />
            <FileTreeFile path="src/components/input.tsx" name="input.tsx" />
          </FileTreeFolder>
          <FileTreeFolder path="src/lib" name="lib">
            <FileTreeFile path="src/lib/utils.ts" name="utils.ts" />
            <FileTreeFile path="src/lib/api.ts" name="api.ts" />
          </FileTreeFolder>
          <FileTreeFolder path="src/styles" name="styles">
            <FileTreeFile path="src/styles/globals.css" name="globals.css" />
          </FileTreeFolder>
          <FileTreeFile path="src/app.tsx" name="app.tsx" />
          <FileTreeFile path="src/index.ts" name="index.ts" />
        </FileTreeFolder>
        <FileTreeFile path="package.json" name="package.json" />
        <FileTreeFile path="tsconfig.json" name="tsconfig.json" />
        <FileTreeFile path="README.md" name="README.md" />
      </FileTree>
    </div>
  );
}
