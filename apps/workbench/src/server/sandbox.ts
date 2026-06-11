import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type SandboxKind = "single" | "nested" | "multi";
export type CacheState = "missing" | "present" | "malformed";

export interface SandboxOptions {
  kind: SandboxKind;
  cache?: CacheState;
  reorderUnrelated?: boolean;
}

export async function createSandbox(options: SandboxOptions): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ghost-workbench-"));
  if (options.kind === "single") {
    await createSingleSurfaceSandbox(root, options);
  } else if (options.kind === "nested") {
    await createNestedSandbox(root);
  } else {
    await createMultiStackSandbox(root);
  }
  return root;
}

export async function removeSandbox(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true });
}

export function diffFor(...paths: string[]): string {
  return paths
    .map((path) => diffWithAddedLines(path, "const changed = true;"))
    .join("\n");
}

export function diffWithAddedLines(path: string, ...lines: string[]): string {
  return `diff --git a/${path} b/${path}
--- a/${path}
+++ b/${path}
@@ -0,0 +1,${lines.length} @@
${lines.map((line) => `+${line}`).join("\n")}
`;
}

export function diffWithAddedLinesForPaths(
  entries: Array<{ path: string; lines: string[] }>,
): string {
  return entries
    .map((entry) => diffWithAddedLines(entry.path, ...entry.lines))
    .join("\n");
}

export function sourceFilesFor(kind: SandboxKind): string[] {
  if (kind === "single") {
    return [
      "apps/refunds/settings/page.tsx",
      "apps/refunds/settings/primary.tsx",
      "apps/refunds/settings/secondary.tsx",
      "apps/refunds/settings/tertiary.tsx",
      "apps/refunds/settings/quaternary.tsx",
      "apps/onboarding/page.tsx",
      "shared/ui/Button.tsx",
    ];
  }
  if (kind === "nested") {
    return [
      "apps/dashboard/refunds/page.tsx",
      "apps/dashboard/refunds/detail.tsx",
      "apps/portal/payments/page.tsx",
    ];
  }
  return ["apps/dashboard/refunds/page.tsx", "apps/portal/payments/page.tsx"];
}

export function ghostFilesFor(
  kind: SandboxKind,
  cache: CacheState = "missing",
): string[] {
  const packageFiles = (prefix: string) => [
    `${prefix}/fingerprint/manifest.yml`,
    `${prefix}/fingerprint/prose.yml`,
    `${prefix}/fingerprint/inventory.yml`,
    `${prefix}/fingerprint/composition.yml`,
    `${prefix}/fingerprint/enforcement/checks.yml`,
  ];
  const files =
    kind === "single"
      ? packageFiles(".ghost")
      : kind === "nested"
        ? [...packageFiles(".ghost"), ...packageFiles("apps/dashboard/.ghost")]
        : [
            ...packageFiles(".ghost"),
            ...packageFiles("apps/dashboard/.ghost"),
            ...packageFiles("apps/portal/.ghost"),
          ];
  if (cache !== "missing") {
    files.push(".ghost/fingerprint/sources/cache/inventory.json");
  }
  return files;
}

async function createSingleSurfaceSandbox(
  root: string,
  options: Pick<SandboxOptions, "cache" | "reorderUnrelated">,
): Promise<void> {
  await writeFiles(root, sourceFilesFor("single"));
  await writePackage(join(root, ".ghost"), {
    fingerprint: singleSurfaceFingerprint(options.reorderUnrelated ?? false),
    checks: refundChecks(),
  });
  await writeCache(root, options.cache ?? "missing");
}

async function createNestedSandbox(root: string): Promise<void> {
  await writeFiles(root, sourceFilesFor("nested"));
  await writePackage(join(root, ".ghost"), {
    fingerprint: rootProductFingerprint(),
    checks: rootChecks(),
  });
  await writePackage(join(root, "apps/dashboard/.ghost"), {
    fingerprint: dashboardFingerprint(),
    checks: dashboardChecks(),
  });
}

async function createMultiStackSandbox(root: string): Promise<void> {
  await writeFiles(root, sourceFilesFor("multi"));
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
  await writeFile(
    join(fingerprintDir, "prose.yml"),
    proseLayer(options.fingerprint),
    "utf-8",
  );
  await writeFile(
    join(fingerprintDir, "inventory.yml"),
    inventoryLayer(options.fingerprint),
    "utf-8",
  );
  await writeFile(
    join(fingerprintDir, "composition.yml"),
    compositionLayer(options.fingerprint),
    "utf-8",
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
      paths: [refunds]
      surface_types: [admin]
  surface_types: [admin]
building_blocks: {}
exemplars:
  - id: dashboard-refunds-page
    path: refunds/page.tsx
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
      paths: [payments]
      surface_types: [admin]
  surface_types: [admin]
building_blocks: {}
exemplars:
  - id: portal-payments-page
    path: payments/page.tsx
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

export async function listRelativeFiles(root: string): Promise<string[]> {
  const paths: string[] = [];

  async function walk(dir: string, prefix = ""): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), childPrefix);
      } else {
        paths.push(childPrefix);
      }
    }
  }

  await walk(root);
  return paths;
}
