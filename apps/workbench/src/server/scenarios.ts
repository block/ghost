import type {
  WorkbenchDriftSample,
  WorkbenchPromptSample,
  WorkbenchScenarioDetail,
  WorkbenchScenarioKind,
  WorkbenchScenarioSummary,
  WorkbenchTreeNode,
} from "../shared";
import {
  type CacheState,
  diffFor,
  diffWithAddedLinesForPaths,
  ghostFilesFor,
  type SandboxKind,
  sourceFilesFor,
} from "./sandbox";

export interface ScenarioDefinition {
  id: string;
  title: string;
  kicker: string;
  kind: WorkbenchScenarioKind;
  tags: string[];
  description: string;
  lesson: string;
  sandbox: SandboxKind;
  cache?: CacheState;
  defaultTargetPaths: string[];
  defaultDiffPaths?: string[];
  promptSamples: WorkbenchPromptSample[];
  driftSamples: WorkbenchDriftSample[];
  deterministicRepeat?: boolean;
}

interface TreeBuilder {
  node: WorkbenchTreeNode;
  children: Map<string, TreeBuilder>;
}

export const scenarios: ScenarioDefinition[] = [
  {
    id: "path-matched-single-surface",
    title: "Path-Matched Single Surface",
    kicker: "Context",
    kind: "context",
    tags: ["path match", "scope", "omissions"],
    description:
      "A refund settings task resolves to the refund-settings scope and selected one-hop fingerprint refs.",
    lesson:
      "Target paths should narrow the handoff to specific scopes, exemplars, and active checks without dumping the whole fingerprint.",
    sandbox: "single",
    cache: "present",
    defaultTargetPaths: ["apps/refunds/settings/page.tsx"],
    promptSamples: [
      {
        id: "refund-consequence-copy",
        title: "Refund consequence copy",
        prompt:
          "Tighten the refund settings page so the save action explains consequences and recovery before the merchant commits.",
        intent:
          "Focused generation work on the refund settings surface, with trust and recovery context selected.",
        matchTerms: ["refund", "settings", "consequence", "recovery", "save"],
        targetPaths: ["apps/refunds/settings/page.tsx"],
        expectedFocusRefs: [
          "prose.principle:refund-trust",
          "composition.pattern:refund-disclosure",
          "inventory.exemplar:refund-settings-primary",
          "check:no-hardcoded-ui-color",
        ],
        lesson:
          "A product-specific prompt should keep the handoff narrow and evidence-backed.",
      },
      {
        id: "shared-button-polish",
        title: "Shared button polish",
        prompt:
          "Polish the shared Button component label spacing without assuming this belongs to refund settings.",
        intent:
          "Broad shared UI work that should avoid inventing a product-specific scope.",
        matchTerms: ["shared", "button", "component", "spacing", "polish"],
        targetPaths: ["shared/ui/Button.tsx"],
        expectedFocusRefs: [],
        lesson:
          "A broad component prompt should remain humble when no fingerprint scope matches.",
      },
    ],
    driftSamples: [
      {
        id: "refund-hardcoded-color",
        title: "Refund hardcoded color",
        intent:
          "A generated refund settings change violates the active semantic color check.",
        diffText: diffWithAddedLinesForPaths([
          {
            path: "apps/refunds/settings/page.tsx",
            lines: [
              'export const warningStyle = { color: "#ff5500" };',
              "export const copy = 'Refund consequences stay visible.';",
            ],
          },
        ]),
        expectedSignal: "active-check-failure",
        expectedFocusRefs: [
          "prose.principle:refund-trust",
          "composition.pattern:refund-disclosure",
          "check:no-hardcoded-ui-color",
        ],
        lesson:
          "Deterministic active checks are the blocking signal; advisory review can explain but should not be the gate.",
      },
      {
        id: "refund-semantic-token-pass",
        title: "Refund semantic token pass",
        intent:
          "A generated refund settings change keeps consequence copy while using semantic token language.",
        diffText: diffWithAddedLinesForPaths([
          {
            path: "apps/refunds/settings/page.tsx",
            lines: [
              "export const warningToken = 'color.intent.warning';",
              "export const copy = 'Review refund impact before saving.';",
            ],
          },
        ]),
        expectedSignal: "pass",
        expectedFocusRefs: [
          "prose.principle:refund-trust",
          "composition.pattern:refund-disclosure",
        ],
        lesson:
          "Passing deterministic checks does not prove the experience is perfect; it clears the blocking gate.",
      },
    ],
  },
  {
    id: "global-fallback",
    title: "Global Fallback",
    kicker: "Context",
    kind: "context",
    tags: ["fallback", "humility"],
    description:
      "A payroll path does not match any fingerprint scope, so Ghost keeps a compact global handoff.",
    lesson:
      "Fallback context is useful, but it is deliberately broader and should be treated as provisional.",
    sandbox: "single",
    defaultTargetPaths: ["apps/payroll/page.tsx"],
    promptSamples: [
      {
        id: "payroll-empty-state",
        title: "Payroll empty state",
        prompt:
          "Draft a payroll empty state for a new app area that is not covered by the current fingerprint.",
        intent:
          "Uncovered product work where Ghost should provide global context and provisional caveats.",
        matchTerms: ["payroll", "empty state", "new app", "uncovered"],
        targetPaths: ["apps/payroll/page.tsx"],
        expectedFocusRefs: [],
        lesson:
          "When the prompt names an uncovered surface, Prompt Lab should show fallback instead of false precision.",
      },
    ],
    driftSamples: [],
  },
  {
    id: "nested-stack",
    title: "Nested Stack",
    kicker: "Context",
    kind: "context",
    tags: ["nested", "provenance"],
    description:
      "A dashboard refund path resolves both the root package and child dashboard package.",
    lesson:
      "Nested packages preserve layer provenance while letting child-specific refs guide local surface work.",
    sandbox: "nested",
    defaultTargetPaths: ["apps/dashboard/refunds/page.tsx"],
    promptSamples: [
      {
        id: "dashboard-refund-review",
        title: "Dashboard refund review",
        prompt:
          "Improve the dashboard refunds review page so operators can scan refund risk without losing the local dashboard voice.",
        intent:
          "Nested dashboard work that should merge root product context with child-specific refund focus.",
        matchTerms: ["dashboard", "refund", "review", "operators", "risk"],
        targetPaths: ["apps/dashboard/refunds/page.tsx"],
        expectedFocusRefs: ["prose.principle:dashboard-refund-focus"],
        lesson:
          "Prompt intent should preserve child package provenance when a nested fingerprint owns the target surface.",
      },
    ],
    driftSamples: [],
  },
  {
    id: "shared-component-review",
    title: "Shared Component Review",
    kicker: "Review",
    kind: "review",
    tags: ["diff", "shared ui", "broad context"],
    description:
      "A shared button diff stays broad instead of inventing a local product scope.",
    lesson:
      "Shared UI changes should not pretend to be a path-specific product surface when the fingerprint has no matching local scope.",
    sandbox: "single",
    defaultTargetPaths: ["shared/ui/Button.tsx"],
    defaultDiffPaths: ["shared/ui/Button.tsx"],
    promptSamples: [
      {
        id: "shared-button-review",
        title: "Shared button review",
        prompt:
          "Review a shared Button diff for design-language drift without claiming it belongs to refund settings.",
        intent:
          "Diff-backed shared component review that should stay broad and advisory.",
        matchTerms: ["review", "shared", "button", "diff", "drift"],
        targetPaths: ["shared/ui/Button.tsx"],
        diffPaths: ["shared/ui/Button.tsx"],
        expectedFocusRefs: [],
        lesson:
          "Prompt Lab should route shared review work through the diff while keeping the context global.",
      },
    ],
    driftSamples: [
      {
        id: "shared-button-advisory",
        title: "Shared button advisory review",
        intent:
          "A shared Button change is broad and should be reviewed advisory-first without product-scope invention.",
        diffText: diffWithAddedLinesForPaths([
          {
            path: "shared/ui/Button.tsx",
            lines: [
              "export const density = 'compact-shared';",
              "export const labelSpacing = 'balanced';",
            ],
          },
        ]),
        expectedSignal: "advisory-only",
        expectedFocusRefs: [],
        lesson:
          "Shared component drift can deserve review even when no active product-scope check applies.",
      },
    ],
  },
  {
    id: "multi-stack-diff",
    title: "Multi-Stack Diff",
    kicker: "Review",
    kind: "review",
    tags: ["diff", "multi-stack"],
    description:
      "One diff touches dashboard refunds and portal payments, producing separate selected contexts.",
    lesson:
      "A single review packet can carry more than one compact context when changed files route to different fingerprint stacks.",
    sandbox: "multi",
    defaultTargetPaths: [
      "apps/dashboard/refunds/page.tsx",
      "apps/portal/payments/page.tsx",
    ],
    defaultDiffPaths: [
      "apps/dashboard/refunds/page.tsx",
      "apps/portal/payments/page.tsx",
    ],
    promptSamples: [
      {
        id: "two-surface-review",
        title: "Two-surface review",
        prompt:
          "Review one diff that updates dashboard refunds and portal payments, preserving each product surface's local guidance.",
        intent:
          "Multi-stack review where one prompt should produce separate selected contexts.",
        matchTerms: ["dashboard", "portal", "payments", "refunds", "diff"],
        targetPaths: [
          "apps/dashboard/refunds/page.tsx",
          "apps/portal/payments/page.tsx",
        ],
        diffPaths: [
          "apps/dashboard/refunds/page.tsx",
          "apps/portal/payments/page.tsx",
        ],
        expectedFocusRefs: [
          "prose.principle:dashboard-refund-focus",
          "prose.principle:portal-payment-clarity",
        ],
        lesson:
          "A prompt can stay singular while the handoff splits into multiple stack-specific contexts.",
      },
    ],
    driftSamples: [
      {
        id: "two-stack-advisory-review",
        title: "Two-stack advisory review",
        intent:
          "One generated diff touches dashboard refunds and portal payments, so Drift Desk should split context by stack.",
        diffText: diffWithAddedLinesForPaths([
          {
            path: "apps/dashboard/refunds/page.tsx",
            lines: [
              "export const dashboardReviewColumn = 'stable-right-column';",
            ],
          },
          {
            path: "apps/portal/payments/page.tsx",
            lines: ["export const paymentImpactCopy = 'Settles tomorrow';"],
          },
        ]),
        expectedSignal: "multi-stack",
        expectedFocusRefs: [
          "prose.principle:dashboard-refund-focus",
          "prose.principle:portal-payment-clarity",
        ],
        lesson:
          "A single drift review can stay coherent while carrying multiple stack-specific contexts.",
      },
    ],
  },
  {
    id: "malformed-cache",
    title: "Malformed Generated Cache",
    kicker: "Cache",
    kind: "cache",
    tags: ["cache", "canonical layers"],
    description:
      "Generated cache exists but is unreadable; the selected fingerprint context still comes from canonical layers.",
    lesson:
      "Cache is optional source material. It can help explain what exists, but it never becomes canonical fingerprint input.",
    sandbox: "single",
    cache: "malformed",
    defaultTargetPaths: ["apps/refunds/settings/page.tsx"],
    promptSamples: [
      {
        id: "cache-resistant-refund-work",
        title: "Cache-resistant refund work",
        prompt:
          "Use the refund settings fingerprint to revise consequence copy even if generated cache looks broken.",
        intent:
          "Focused refund work that demonstrates cache is optional source material.",
        matchTerms: ["refund", "settings", "cache", "broken", "consequence"],
        targetPaths: ["apps/refunds/settings/page.tsx"],
        expectedFocusRefs: [
          "prose.principle:refund-trust",
          "composition.pattern:refund-disclosure",
        ],
        lesson:
          "A broken generated cache should be visible without changing which canonical refs guide the task.",
      },
    ],
    driftSamples: [
      {
        id: "cache-caveat-refund-review",
        title: "Cache caveat refund review",
        intent:
          "A refund settings diff runs with malformed generated cache, proving cache caveats remain visible but non-canonical.",
        diffText: diffWithAddedLinesForPaths([
          {
            path: "apps/refunds/settings/page.tsx",
            lines: ["export const copy = 'Refund recovery stays visible.';"],
          },
        ]),
        expectedSignal: "cache-caveat",
        expectedFocusRefs: [
          "prose.principle:refund-trust",
          "composition.pattern:refund-disclosure",
        ],
        lesson:
          "Malformed generated cache should be visible in review context without becoming a blocking or canonical signal.",
      },
    ],
  },
  {
    id: "deterministic-emission",
    title: "Deterministic Emission",
    kicker: "Regression",
    kind: "context",
    tags: ["determinism", "repeatability"],
    description:
      "The same sandbox and target path are inspected twice and compared for stable emitted context.",
    lesson:
      "The handoff must be repeatable so scenario output can act as both teaching material and regression signal.",
    sandbox: "single",
    defaultTargetPaths: ["apps/refunds/settings/page.tsx"],
    promptSamples: [
      {
        id: "repeatable-refund-handoff",
        title: "Repeatable refund handoff",
        prompt:
          "Emit the refund settings handoff twice and confirm the selected prompt context is byte-stable.",
        intent:
          "Regression-oriented prompt that should produce deterministic context markdown.",
        matchTerms: ["repeat", "deterministic", "refund", "handoff", "stable"],
        targetPaths: ["apps/refunds/settings/page.tsx"],
        expectedFocusRefs: ["prose.principle:refund-trust"],
        lesson:
          "Prompt Lab output must be stable enough to teach and test the handoff.",
      },
    ],
    driftSamples: [],
    deterministicRepeat: true,
  },
];

