import type {
  WorkbenchCheckReport,
  WorkbenchContextSection,
  WorkbenchEntrypoint,
  WorkbenchGraphNode,
  WorkbenchPromptInterpretation,
  WorkbenchTraceEdge,
  WorkbenchTraceGraph,
  WorkbenchTraceLane,
  WorkbenchTraceNode,
} from "../shared";

const BASE_LANES: WorkbenchTraceLane[] = [
  {
    id: "input",
    title: "Input",
    summary: "The prompt, target path, or diff that starts the route.",
  },
  {
    id: "files",
    title: "Files",
    summary: "The changed or requested paths Ghost uses for narrowing.",
  },
  {
    id: "package",
    title: "Package",
    summary: "The resolved fingerprint package and source layer stack.",
  },
  {
    id: "scope",
    title: "Scope",
    summary: "The matched surface scope or provisional global fallback.",
  },
  {
    id: "refs",
    title: "Selected Refs",
    summary: "The prose, composition, exemplar, and check refs sent forward.",
  },
  {
    id: "omissions",
    title: "Omitted",
    summary: "Context Ghost intentionally leaves out of the handoff.",
  },
  {
    id: "handoff",
    title: "Handoff",
    summary: "The compact packet an agent would receive.",
  },
  {
    id: "review",
    title: "Review",
    summary: "Deterministic or advisory drift signal after the handoff.",
  },
];

