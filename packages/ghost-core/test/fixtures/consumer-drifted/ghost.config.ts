import { defineConfig } from "@ghost/core";

export default defineConfig({
  designSystems: [
    {
      name: "test-ds",
      registry: "../registry/registry.json",
      componentDir: "components/ui",
      styleEntry: "src/styles/main.css",
    },
  ],
  scan: { values: true, structure: true, analysis: false },
  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
  },
  ignore: [],
});
