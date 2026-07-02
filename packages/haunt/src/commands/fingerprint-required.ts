/**
 * The shared on-ramp for fingerprint-required verbs (`review`, `integrity`).
 * Both grade against the fingerprint's brand truths — without one they
 * degrade to generic lint, so the CLI refuses (exit 2) and points at setup.
 */
export function noFingerprintMessage(verb: string): string {
  return `Cannot ${verb}: no .ghost/ fingerprint package resolves.
Haunt grades drift against your fingerprint's brand truths — without one, it
degrades to generic lint. Set one up:

  npm i -D @anarchitecture/ghost-fingerprint && ghost init

then author a node or two and point your checks' \`references\` at them.
(Use --ghost-dir <dir> if your fingerprint lives somewhere non-standard.)`;
}
