import type { ContextEntrypoint, FingerprintGraphNode } from "./entrypoint.js";

export function formatContextEntrypointMarkdown(
  entrypoint: ContextEntrypoint,
  options: { heading?: string; includeIntro?: boolean } = {},
): string {
  const heading = options.heading ?? "# Agent Handoff";
  const parts = [heading];
  if (options.includeIntro ?? true) {
    parts.push(
      `You are working inside the **${entrypoint.name}** product-surface composition as captured by Ghost. This is compact selected context from the fingerprint, not a replacement for the full files beside it.`,
    );
  }
  parts.push(formatIdentity(entrypoint));
  parts.push(formatMatch(entrypoint));
  parts.push(formatActionContract(entrypoint));
  parts.push(formatReadFirst(entrypoint));
  parts.push(formatValidation(entrypoint));
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
  pushJoined(lines, "Fingerprint stack", entrypoint.match.sourceStack, {
    code: true,
  });
  for (const reason of entrypoint.match.reasons) {
    lines.push(`- Why: ${reason}`);
  }
  return lines.join("\n");
}

function formatActionContract(entrypoint: ContextEntrypoint): string {
  const lines = ["## Task Contract"];
  appendStringGroup(lines, "Preserve", entrypoint.actionContract.preserve);
  appendReadGroup(lines, "Inspect", entrypoint.actionContract.inspect);
  appendStringGroup(lines, "Avoid", entrypoint.actionContract.avoid);
  appendStringGroup(lines, "Validate", entrypoint.actionContract.validate);
  return lines.join("\n");
}

function formatReadFirst(entrypoint: ContextEntrypoint): string {
  const lines = ["## Read First"];
  appendNodeGroup(lines, "Intent Anchors", entrypoint.selected.intent);
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
- Start with the selected refs above, then read suggested files when the task is broader than this context.
- Generate from intent + inventory + composition; use building blocks only when they support selected intent and patterns.
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

function appendStringGroup(
  lines: string[],
  title: string,
  values: string[],
): void {
  lines.push(`### ${title}`);
  if (values.length === 0) {
    lines.push("- None selected.");
    return;
  }
  for (const value of values) {
    lines.push(`- ${value}`);
  }
}

function appendReadGroup(
  lines: string[],
  title: string,
  reads: Array<{ path: string; reason: string }>,
): void {
  lines.push(`### ${title}`);
  if (reads.length === 0) {
    lines.push("- None selected.");
    return;
  }
  for (const read of reads) {
    lines.push(`- \`${read.path}\` - ${read.reason}`);
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