export function buildContextTraceGraph(input: {
  id: string;
  title: string;
  packageDir?: string;
  changedFiles: string[];
  entrypoint: WorkbenchEntrypoint;
  markdown: string;
}): WorkbenchTraceGraph {
  const nodes: WorkbenchTraceNode[] = [];
  const edges: WorkbenchTraceEdge[] = [];
  let order = 0;
  const addNode = (
    node: Omit<WorkbenchTraceNode, "order" | "meta"> & {
      meta?: WorkbenchTraceNode["meta"];
    },
  ) => {
    nodes.push({ ...node, order: order++, meta: node.meta ?? [] });
    return node.id;
  };
  const addEdge = (
    from: string,
    to: string,
    state: WorkbenchTraceEdge["state"],
    label: string,
  ) => {
    edges.push({ id: `${from}->${to}:${state}`, from, to, state, label });
  };

  const entrypoint = input.entrypoint;
  const targetPaths = entrypoint.match.requestedPaths.length
    ? entrypoint.match.requestedPaths
    : input.changedFiles;
  const inputNodeId = addNode({
    id: nodeId(input.id, "input", "target"),
    kind: "input",
    lane: "input",
    title: input.changedFiles.length ? "Diff or target paths" : "Target paths",
    summary:
      targetPaths.length > 0
        ? `${targetPaths.length} path${targetPaths.length === 1 ? "" : "s"} started this route.`
        : "No explicit path was supplied.",
    detail:
      targetPaths.length > 0
        ? `Ghost starts from ${targetPaths.join(", ")}.`
        : "Ghost falls back to the package-level fingerprint because no path-specific target exists.",
    state: "default",
    meta: targetPaths.map((path) => ({ label: "Path", value: path })),
  });

  const fileNodeIds = (targetPaths.length ? targetPaths : ["."]).map((path) => {
    const id = nodeId(input.id, "file", path);
    addNode({
      id,
      kind: "changed-file",
      lane: "files",
      title: displayLeaf(path),
      summary: path,
      detail: `This path is part of the inspected target set.`,
      state: "default",
      path,
      meta: [{ label: "Path", value: path }],
    });
    addEdge(inputNodeId, id, "matched", "routes through");
    return id;
  });

  const packageNodeId = addNode({
    id: nodeId(input.id, "package", input.packageDir ?? "."),
    kind: "package",
    lane: "package",
    title: input.packageDir ?? ".",
    summary: `${entrypoint.match.sourceLayers.length} source layer${entrypoint.match.sourceLayers.length === 1 ? "" : "s"}`,
    detail:
      entrypoint.match.sourceLayers.length > 0
        ? `Resolved source layers: ${entrypoint.match.sourceLayers.join(", ")}.`
        : "Resolved the package-level fingerprint context.",
    state: "selected",
    path: input.packageDir,
    meta: [
      { label: "Package", value: input.packageDir ?? "." },
      {
        label: "Source layers",
        value: entrypoint.match.sourceLayers.join(", ") || "default package",
      },
    ],
  });
  for (const fileNodeId of fileNodeIds) {
    addEdge(fileNodeId, packageNodeId, "matched", "resolved package");
  }

  const scopeNodeIds =
    entrypoint.match.matchedScopes.length > 0
      ? entrypoint.match.matchedScopes.map((scope) => {
          const id = nodeId(input.id, "scope", scope);
          addNode({
            id,
            kind: "scope",
            lane: "scope",
            title: scope,
            summary: "Matched fingerprint scope",
            detail: `The target path overlaps the ${scope} scope, so Ghost can narrow with confidence.`,
            state: "selected",
            meta: [
              { label: "Scope", value: scope },
              {
                label: "Surfaces",
                value:
                  entrypoint.match.matchedSurfaceTypes.join(", ") ||
                  "not declared",
              },
            ],
          });
          addEdge(packageNodeId, id, "matched", "matched scope");
          return id;
        })
      : [
          addNode({
            id: nodeId(input.id, "scope", "global-fallback"),
            kind: "scope",
            lane: "scope",
            title: "Global fallback",
            summary: "No scope matched",
            detail:
              "Ghost did not find a path-specific scope, so this handoff is broader and should be treated as provisional.",
            state: "fallback",
            meta: entrypoint.match.reasons.map((reason) => ({
              label: "Reason",
              value: reason,
            })),
          }),
        ];
  if (entrypoint.match.matchedScopes.length === 0) {
    addEdge(packageNodeId, scopeNodeIds[0], "advisory", "fallback");
  }

  const selectedNodes = selectedTraceNodes(entrypoint);
  const selectedNodeIds = selectedNodes.map(({ group, node }) => {
    const id = nodeId(input.id, "ref", node.ref);
    addNode({
      id,
      kind: group,
      lane: "refs",
      title: node.ref,
      summary: node.summary,
      detail: detailForGraphNode(group, node),
      state: "selected",
      ref: node.ref,
      path: node.appliesTo.paths[0],
      source: sourceForGroup(group),
      meta: metaForGraphNode(node),
    });
    for (const scopeNodeId of scopeNodeIds) {
      addEdge(scopeNodeId, id, "selected", `selected ${group}`);
    }
    return id;
  });

  for (const omission of entrypoint.omissions.filter(
    (item) => item.omitted > 0,
  )) {
    const id = nodeId(input.id, "omission", omission.label);
    addNode({
      id,
      kind: "omission",
      lane: "omissions",
      title: omission.label,
      summary: `${omission.omitted} omitted`,
      detail: `${omission.omitted} item${omission.omitted === 1 ? "" : "s"} from ${omission.source} were not included in this compact handoff.`,
      state: "omitted",
      source: omission.source,
      meta: [
        { label: "Omitted", value: String(omission.omitted) },
        { label: "Source", value: omission.source },
      ],
    });
    for (const scopeNodeId of scopeNodeIds) {
      addEdge(scopeNodeId, id, "omitted", "left out");
    }
  }

  const handoffNodeId = addNode({
    id: nodeId(input.id, "handoff", "agent"),
    kind: "handoff",
    lane: "handoff",
    title: "Agent handoff",
    summary: `${selectedNodes.length} selected ref${selectedNodes.length === 1 ? "" : "s"}`,
    detail:
      input.markdown.trim().split("\n").slice(0, 8).join("\n") ||
      "No handoff markdown was generated.",
    state: "selected",
    meta: [
      {
        label: "Suggested reads",
        value: String(entrypoint.suggestedReads.length),
      },
      { label: "Markdown bytes", value: String(input.markdown.length) },
    ],
  });
  const handoffSources = selectedNodeIds.length
    ? selectedNodeIds
    : scopeNodeIds;
  for (const sourceId of handoffSources) {
    addEdge(sourceId, handoffNodeId, "selected", "sent to handoff");
  }

  const defaultSelectedNodeId = scopeNodeIds[0] ?? packageNodeId;
  return {
    id: input.id,
    title: input.title,
    summary:
      entrypoint.match.status === "path-match"
        ? "Ghost found a scoped route and selected one-hop fingerprint context."
        : "Ghost could not match a scope, so it built a broader fallback handoff.",
    defaultSelectedNodeId,
    lanes: BASE_LANES,
    nodes,
    edges,
    annotations: [
      {
        nodeId: defaultSelectedNodeId,
        text:
          entrypoint.match.status === "path-match"
            ? "This is the narrowing decision."
            : "This fallback is useful, but less authoritative.",
      },
      {
        nodeId: handoffNodeId,
        text: "This is what an agent receives first.",
      },
    ],
  };
}

