import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";
import { buildCli } from "../../../src/cli.js";

export const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../..",
);

export type CacheState = "missing" | "present" | "malformed";

export async function createSingleSurfaceSandbox(
  options: { cache?: CacheState; reorderUnrelated?: boolean } = {},
): Promise<string> {
  const root = await createTempRoot("single");
  await writeFiles(root, [
    "apps/refunds/settings/page.tsx",
    "apps/refunds/settings/primary.tsx",
    "apps/refunds/settings/secondary.tsx",
    "apps/refunds/settings/tertiary.tsx",
    "apps/refunds/settings/quaternary.tsx",
    "apps/onboarding/page.tsx",
    "shared/ui/Button.tsx",
  ]);
  await writePackage(join(root, ".ghost"), {
    fingerprint: singleSurfaceFingerprint(options.reorderUnrelated ?? false),
    checks: refundChecks(),
  });
  await writeCache(root, options.cache ?? "missing");
  return root;
}

export async function createNestedSandbox(): Promise<string> {
  const root = await createTempRoot("nested");
  await writeFiles(root, [
    "apps/dashboard/refunds/page.tsx",
    "apps/dashboard/refunds/detail.tsx",
    "apps/portal/payments/page.tsx",
  ]);
  await writePackage(join(root, ".ghost"), {
    fingerprint: rootProductFingerprint(),
    checks: rootChecks(),
  });
  await writePackage(join(root, "apps/dashboard/.ghost"), {
    fingerprint: dashboardFingerprint(),
    checks: dashboardChecks(),
  });
  return root;
}

export async function createMultiStackSandbox(): Promise<string> {
  const root = await createTempRoot("multi");
  await writeFiles(root, [
    "apps/dashboard/refunds/page.tsx",
    "apps/portal/payments/page.tsx",
  ]);
  await writePackage(join(root, ".ghost"), {
    fingerprint: rootProductFingerprint(),
    checks: rootChecks(),
  });
  await writePackage(join(root, "apps/dashboard/.ghost"), {
    fingerprint: dashboardFingerprint(),
    checks: dashboardChecks(),
  });
  await writePackage(join(root, "apps/portal/.ghost"), {
    fingerprint: portalFingerprint(),
    checks: portalChecks(),
  });
  return root;
}

export async function removeSandbox(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}

export async function runCli(
  argv: string[],
  cwd: string,
  options: { allowNoExit?: boolean } = {},
) {
  const cli = buildCli();
  const previousCwd = process.cwd();
  let stdout = "";
  let stderr = "";
  let exitCode: number | undefined;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stdout += chunk.toString();
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stderr += chunk.toString();
      return true;
    });
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
    stdout += `${args.join(" ")}\n`;
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
    stderr += `${args.join(" ")}\n`;
  });
  const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
    exitCode = typeof code === "number" ? code : 0;
    finish();
    return undefined as never;
  });

  try {
    process.chdir(cwd);
    cli.parse(["node", "ghost", ...argv]);
    if (options.allowNoExit) setTimeout(finish, 500);
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command did not exit")), 2000),
      ),
    ]);
  } finally {
    process.chdir(previousCwd);
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { stdout, stderr, code: exitCode ?? 0 };
}

export async function readPrompt(root: string, outDir: string): Promise<string> {
  return readFile(join(root, outDir, "prompt.md"), "utf-8");
}

export function diffFor(...paths: string[]): string {
  return paths
    .map(
      (path) => `diff --git a/${path} b/${path}
--- a/${path}
+++ b/${path}
@@ -0,0 +1,1 @@
+const changed = true;
`,
    )
    .join("\n");
}

async function createTempRoot(label: string): Promise<string> {
  const root = join(
    tmpdir(),
    `ghost-context-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(root, { recursive: true });
  return root;
}

async function writeFiles(root: string, paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      const full = join(root, path);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, `// ${path}\n`, "utf-8");
    }),
  );
}

