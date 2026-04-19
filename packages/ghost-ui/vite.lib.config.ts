import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Library build for @ghost/ui. Separate from the SPA build (vite.config.ts)
 * while we're mid-migration to apps/catalogue + apps/docs.
 *
 * - Entry: src/index.ts
 * - Output: dist-lib/ (ESM)
 * - Types: emitted separately by `tsc --build tsconfig.lib.json`
 * - Peer-externalized: React, Radix, everything consumer apps install themselves
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist-lib",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      // Externalize any import that isn't a relative path. Node builtins
      // and npm packages become peerDependencies; consumer apps own them.
      external: (id) => {
        if (id.startsWith(".") || id.startsWith("/") || id.startsWith("@/")) {
          return false;
        }
        return true;
      },
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
});