export function prependPromptTrace(
  trace: WorkbenchTraceGraph,
  interpretation: WorkbenchPromptInterpretation,
): WorkbenchTraceGraph {
  const targetNode = trace.nodes.find((node) => node.kind === "input");
  if (!targetNode) return trace;
  const promptNode: WorkbenchTraceNode = {
    id: nodeId(trace.id, "prompt", interpretation.source),
    kind: "input",
    lane: "input",
    order: -1,
    title: "Prompt interpretation",
    summary: interpretation.status,
    detail: interpretation.intent,
    state: interpretation.status === "fallback" ? "fallback" : "selected",
    meta: [
      { label: "Source", value: interpretation.source },
      {
        label: "Matched terms",
        value: interpretation.matchedTerms.join(", ") || "none",
      },
      {
        label: "Expected refs",
        value: interpretation.expectedFocusRefs.join(", ") || "none",
      },
    ],
  };
  return {
    ...trace,
    summary: `Prompt Lab interpreted the request, then ${trace.summary}`,
    nodes: [promptNode, ...trace.nodes],
    edges: [
      {
        id: `${promptNode.id}->${targetNode.id}:matched`,
        from: promptNode.id,
        to: targetNode.id,
        state: "matched",
        label: "interpreted target",
      },
      ...trace.edges,
    ],
    annotations: [
      {
        nodeId: promptNode.id,
        text: "Prompt Lab adds this deterministic interpretation before routing.",
      },
      ...trace.annotations,
    ],
  };
}

