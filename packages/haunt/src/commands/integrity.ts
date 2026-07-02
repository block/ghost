import { listRepoFiles } from "../bridge/tree.js";
import { loadFingerprint, resolveHauntDir } from "../fingerprint/load.js";
import { loadHauntPackage } from "../scan/load-package.js";
import { noFingerprintMessage } from "./fingerprint-required.js";
import {
  buildIntegrityPacket,
  formatIntegrityPacket,
  type IntegrityPacket,
} from "./integrity-packet.js";

export interface IntegrityOptions {
  /** The `.ghost/` fingerprint package dir (default: .ghost / GHOST_PACKAGE_DIR). */
  ghostDir?: string;
  /** Emit the raw JSON packet instead of the markdown prompt. */
  json?: boolean;
  /** Directory to enumerate the repo tree from (default: process.cwd()). */
  cwd?: string;
}

export interface IntegrityResult {
  packet: IntegrityPacket | null;
  output: string;
  code: number;
}

/**
 * Run `ghost-haunt integrity`: load the package and the fingerprint (required —
 * integrity against *what?* — the fingerprint), enumerate the repo tree, and
 * assemble the audit packet. Holistic always (one run = the whole inventory)
 * and stateless (a deterministic packet, no persisted findings). Advisory —
 * findings are the agent's job; never a CI gate on its own.
 */
export async function runIntegrity(
  options: IntegrityOptions,
): Promise<IntegrityResult> {
  const cwd = options.cwd ?? process.cwd();
  const dir = resolveHauntDir(options.ghostDir, cwd);
  const { pkg, report } = await loadHauntPackage(dir);
  if (pkg === null) {
    const lines = report.issues.map(
      (i) => `${i.severity} ${i.where}: ${i.message}`,
    );
    return {
      packet: null,
      output: `Cannot audit integrity: package failed to load.\n${lines.join("\n")}`,
      code: 2,
    };
  }

  const fingerprint = await loadFingerprint({
    ghostDir: options.ghostDir,
    cwd,
  });
  if (fingerprint === null) {
    return {
      packet: null,
      output: noFingerprintMessage("audit"),
      code: 2,
    };
  }

  const files = await listRepoFiles(cwd);
  const packet = buildIntegrityPacket(pkg, fingerprint, files);
  const output = options.json
    ? JSON.stringify(packet, null, 2)
    : formatIntegrityPacket(packet);
  return { packet, output, code: 0 };
}
