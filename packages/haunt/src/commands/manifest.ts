/**
 * A self-describing manifest of Haunt's commands and flags. Static and
 * hand-maintained alongside the CLI (the surface is small); emitting it as JSON
 * lets tools and docs discover the CLI without parsing help text.
 */

export interface ManifestFlag {
  name: string;
  description: string;
  takesValue: boolean;
}

export interface ManifestCommand {
  name: string;
  description: string;
  flags: ManifestFlag[];
}

export interface HauntManifest {
  cli: "haunt";
  version: string;
  commands: ManifestCommand[];
}

const GHOST_DIR_FLAG: ManifestFlag = {
  name: "--ghost-dir",
  description:
    "The .ghost/ fingerprint package directory (default: .ghost, or GHOST_PACKAGE_DIR)",
  takesValue: true,
};

export function buildHauntManifest(version: string): HauntManifest {
  return {
    cli: "haunt",
    version,
    commands: [
      {
        name: "init",
        description:
          "Scaffold the .ghost/haunt/ package: an inventory example + a ghost.check/v1 check example (and the .ghost/ fingerprint when missing).",
        flags: [
          GHOST_DIR_FLAG,
          {
            name: "--force",
            description: "Overwrite an existing .ghost/haunt/ package",
            takesValue: false,
          },
        ],
      },
      {
        name: "validate",
        description:
          "Validate the .ghost/haunt/ package: shape + check references (local + fingerprint).",
        flags: [GHOST_DIR_FLAG],
      },
      {
        name: "review",
        description:
          "Emit an advisory review packet from the package, the .ghost/ fingerprint, and a git diff.",
        flags: [
          GHOST_DIR_FLAG,
          {
            name: "--base",
            description: "Git ref to diff against (default: HEAD)",
            takesValue: true,
          },
          {
            name: "--diff",
            description: "Diff file to embed; use '=-' for stdin",
            takesValue: true,
          },
          {
            name: "--json",
            description: "Emit the raw JSON packet",
            takesValue: false,
          },
        ],
      },
      {
        name: "integrity",
        description:
          "Emit an advisory integrity packet: the whole inventory audited for sprawl against the .ghost/ fingerprint.",
        flags: [
          GHOST_DIR_FLAG,
          {
            name: "--json",
            description: "Emit the raw JSON packet",
            takesValue: false,
          },
        ],
      },
      {
        name: "skill install",
        description: "Install the Haunt skill bundle.",
        flags: [
          {
            name: "--dest",
            description: "Install destination",
            takesValue: true,
          },
          {
            name: "--agent",
            description: "Agent: claude, cursor, codex, opencode",
            takesValue: true,
          },
          {
            name: "--force",
            description: "Overwrite an existing installed skill",
            takesValue: false,
          },
        ],
      },
      {
        name: "manifest",
        description: "Emit this self-describing command/flag manifest as JSON.",
        flags: [],
      },
    ],
  };
}
