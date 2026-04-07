import { execSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import type { RegistryItem, VisualScanConfig } from "../types.js";

// Dynamic import helper — bypasses TypeScript's compile-time module resolution
// so optional peer dependencies don't cause build errors when not installed.
// biome-ignore lint/suspicious/noExplicitAny: dynamic imports return unknown module shapes
async function optionalImport(id: string): Promise<any> {
  return import(/* webpackIgnore: true */ id);
}

export interface ComponentEntry {
  name: string;
  registrySource: string;
  consumerSource: string;
  registryFile: string;
  consumerFile: string;
}

export interface ScreenshotResult {
  component: string;
  registryPng: Buffer | null;
  consumerPng: Buffer | null;
  error?: string;
}

export interface CompareResult {
  component: string;
  diffPercentage: number;
  diffImagePath: string | null;
  registryFile: string;
  consumerFile: string;
  error?: string;
}

interface HarnessOptions {
  registryItems: RegistryItem[];
  styleContent: string;
  consumerStyleContent: string;
  config: Required<VisualScanConfig>;
  outputDir: string;
}

const VISUAL_DEFAULTS: Required<VisualScanConfig> = {
  threshold: 0.1,
  viewport: { width: 1280, height: 720 },
  timeout: 10000,
  outputDir: ".ghost/visual",
};

export function resolveVisualConfig(
  config: VisualScanConfig = {},
): Required<VisualScanConfig> {
  return {
    threshold: config.threshold ?? VISUAL_DEFAULTS.threshold,
    viewport: config.viewport ?? VISUAL_DEFAULTS.viewport,
    timeout: config.timeout ?? VISUAL_DEFAULTS.timeout,
    outputDir: config.outputDir ?? VISUAL_DEFAULTS.outputDir,
  };
}

export async function createVisualHarness(options: HarnessOptions) {
  const {
    registryItems,
    styleContent,
    consumerStyleContent,
    config,
    outputDir,
  } = options;

  const tempDir = await mkdtemp(join(tmpdir(), "ghost-visual-"));
  const components: ComponentEntry[] = [];

  // Collect registry:lib items for shared utilities (e.g., @/lib/utils)
  const libItems = registryItems.filter((i) => i.type === "registry:lib");
  // Collect all ui items for resolving registryDependencies
  const uiItemsByName = new Map(
    registryItems
      .filter((i) => i.type === "registry:ui")
      .map((i) => [i.name, i]),
  );

  // Collect all npm dependencies across components
  const allNpmDeps = new Set<string>(["react", "react-dom"]);
  for (const item of registryItems) {
    for (const dep of item.dependencies ?? []) {
      allNpmDeps.add(dep);
    }
  }

  async function scaffold() {
    // Write package.json
    const pkgJson = {
      name: "ghost-visual-harness",
      private: true,
      type: "module",
      dependencies: Object.fromEntries(
        [...allNpmDeps].map((d) => [d, "latest"]),
      ),
      devDependencies: {
        "@vitejs/plugin-react": "latest",
        vite: "latest",
        "@types/react": "latest",
        "@types/react-dom": "latest",
      },
    };
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify(pkgJson, null, 2),
    );

    // Write vite.config.ts
    const viteConfig = `
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {},
    },
  },
});
`;
    await writeFile(join(tempDir, "vite.config.ts"), viteConfig);

    // Write tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: "ES2020",
        module: "ESNext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        paths: { "@/*": ["./src/*"] },
        baseUrl: ".",
      },
      include: ["src"],
    };
    await writeFile(
      join(tempDir, "tsconfig.json"),
      JSON.stringify(tsConfig, null, 2),
    );

    // Write shared lib files
    await mkdir(join(tempDir, "src", "lib"), { recursive: true });
    for (const item of libItems) {
      for (const file of item.files) {
        if (!file.content) continue;
        const targetPath = join(tempDir, "src", "lib", basename(file.path));
        await writeFile(targetPath, file.content);
      }
    }

    // Write registry dependency components (shared across all renders)
    await mkdir(join(tempDir, "src", "components", "ui"), { recursive: true });
    for (const [, item] of uiItemsByName) {
      for (const file of item.files) {
        if (!file.content) continue;
        const targetPath = join(
          tempDir,
          "src",
          "components",
          "ui",
          basename(file.path),
        );
        await writeFile(targetPath, file.content);
      }
    }
  }

  async function addComponent(entry: ComponentEntry) {
    components.push(entry);
    const { name, registrySource, consumerSource } = entry;

    // Create registry variant
    const regDir = join(tempDir, "src", "registry", name);
    await mkdir(regDir, { recursive: true });
    await writeFile(join(regDir, "style.css"), styleContent);
    await writeFile(
      join(regDir, `component${extname(entry.registryFile) || ".tsx"}`),
      registrySource,
    );
    await writeFile(join(regDir, "index.html"), makeHtml(name, "registry"));
    await writeFile(join(regDir, "main.tsx"), makeMain("registry", name));

    // Create consumer variant
    const conDir = join(tempDir, "src", "consumer", name);
    await mkdir(conDir, { recursive: true });
    await writeFile(join(conDir, "style.css"), consumerStyleContent);
    await writeFile(
      join(conDir, `component${extname(entry.consumerFile) || ".tsx"}`),
      consumerSource,
    );
    await writeFile(join(conDir, "index.html"), makeHtml(name, "consumer"));
    await writeFile(join(conDir, "main.tsx"), makeMain("consumer", name));
  }

  async function renderAll(): Promise<CompareResult[]> {
    // Install dependencies
    execSync("npm install --prefer-offline --no-audit --no-fund", {
      cwd: tempDir,
      stdio: "pipe",
      timeout: 60000,
    });

    // Dynamically import optional dependencies
    // biome-ignore lint/suspicious/noExplicitAny: dynamic imports with unknown module shapes
    let createServer: any;
    // biome-ignore lint/suspicious/noExplicitAny: dynamic imports with unknown module shapes
    let chromium: any;
    // biome-ignore lint/suspicious/noExplicitAny: dynamic imports with unknown module shapes
    let pixelmatch: any;
    // biome-ignore lint/suspicious/noExplicitAny: dynamic imports with unknown module shapes
    let PNG: any;

    try {
      const vite = await optionalImport("vite");
      createServer = vite.createServer;
    } catch {
      throw new Error(
        "Visual scanner requires 'vite' — install it as a dev dependency",
      );
    }

    try {
      const pw = await optionalImport("playwright");
      chromium = pw.chromium;
    } catch {
      throw new Error(
        "Visual scanner requires 'playwright' — run: npm install -D playwright && npx playwright install chromium",
      );
    }

    try {
      const pm = await optionalImport("pixelmatch");
      pixelmatch = pm.default;
    } catch {
      throw new Error(
        "Visual scanner requires 'pixelmatch' — install it as a dependency",
      );
    }

    try {
      const pngjs = await optionalImport("pngjs");
      PNG = pngjs.PNG;
    } catch {
      throw new Error(
        "Visual scanner requires 'pngjs' — install it as a dependency",
      );
    }

    // Start Vite dev server
    const server = await createServer({
      root: tempDir,
      server: { port: 0 },
      logLevel: "silent",
    });
    await server.listen();
    const address = server.httpServer?.address();
    const port = typeof address === "object" && address ? address.port : 5173;
    const baseUrl = `http://localhost:${port}`;

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: config.viewport,
    });

    const results: CompareResult[] = [];

    // Ensure output dir exists
    await mkdir(outputDir, { recursive: true });

    for (const comp of components) {
      try {
        // Screenshot registry version
        const regPage = await context.newPage();
        await regPage.goto(`${baseUrl}/src/registry/${comp.name}/index.html`, {
          timeout: config.timeout,
        });
        await regPage
          // biome-ignore lint/suspicious/noExplicitAny: browser context global
          .waitForFunction(() => (window as any).__GHOST_READY === true, {
            timeout: config.timeout,
          })
          .catch(() => {});
        const regScreenshot = await regPage.screenshot({ fullPage: true });
        await regPage.close();

        // Screenshot consumer version
        const conPage = await context.newPage();
        await conPage.goto(`${baseUrl}/src/consumer/${comp.name}/index.html`, {
          timeout: config.timeout,
        });
        await conPage
          // biome-ignore lint/suspicious/noExplicitAny: browser context global
          .waitForFunction(() => (window as any).__GHOST_READY === true, {
            timeout: config.timeout,
          })
          .catch(() => {});
        const conScreenshot = await conPage.screenshot({ fullPage: true });
        await conPage.close();

        // Decode PNGs
        const regImg = PNG.sync.read(regScreenshot);
        const conImg = PNG.sync.read(conScreenshot);

        // Ensure same dimensions (use larger canvas)
        const width = Math.max(regImg.width, conImg.width);
        const height = Math.max(regImg.height, conImg.height);

        const regResized = resizePng(PNG, regImg, width, height);
        const conResized = resizePng(PNG, conImg, width, height);

        const diffImg = new PNG({ width, height });
        const numDiffPixels = pixelmatch(
          regResized.data,
          conResized.data,
          diffImg.data,
          width,
          height,
          { threshold: 0.1 },
        );

        const totalPixels = width * height;
        const diffPercentage =
          totalPixels > 0 ? (numDiffPixels / totalPixels) * 100 : 0;

        // Write diff image
        let diffImagePath: string | null = null;
        if (diffPercentage > 0) {
          diffImagePath = join(outputDir, `${comp.name}-diff.png`);
          const diffBuffer = PNG.sync.write(diffImg);
          await writeFile(diffImagePath, diffBuffer);

          // Also write individual screenshots for reference
          await writeFile(
            join(outputDir, `${comp.name}-registry.png`),
            regScreenshot,
          );
          await writeFile(
            join(outputDir, `${comp.name}-consumer.png`),
            conScreenshot,
          );
        }

        results.push({
          component: comp.name,
          diffPercentage,
          diffImagePath,
          registryFile: comp.registryFile,
          consumerFile: comp.consumerFile,
        });
      } catch (err) {
        results.push({
          component: comp.name,
          diffPercentage: -1,
          diffImagePath: null,
          registryFile: comp.registryFile,
          consumerFile: comp.consumerFile,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await context.close();
    await browser.close();
    await server.close();

    return results;
  }

  async function cleanup() {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  return { scaffold, addComponent, renderAll, cleanup, tempDir };
}

function makeHtml(name: string, variant: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${variant}/${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>`;
}

function makeMain(_variant: string, _name: string): string {
  return `import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

// Import the component — default or named export
import * as Mod from "./component";

const Component = (Mod as any).default ?? Object.values(Mod)[0] ?? (() => <div>No export found</div>);

function App() {
  return (
    <div style={{ padding: "24px" }}>
      <Component />
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
(window as any).__GHOST_READY = true;
`;
}

// biome-ignore lint/suspicious/noExplicitAny: dynamically imported PNG constructor
function resizePng(PNG: any, img: any, width: number, height: number): any {
  if (img.width === width && img.height === height) return img;

  const resized = new PNG({ width, height });
  // Fill with white background
  resized.data.fill(255);

  // Copy original image data
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const dstIdx = (y * width + x) * 4;
      resized.data[dstIdx] = img.data[srcIdx];
      resized.data[dstIdx + 1] = img.data[srcIdx + 1];
      resized.data[dstIdx + 2] = img.data[srcIdx + 2];
      resized.data[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }

  return resized;
}
