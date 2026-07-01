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

const PACKAGE_FLAG: ManifestFlag = {
  name: "--package",
  description: "The .haunt/ package directory (default: .haunt)",
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
          "Scaffold a .haunt/ package: manifest + one example per tier.",
        flags: [
          PACKAGE_FLAG,
          {
            name: "--id",
            description: "Package id (default: fingerprint)",
            takesValue: true,
          },
          {
            name: "--force",
            description: "Overwrite an existing manifest",
            takesValue: false,
          },
        ],
      },
      {
        name: "validate",
        description: "Validate a .haunt/ package: shape + the edge graph.",
        flags: [PACKAGE_FLAG],
      },
      {
        name: "review",
        description:
          "Emit an advisory review packet from the package and a git diff.",
        flags: [
          PACKAGE_FLAG,
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