export function listScenarioSummaries(): WorkbenchScenarioSummary[] {
  return scenarios.map(toSummary);
}

export function getScenario(id: string): ScenarioDefinition | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}

export function getScenarioDetail(id: string): WorkbenchScenarioDetail | null {
  const scenario = getScenario(id);
  return scenario ? toDetail(scenario) : null;
}

export function toDetail(
  scenario: ScenarioDefinition,
): WorkbenchScenarioDetail {
  return {
    ...toSummary(scenario),
    description: scenario.description,
    promptSamples: scenario.promptSamples,
    driftSamples: scenario.driftSamples,
    repoTree: pathsToTree([
      ...sourceFilesFor(scenario.sandbox),
      ...ghostFilesFor(scenario.sandbox, scenario.cache),
    ]),
    ...(scenario.defaultDiffPaths
      ? { defaultDiffText: diffFor(...scenario.defaultDiffPaths) }
      : {}),
  };
}

function toSummary(scenario: ScenarioDefinition): WorkbenchScenarioSummary {
  return {
    id: scenario.id,
    title: scenario.title,
    kicker: scenario.kicker,
    kind: scenario.kind,
    tags: scenario.tags,
    defaultTargetPaths: scenario.defaultTargetPaths,
    hasDiff: Boolean(scenario.defaultDiffPaths),
    promptSampleCount: scenario.promptSamples.length,
    driftSampleCount: scenario.driftSamples.length,
    fingerprintPackageCount: fingerprintPackageCountFor(scenario.sandbox),
    lesson: scenario.lesson,
  };
}

