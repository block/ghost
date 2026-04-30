#!/bin/sh
# Ghost — install the design-language scan + emit skill bundle.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/block/ghost/main/install/install.sh | sh
#
# Flags (set via env or args):
#   GHOST_AGENT=claude|cursor|codex|opencode    Target agent (default: auto-detect)
#   GHOST_DEST=<path>                            Override install path
#   GHOST_REF=<branch|sha|tag>                   Source ref (default: main)
#   GHOST_SOURCE=<base-url>                      Override fetch base URL (for testing
#                                                with file:// or a local mirror)
#
# What gets installed:
#   <agent-skills-dir>/ghost/
#     SKILL.md
#     references/scan.md, map.md, survey.md, profile.md, schema.md
#     assets/expression.template.md
#
# Exit codes:
#   0  installed
#   1  unsupported platform / no detect
#   2  download failed
#   3  destination already populated; pass --force to overwrite

set -eu

GHOST_REF="${GHOST_REF:-main}"
GHOST_SOURCE="${GHOST_SOURCE:-https://raw.githubusercontent.com/block/ghost/${GHOST_REF}}"
GHOST_PACKAGE_PATH="packages/ghost-expression/src/skill-bundle"
GHOST_BUNDLE_NAME="ghost"
FORCE=0

# --- arg parsing -------------------------------------------------------

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=1 ;;
    --agent) shift; GHOST_AGENT="${1:-}" ;;
    --agent=*) GHOST_AGENT="${1#--agent=}" ;;
    --dest) shift; GHOST_DEST="${1:-}" ;;
    --dest=*) GHOST_DEST="${1#--dest=}" ;;
    --ref) shift; GHOST_REF="${1:-}"; GHOST_SOURCE="https://raw.githubusercontent.com/block/ghost/${GHOST_REF}" ;;
    --ref=*) GHOST_REF="${1#--ref=}"; GHOST_SOURCE="https://raw.githubusercontent.com/block/ghost/${GHOST_REF}" ;;
    --source) shift; GHOST_SOURCE="${1:-}" ;;
    --source=*) GHOST_SOURCE="${1#--source=}" ;;
    -h|--help)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//' | sed '$d'
      exit 0 ;;
    *)
      echo "ghost install: unknown flag '$1' (try --help)" >&2
      exit 1 ;;
  esac
  shift
done

GHOST_AGENT="${GHOST_AGENT:-}"
GHOST_DEST="${GHOST_DEST:-}"

# --- agent detection ---------------------------------------------------

detect_agent() {
  # Look at HOME-relative skill dirs in priority order. The first that
  # exists wins. If none exist, default to claude — it's the most common
  # and creating ~/.claude/skills/ is benign.
  if [ -d "$HOME/.claude/skills" ] || [ -d "$HOME/.claude" ]; then
    echo "claude"; return
  fi
  if [ -d "$HOME/.cursor/skills" ] || [ -d "$HOME/.cursor" ]; then
    echo "cursor"; return
  fi
  if [ -d "$HOME/.codex/skills" ] || [ -d "$HOME/.config/codex" ]; then
    echo "codex"; return
  fi
  if [ -d "$HOME/.opencode/skills" ] || [ -d "$HOME/.opencode" ]; then
    echo "opencode"; return
  fi
  echo "claude"
}

agent_dest_dir() {
  case "$1" in
    claude)   echo "$HOME/.claude/skills" ;;
    cursor)   echo "$HOME/.cursor/skills" ;;
    codex)    echo "$HOME/.codex/skills" ;;
    opencode) echo "$HOME/.opencode/skills" ;;
    *) return 1 ;;
  esac
}

if [ -z "$GHOST_AGENT" ]; then
  GHOST_AGENT="$(detect_agent)"
fi

# Validate agent up-front. `exit` inside $() doesn't propagate, so we
# can't rely on agent_dest_dir to fail the script.
case "$GHOST_AGENT" in
  claude|cursor|codex|opencode) ;;
  *)
    echo "ghost install: unsupported agent '$GHOST_AGENT' (claude|cursor|codex|opencode)" >&2
    exit 1 ;;
esac

if [ -z "$GHOST_DEST" ]; then
  GHOST_DEST="$(agent_dest_dir "$GHOST_AGENT")/$GHOST_BUNDLE_NAME"
fi

# --- pre-flight --------------------------------------------------------

# Idempotency: if the dest already has SKILL.md, refuse unless --force.
if [ -e "$GHOST_DEST/SKILL.md" ] && [ "$FORCE" -ne 1 ]; then
  printf '%s already populated.\n' "$GHOST_DEST" >&2
  printf 'Pass --force to reinstall.\n' >&2
  exit 3
fi

# Pick a downloader. curl preferred, wget fallback.
if command -v curl >/dev/null 2>&1; then
  DL_CMD="curl -fsSL"
elif command -v wget >/dev/null 2>&1; then
  DL_CMD="wget -qO-"
else
  echo "ghost install: need curl or wget on PATH" >&2
  exit 1
fi

# --- fetch the manifest, then each file --------------------------------

# The manifest lists every file the bundle ships. We let it drive the
# install so the bundle can grow without script changes.
MANIFEST_URL="${GHOST_SOURCE}/install/manifest.json"

fetch() {
  url="$1"
  # shellcheck disable=SC2086
  $DL_CMD "$url"
}

printf 'Ghost — installing %s skill bundle\n' "$GHOST_AGENT"
printf '  source: %s\n' "$GHOST_SOURCE"
printf '  dest:   %s\n' "$GHOST_DEST"
printf '\n'

# Download manifest. We don't take a hard dependency on jq — parse the
# small file list with grep + sed since the schema is fixed.
MANIFEST="$(fetch "$MANIFEST_URL")" || {
  printf 'Could not fetch manifest from %s\n' "$MANIFEST_URL" >&2
  exit 2
}

# Extract `package` (used to construct each file's source URL).
PACKAGE_PATH="$(printf '%s' "$MANIFEST" | sed -n 's/.*"package"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
if [ -z "$PACKAGE_PATH" ]; then
  PACKAGE_PATH="$GHOST_PACKAGE_PATH"
fi

# Extract each file path under "files": [...]. The manifest is hand-
# authored, so a simple line-oriented extraction works without jq.
FILES="$(printf '%s' "$MANIFEST" \
  | awk '
    /"files"[[:space:]]*:/    { in_files = 1; next }
    in_files && /\]/          { in_files = 0; next }
    in_files {
      gsub(/[",[:space:]]/, "")
      if (length($0) > 0) print $0
    }
  ')"

if [ -z "$FILES" ]; then
  echo "ghost install: manifest contained no files; nothing to install" >&2
  exit 2
fi

mkdir -p "$GHOST_DEST"

count=0
for rel in $FILES; do
  src="${GHOST_SOURCE}/${PACKAGE_PATH}/${rel}"
  dst="${GHOST_DEST}/${rel}"
  mkdir -p "$(dirname "$dst")"
  if ! fetch "$src" > "$dst"; then
    printf '  ✗ failed: %s\n' "$rel" >&2
    rm -f "$dst"
    exit 2
  fi
  printf '  ✓ %s\n' "$rel"
  count=$((count + 1))
done

printf '\nInstalled %d files to %s\n' "$count" "$GHOST_DEST"
printf '\n'
printf 'Next:\n'
printf '  cd <your-repo>\n'
printf '  Tell your agent: "Scan this project with ghost"\n'
printf '\n'
printf 'The agent will produce map.md → bucket.json → expression.md, then\n'
printf 'emit a /design-review slash command tuned to your design language.\n'
