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
/**
 * An `init` template: a pure description of the seed files a fresh node package
 * starts with. Templates are the extension seam — adding a `marketing` / `voice`
 * / `dashboard` starter later is just registering another entry here; `init`
 * needs no change.
 */
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
    "cliche.median.md",
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
    "Naked skeleton: a brand cover, foundation chapters with open questions, and the cliche floor.",
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
    relativePath: "cliche.median.md",
    content: await loadPayloadFile("median", "cliche.median.md"),
  };
}

const TEMPLATES = new Map<string, GhostInitTemplate>([
  [SKELETON_TEMPLATE.name, SKELETON_TEMPLATE],
]);

/**
 * An init body: a full inhabited ghost package — answered signature
 * dials, materials, refs, and its own checks. Templates are shapes of
 * emptiness awaiting the owner's truths; a body is the same anatomy with a
 * real brand's values plugged in. Bodies keep their own manifest id (e.g.
 * `vessel-light`) so an unadapted install stays honestly labeled — changing
 * the id is step one of adapting the starter, an explicit human act.
 */
export interface GhostInitBody {
  name: string;
  description: string;
  /** Whether the body payload ships its own `checks/` directory. */
  includesChecks: boolean;
  files(): Promise<TemplateFile[]>;
}

const VESSEL_LIGHT_BODY: GhostInitBody = {
  name: "vessel-light",
  description:
    "Vessel's design language at full strength: corpus, tokens, fonts, refs, and checks.",
  includesChecks: true,
  async files() {
    const payload = await loadPackedPayload("vessel-light");
    const manifest = payload.find(
      (file) => file.relativePath === "manifest.yml",
    );
    if (manifest && typeof manifest.content === "string") {
      manifest.content = manifest.content.replace(
        /^schema:\s*ghost\.fingerprint-package\/v1\s*$/m,
        `schema: ${GHOST_PACKAGE_SCHEMA}`,
      );
    }
    payload.sort((a, b) => {
      const ao = BODY_FILE_ORDER.get(a.relativePath);
      const bo = BODY_FILE_ORDER.get(b.relativePath);
      return (
        (ao ?? Number.MAX_SAFE_INTEGER) - (bo ?? Number.MAX_SAFE_INTEGER) ||
        a.relativePath.localeCompare(b.relativePath)
      );
    });
    // The payload carries its own manifest.yml (id stays `vessel-light`);
    // only the gitignore is generated locally.
    return [gitignoreFile(), ...payload];
  },
};

/** Listing order for the body scaffold output: anchors first, then the rest. */
const BODY_FILE_ORDER = new Map<string, number>(
  ["manifest.yml", "glossary.md", "index.md"].map((path, i) => [path, i]),
);

const BODIES = new Map<string, GhostInitBody>([
  [VESSEL_LIGHT_BODY.name, VESSEL_LIGHT_BODY],
]);

/** Look up a registered init body by name. */
export function getInitBody(name: string): GhostInitBody | undefined {
  return BODIES.get(name);
}

export function listInitBodies(): string[] {
  return [...BODIES.keys()];
}

export const DEFAULT_TEMPLATE_NAME = SKELETON_TEMPLATE.name;

/** Look up a registered init template by name. */
export function getInitTemplate(name: string): GhostInitTemplate | undefined {
  return TEMPLATES.get(name);
}

export function listInitTemplates(): string[] {
  return [...TEMPLATES.keys()];
}