export function appendDriftTrace(
  trace: WorkbenchTraceGraph,
  checkReport: WorkbenchCheckReport,
): WorkbenchTraceGraph {
  const handoffNode = trace.nodes.find((node) => node.kind === "handoff");
  if (!handoffNode) return trace;
  const blockingCheckIds = new Set(
    checkReport.findings.map((finding) => `check:${finding.check_id}`),
  );
  const reviewNode: WorkbenchTraceNode = {
    id: nodeId(trace.id, "review", checkReport.result),
    kind: "review-signal",
    lane: "review",
    order: trace.nodes.length,
    title:
      checkReport.result === "fail"
        ? "Blocking drift signal"
        : "Deterministic pass",
    summary:
      checkReport.result === "fail"
        ? `${checkReport.findings.length} active finding${checkReport.findings.length === 1 ? "" : "s"}`
        : "No active deterministic failures",
    detail:
      checkReport.result === "fail"
        ? checkReport.findings
            .map(
              (finding) => `${finding.path}:${finding.line} ${finding.title}`,
            )
            .join("\n")
        : "The diff passed active deterministic checks. Advisory review may still add human review.",
    state: checkReport.result === "fail" ? "blocking" : "selected",
    meta: [
      { label: "Result", value: checkReport.result },
      { label: "Routed files", value: String(checkReport.routed_files.length) },
      { label: "Findings", value: String(checkReport.findings.length) },
    ],
  };
  const nodes = trace.nodes.map((node) =>
    node.kind === "check" && node.ref && blockingCheckIds.has(node.ref)
      ? {
          ...node,
          state: "blocking" as const,
          meta: [...node.meta, { label: "Active finding", value: "blocking" }],
        }
      : node,
  );
  const checkEdges = nodes
    .filter((node) => node.kind === "check" && node.state === "blocking")
    .map((node) => ({
      id: `${node.id}->${reviewNode.id}:blocking`,
      from: node.id,
      to: reviewNode.id,
      state: "blocking" as const,
      label: "failed check",
    }));
  return {
    ...trace,
    summary:
      checkReport.result === "fail"
        ? `${trace.summary} Drift review found active deterministic failures.`
        : `${trace.summary} Drift review found no active deterministic failures.`,
    nodes: [...nodes, reviewNode],
    edges: [
      ...trace.edges,
      {
        id: `${handoffNode.id}->${reviewNode.id}:${checkReport.result}`,
        from: handoffNode.id,
        to: reviewNode.id,
        state: checkReport.result === "fail" ? "blocking" : "advisory",
        label:
          checkReport.result === "fail"
            ? "blocking check result"
            : "deterministic check result",
      },
      ...checkEdges,
    ],
    annotations: [
      ...trace.annotations,
      {
        nodeId: reviewNode.id,
        text:
          checkReport.result === "fail"
            ? "Active deterministic checks are the blocking signal."
            : "Passing checks clears the gate, but does not prove the design is perfect.",
      },
    ],
  };
}

export function updateContextTrace(
  context: WorkbenchContextSection,
  trace: WorkbenchTraceGraph,
): WorkbenchContextSection {
  return { ...context, trace };
}

function selectedTraceNodes(entrypoint: WorkbenchEntrypoint): Array<{
  group: "prose" | "composition" | "exemplar" | "check";
  node: WorkbenchGraphNode;
}> {
  return [
    ...entrypoint.selected.prose.map((node) => ({
      group: "prose" as const,
      node,
    })),
    ...entrypoint.selected.composition.map((node) => ({
      group: "composition" as const,
      node,
    })),
    ...entrypoint.selected.exemplars.map((node) => ({
      group: "exemplar" as const,
      node,
    })),
    ...entrypoint.selected.checks.map((node) => ({
      group: "check" as const,
      node,
    })),
  ];
}

function detailForGraphNode(
  group: "prose" | "composition" | "exemplar" | "check",
  node: WorkbenchGraphNode,
): string {
  const details = node.details.length ? `\n\n${node.details.join("\n")}` : "";
  return `${node.summary}${details}\n\nSelected as ${group} context.`;
}

function metaForGraphNode(
  node: WorkbenchGraphNode,
): WorkbenchTraceNode["meta"] {
  return [
    { label: "Kind", value: node.kind },
    {
      label: "Paths",
      value: node.appliesTo.paths.join(", ") || "not path-bound",
    },
    {
      label: "Scopes",
      value: node.appliesTo.scopes.join(", ") || "not scope-bound",
    },
    {
      label: "Surfaces",
      value: node.appliesTo.surfaceTypes.join(", ") || "not declared",
    },
  ];
}

function sourceForGroup(
  group: "prose" | "composition" | "exemplar" | "check",
): string {
  if (group === "composition") return "fingerprint/composition.yml";
  if (group === "exemplar") return "fingerprint/inventory.yml";
  if (group === "check") return "fingerprint/enforcement/checks.yml";
  return "fingerprint/prose.yml";
}

function nodeId(prefix: string, kind: string, value: string): string {
  return `${prefix}:${kind}:${value.replace(/[^a-zA-Z0-9:_-]+/g, "-")}`;
}

function displayLeaf(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.at(-1) ?? path;
}