async function writePackage(
  pkg: string,
  options: { fingerprint: string; checks?: string },
): Promise<void> {
  const fingerprintDir = join(pkg, "fingerprint");
  await mkdir(join(fingerprintDir, "enforcement"), { recursive: true });
  await writeFile(
    join(fingerprintDir, "manifest.yml"),
    "schema: ghost.fingerprint-package/v1\nid: local\n",
    "utf-8",
  );
  await writeFile(join(fingerprintDir, "prose.yml"), proseLayer(options.fingerprint));
  await writeFile(
    join(fingerprintDir, "inventory.yml"),
    inventoryLayer(options.fingerprint),
  );
  await writeFile(
    join(fingerprintDir, "composition.yml"),
    compositionLayer(options.fingerprint),
  );
  if (options.checks) {
    await writeFile(
      join(fingerprintDir, "enforcement", "checks.yml"),
      options.checks,
      "utf-8",
    );
  }
}

async function writeCache(root: string, state: CacheState): Promise<void> {
  if (state === "missing") return;
  const cacheDir = join(root, ".ghost", "fingerprint", "sources", "cache");
  await mkdir(cacheDir, { recursive: true });
  await writeFile(
    join(cacheDir, "inventory.json"),
    state === "malformed"
      ? "{nope"
      : JSON.stringify(
          {
            platform_hints: ["web"],
            build_system_hints: ["vite"],
            package_manifests: ["package.json"],
            candidate_config_files: ["apps/refunds/theme.ts"],
          },
          null,
          2,
        ),
    "utf-8",
  );
}

function proseLayer(raw: string): string {
  return raw.split("# inventory")[0].replace("# prose\n", "");
}

function inventoryLayer(raw: string): string {
  return raw.split("# inventory\n")[1].split("# composition\n")[0];
}

function compositionLayer(raw: string): string {
  return raw.split("# composition\n")[1];
}

function singleSurfaceFingerprint(reorderUnrelated: boolean): string {
  const unrelated = `    - id: onboarding-welcome
      path: apps/onboarding/page.tsx
      title: Onboarding welcome
      surface_type: setup
      scope: onboarding
      why: Unrelated setup flow.
`;
  const refundExemplars = `    - id: refund-settings-primary
      path: apps/refunds/settings/primary.tsx
      title: Refund settings primary
      surface_type: settings
      scope: refund-settings
      why: Shows consequence copy beside refund controls.
      refs: [prose.principle:refund-trust, composition.pattern:refund-disclosure]
    - id: refund-settings-secondary
      path: apps/refunds/settings/secondary.tsx
      title: Refund settings secondary
      surface_type: settings
      scope: refund-settings
      why: Shows recovery affordances.
      refs: [prose.principle:refund-trust]
    - id: refund-settings-tertiary
      path: apps/refunds/settings/tertiary.tsx
      title: Refund settings tertiary
      surface_type: settings
      scope: refund-settings
      why: Shows compact review hierarchy.
      refs: [composition.pattern:refund-disclosure]
    - id: refund-settings-quaternary
      path: apps/refunds/settings/quaternary.tsx
      title: Refund settings quaternary
      surface_type: settings
      scope: refund-settings
      why: Extra exemplar used to prove omission caps.
`;
  return `# prose
summary:
  product: Sandbox Pay
  goals: [make refund settings trustworthy]
situations:
  - id: refund-review
    title: Refund review
    user_intent: Understand refund impact before saving.
    product_obligation: Keep consequences visible before action.
    surface_type: settings
    principles: [prose.principle:refund-trust]
    experience_contracts: [prose.experience_contract:refund-reversibility]
    patterns: [composition.pattern:refund-disclosure]
principles:
  - id: refund-trust
    principle: Refund controls must make consequence and recovery visible.
    applies_to:
      scopes: [refund-settings]
    check_refs: [check:no-hardcoded-ui-color]
experience_contracts:
  - id: refund-reversibility
    contract: Destructive settings changes expose a recovery path.
    applies_to:
      surface_types: [settings]
# inventory
topology:
  scopes:
    - id: refund-settings
      paths: [apps/refunds/settings]
      surface_types: [settings]
    - id: onboarding
      paths: [apps/onboarding]
      surface_types: [setup]
  surface_types: [settings, setup]
building_blocks:
  components: [RefundSettingsForm]
  tokens: [color.intent.warning]
exemplars:
${reorderUnrelated ? unrelated : ""}${refundExemplars}${reorderUnrelated ? "" : unrelated}sources: []
# composition
patterns:
  - id: refund-disclosure
    kind: flow
    pattern: Reveal refund consequences before the save action.
    applies_to:
      scopes: [refund-settings]
    guidance: [Keep recovery affordances next to confirmation copy.]
    check_refs: [check:no-hardcoded-ui-color]
`;
}

