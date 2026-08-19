import {
  type GhostCatalog,
  parseGuidanceRef,
  sliceNodeSection,
} from "#ghost-core";
import type { LoadedCheck } from "./check-files.js";

export type CheckReferenceLintRule =
  | "check-reference-malformed"
  | "check-reference-unresolved"
  | "check-reference-heading-missing";

export interface CheckReferenceLintIssue {
  rule: CheckReferenceLintRule;
  checkId: string;
  file: string;
  reference: string;
  message: string;
}

export function lintCheckReferences(
  catalog: GhostCatalog,
  checks: ReadonlyMap<string, LoadedCheck>,
): CheckReferenceLintIssue[] {
  const issues: CheckReferenceLintIssue[] = [];

  for (const check of checks.values()) {
    for (const raw of check.doc.frontmatter.references) {
      const parsed = parseGuidanceRef(raw);
      if (parsed === null) {
        issues.push({
          rule: "check-reference-malformed",
          checkId: check.id,
          file: `checks/${check.id}.md`,
          reference: raw,
          message: "is not a node id with optional `> Heading` anchor",
        });
        continue;
      }

      const node = catalog.nodes.get(parsed.nodeId);
      if (node === undefined) {
        issues.push({
          rule: "check-reference-unresolved",
          checkId: check.id,
          file: `checks/${check.id}.md`,
          reference: raw,
          message: "does not resolve to a ghost package node",
        });
        continue;
      }

      if (
        parsed.heading !== undefined &&
        sliceNodeSection(node.body, parsed.heading) === null
      ) {
        issues.push({
          rule: "check-reference-heading-missing",
          checkId: check.id,
          file: `checks/${check.id}.md`,
          reference: raw,
          message: "names a heading that was not found",
        });
      }
    }
  }

  return issues;
}
