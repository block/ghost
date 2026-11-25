import { GHOST_PACKAGE_SCHEMA } from "#ghost-core";
import {
  GHOST_EVENTS_FILENAME,
  LEGACY_PULL_HISTORY_FILENAME,
} from "./constants.js";
import { loadPackedPayload, loadPayloadFile } from "./packed-payloads.js";
/**
 * A single seed file an `init` template writes, relative to the package dir.
 */
export interface TemplateFile {
  /** Path relative to the package directory (e.g. "principle.voice.md"). */
  relativePath: string;
  content: string | Uint8Array;
}
/** The seed files written by the default `ghost init` scaffold. */
export interface GhostInitTemplate {
  name: string;
  description: string;
  files(): TemplateFile[] | Promise<TemplateFile[]>;
}
function manifestFile(cover?: string): TemplateFile {
  return {
    relativePath: "manifest.yml",
    content: `schema: ${GHOST_PACKAGE_SCHEMA}\nid: local\n${cover ? `cover: ${cover}\n` : ""}`,
  };
}

/**
 * Keep events tapes out of version control: they are disposable
 * per-machine signals for authors iterating on the package, never canonical
 * state.
 */
function gitignoreFile(): TemplateFile {
  return {
    relativePath: ".gitignore",
    content: `${GHOST_EVENTS_FILENAME}\n${LEGACY_PULL_HISTORY_FILENAME}\n`,
  };
}

const SKELETON_FILE_ORDER = new Map(
  [
    "glossary.md",
    "brand.md",
    "standard.model-defaults.md",
    "foundation.composition.md",
    "foundation.color.md",
    "foundation.type.md",
    "foundation.controls.md",
    "foundation.layout.md",
    "foundation.motion.md",
    "foundation.voice.md",
    "context.conversation.md",
  ].map((path, index) => [path, index]),
);

const SKELETON_TEMPLATE: GhostInitTemplate = {
  name: "skeleton",
  description:
    "Naked skeleton: a brand cover, foundation chapters with open questions, and the shared model-defaults floor.",
  async files() {
    const skeletonFiles = [
      ...(await loadPackedPayload("skeleton")),
      await medianTemplateFile(),
    ];
    skeletonFiles.sort(
      (a, b) =>
        (SKELETON_FILE_ORDER.get(a.relativePath) ?? Number.MAX_SAFE_INTEGER) -
          (SKELETON_FILE_ORDER.get(b.relativePath) ??
            Number.MAX_SAFE_INTEGER) ||
        a.relativePath.localeCompare(b.relativePath),
    );
    return [manifestFile("brand"), gitignoreFile(), ...skeletonFiles];
  },
};

async function medianTemplateFile(): Promise<TemplateFile> {
  return {
    relativePath: "standard.model-defaults.md",
    content: await loadPayloadFile("median", "standard.model-defaults.md"),
  };
}

export function getDefaultInitTemplate(): GhostInitTemplate {
  return SKELETON_TEMPLATE;
}
