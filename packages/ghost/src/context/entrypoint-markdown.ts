import type { ContextEntrypoint, FingerprintGraphNode } from "./entrypoint.js";
import type { PackageInventory } from "./package-context.js";

export function formatContextEntrypointMarkdown(
  entrypoint: ContextEntrypoint,
  options: { heading?: string; includeIntro?: boolean } = {},
): string {
  const heading = options.heading ?? "# Agent Handoff";
  const parts = [heading];
  if (options.includeIntro ?? true) {
    parts.push(
      `You are working inside the **${entrypoint.name}** product-surface composition as captured by Ghost. This is a compact entrypoint into the fingerprint, not a replacement for the full files beside it.`,
    );
  }
  parts.push(formatIdentity(entrypoint));
  parts.push(formatMatch(entrypoint));
  parts.push(formatReadFirst(entrypoint));
  parts.push(formatValidation(entrypoint));
  parts.push(formatGeneratedCache(entrypoint.generatedCache));
  parts.push(formatSuggestedReads(entrypoint));
  parts.push(formatOmissions(entrypoint));
  parts.push(formatUseThisContext());
  return `${parts.filter(Boolean).join("\n\n").trim()}\n`;
}

function formatIdentity(entrypoint: ContextEntrypoint): string {
  const lines = ["## Identity Capsule"];
  lines.push(`- Product: ${entrypoint.identity.product}`);
  pushIdentityValues(lines, "Audience", entrypoint.identity.audience);
  pushIdentityValues(lines, "Goals", entrypoint.identity.goals);
  pushIdentityValues(lines, "Anti-goals", entrypoint.identity.antiGoals);
  pushIdentityValues(lines, "Tradeoffs", entrypoint.identity.tradeoffs);
  pushJoined(lines, "Tone", entrypoint.identity.tone);
  return lines.join("\n");
}

function formatMatch(entrypoint: ContextEntrypoint): string {
  const lines = ["## Context Match"];
  lines.push(
    `- Status: ${
      entrypoint.match.status === "path-match"
        ? "path matched"
        : "global fallback"
    }`,
  );
  pushJoined(lines, "Requested paths", entrypoint.match.requestedPaths, {
    code: true,
  });
  pushJoined(lines, "Matched scopes", entrypoint.match.matchedScopes, {
    code: true,
  });
  pushJoined(
    lines,
    "Matched surface types",
    entrypoint.match.matchedSurfaceTypes,
    { code: true },
  );
  pushJoined(lines, "Fingerprint layers", entrypoint.match.sourceLayers, {
    code: true,
  });
  for (const reason of entrypoint.match.reasons) {
    lines.push(`- Why: ${reason}`);
  }
  return lines.join("\n");
}

function formatReadFirst(entrypoint: ContextEntrypoint): string {
  const lines = ["## Read First"];
  appendNodeGroup(lines, "Prose Anchors", entrypoint.selected.prose);
  appendNodeGroup(
    lines,
    "Composition Anchors",
    entrypoint.selected.composition,
  );
  appendNodeGroup(lines, "Exemplars", entrypoint.selected.exemplars);
  return lines.join("\n");
}

function formatValidation(entrypoint: ContextEntrypoint): string {
  const lines = ["## Validation Notes"];
  if (entrypoint.selected.checks.length === 0) {
    lines.push(
      "- No selected active checks. Proposed or disabled checks are not blocking validation.",
    );
    return lines.join("\n");
  }
  for (const node of entrypoint.selected.checks) {
    lines.push(`- \`${node.ref}\` - ${node.summary}`);
    for (const detail of node.details.slice(0, 2)) {
      lines.push(`  - ${detail}`);
    }
  }
  return lines.join("\n");
}

function formatGeneratedCache(inventory: PackageInventory): string {
  const lines = ["## Generated Cache"];
  lines.push(
    "- Generated cache is optional source material, not canonical fingerprint context.",
  );
  if (inventory.state === "missing") {
    lines.push("- State: missing.");
    return lines.join("\n");
  }
  if (inventory.state === "unreadable") {
    lines.push(
      `- State: present at \`${inventory.path}\`, but it could not be read: ${inventory.error}.`,
    );
    return lines.join("\n");
  }
  lines.push(`- State: present at \`${inventory.path}\`.`);
  pushJoined(lines, "Platform hints", inventory.summary.platform_hints, {
    code: true,
  });
  pushJoined(lines, "Build hints", inventory.summary.build_system_hints, {
    code: true,
  });
  pushJoined(lines, "Package manifests", inventory.summary.package_manifests, {
    code: true,
  });
  pushJoined(
    lines,
    "Config candidates",
    inventory.summary.candidate_config_files,
    {
      code: true,
    },
  );
  return lines.join("\n");
}

function formatSuggestedReads(entrypoint: ContextEntrypoint): string {
  const lines = ["## Suggested Reads"];
  for (const read of entrypoint.suggestedReads) {
    lines.push(`- \`${read.path}\` - ${read.reason}`);
  }
  return lines.join("\n");
}

function formatOmissions(entrypoint: ContextEntrypoint): string {
  const lines = ["## Omissions"];
  for (const omission of entrypoint.omissions) {
    if (omission.omitted === 0) {
      lines.push(`- ${omission.label}: none omitted.`);
    } else {
      lines.push(
        `- ${omission.label}: ${omission.omitted} omitted; inspect \`${omission.source}\` if the task widens.`,
      );
    }
  }
  return lines.join("\n");
}

function formatUseThisContext(): string {
  return `## Use This Context
- Start with the selected refs above, then read suggested files when the task is broader than this entrypoint.
- Generate from prose + inventory + composition; use building blocks only when they support selected intent and patterns.
- Treat checks as validation; only active checks are blocking.
- When selected context is sparse or globally matched, label reasoning as provisional and non-Ghost-backed.
- Treat fingerprint edits as ordinary Git-reviewed edits to \`fingerprint/\` files and optional local \`config.yml\` when present.`;
}

function appendNodeGroup(
  lines: string[],
  title: string,
  nodes: FingerprintGraphNode[],
): void {
  lines.push(`### ${title}`);
  if (nodes.length === 0) {
    lines.push("- None selected.");
    return;
  }
  for (const node of nodes) {
    const path =
      node.kind === "exemplar" && node.appliesTo.paths[0]
        ? ` - \`${node.appliesTo.paths[0]}\``
        : "";
    lines.push(`- \`${node.ref}\`${path} - ${node.summary}`);
    for (const detail of node.details.slice(0, 2)) {
      lines.push(`  - ${detail}`);
    }
  }
}

function pushJoined(
  lines: string[],
  label: string,
  values: string[] | undefined,
  options: { code?: boolean } = {},
): void {
  if (!values?.length) return;
  const formatted = values
    .map((value) => (options.code ? `\`${value}\`` : value))
    .join(", ");
  lines.push(`- ${label}: ${formatted}`);
}

function pushIdentityValues(
  lines: string[],
  label: string,
  values: string[] | undefined,
): void {
  if (!values?.length) return;
  if (!shouldUseMultilineIdentity(values)) {
    pushJoined(lines, label, values);
    return;
  }
  lines.push(`- ${label}:`);
  for (const value of values) {
    lines.push(`  - ${value}`);
  }
}

function shouldUseMultilineIdentity(values: string[]): boolean {
  if (values.length < 2) return false;
  const joined = values.join(", ");
  return (
    values.some((value) => /[.!?]$/.test(value.trim())) || joined.length > 100
  );
}