function fingerprintPackageCountFor(sandbox: SandboxKind): number {
  if (sandbox === "single") return 1;
  if (sandbox === "nested") return 2;
  return 3;
}

function pathsToTree(paths: string[]): WorkbenchTreeNode[] {
  const root = new Map<string, TreeBuilder>();

  for (const path of [...new Set(paths)].sort()) {
    const parts = path.split("/");
    let current = root;
    let currentPath = "";

    for (const [index, part] of parts.entries()) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;
      const existing = current.get(part);
      if (existing) {
        current = existing.children;
        continue;
      }
      const node: WorkbenchTreeNode = {
        path: currentPath,
        name: part,
        kind: isFile ? "file" : "directory",
        ...(isFile ? {} : { children: [] }),
      };
      const builder = { node, children: new Map<string, TreeBuilder>() };
      current.set(part, builder);
      current = builder.children;
    }
  }

  return sortTree([...root.values()].map(buildNode));
}

function sortTree(nodes: WorkbenchTreeNode[]): WorkbenchTreeNode[] {
  return nodes
    .map((node) => ({
      ...node,
      ...(node.children ? { children: sortTree(node.children) } : {}),
    }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function buildNode(builder: TreeBuilder): WorkbenchTreeNode {
  const children = [...builder.children.values()].map(buildNode);
  return {
    ...builder.node,
    ...(children.length > 0 ? { children } : {}),
  };
}