function refundChecks(): string {
  return `schema: ghost.checks/v1
id: sandbox-pay
checks:
  - id: no-hardcoded-ui-color
    title: Use semantic UI color
    status: active
    severity: serious
    derivation:
      prose: [prose.principle:refund-trust]
      composition: [composition.pattern:refund-disclosure]
      inventory: [inventory.exemplar:refund-settings-primary]
    applies_to:
      scopes: [refund-settings]
      paths: [apps/refunds/settings]
    detector:
      type: forbidden-regex
      pattern: '#[0-9a-fA-F]{3,8}'
    evidence:
      support: 0.9
      observed_count: 3
      examples: [apps/refunds/settings/primary.tsx]
    repair: Use semantic warning tokens.
  - id: proposed-density
    title: Proposed density check
    status: proposed
    severity: nit
    detector:
      type: required-regex
      pattern: Density
  - id: disabled-motion
    title: Disabled motion check
    status: disabled
    severity: nit
    detector:
      type: required-regex
      pattern: motion
`;
}

function rootProductFingerprint(): string {
  return `# prose
summary:
  product: Sandbox Suite
  goals: [keep administrative workflows calm]
situations: []
principles:
  - id: suite-restraint
    principle: Shared administrative surfaces stay calm and reversible.
experience_contracts: []
# inventory
topology:
  scopes:
    - id: suite-root
      paths: [apps]
      surface_types: [admin]
  surface_types: [admin]
building_blocks: {}
exemplars: []
sources: []
# composition
patterns: []
`;
}

function rootChecks(): string {
  return `schema: ghost.checks/v1
id: suite
checks: []
`;
}

function dashboardFingerprint(): string {
  return `# prose
summary:
  product: Dashboard
situations: []
principles:
  - id: dashboard-refund-focus
    principle: Dashboard refund work keeps review state close to action state.
    applies_to:
      scopes: [dashboard-refunds]
experience_contracts: []
# inventory
topology:
  scopes:
    - id: dashboard-refunds
      paths: [apps/dashboard/refunds]
      surface_types: [admin]
  surface_types: [admin]
building_blocks: {}
exemplars:
  - id: dashboard-refunds-page
    path: apps/dashboard/refunds/page.tsx
    scope: dashboard-refunds
    surface_type: admin
    why: Shows local dashboard refund hierarchy.
    refs: [prose.principle:dashboard-refund-focus]
sources: []
# composition
patterns:
  - id: dashboard-review-column
    kind: layout
    pattern: Keep refund review content in a stable right column.
    applies_to:
      scopes: [dashboard-refunds]
`;
}

function dashboardChecks(): string {
  return `schema: ghost.checks/v1
id: dashboard
checks: []
`;
}

function portalFingerprint(): string {
  return `# prose
summary:
  product: Portal
situations: []
principles:
  - id: portal-payment-clarity
    principle: Portal payment edits name settlement impact before action.
    applies_to:
      scopes: [portal-payments]
experience_contracts: []
# inventory
topology:
  scopes:
    - id: portal-payments
      paths: [apps/portal/payments]
      surface_types: [admin]
  surface_types: [admin]
building_blocks: {}
exemplars:
  - id: portal-payments-page
    path: apps/portal/payments/page.tsx
    scope: portal-payments
    surface_type: admin
    why: Shows settlement-impact copy.
    refs: [prose.principle:portal-payment-clarity]
sources: []
# composition
patterns: []
`;
}

function portalChecks(): string {
  return `schema: ghost.checks/v1
id: portal
checks: []
`;
}
