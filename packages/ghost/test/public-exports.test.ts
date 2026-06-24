import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const hasBuiltExports = existsSync(
  resolve(REPO_ROOT, "packages/ghost/dist/fingerprint.js"),
);

describe.runIf(hasBuiltExports)("built public exports", () => {
  it("exposes fingerprint-first package subpaths", async () => {
    const [fingerprint, scan, relay, govern, compareApi] = await Promise.all([
      import("@anarchitecture/ghost/fingerprint"),
      import("@anarchitecture/ghost/scan"),
      import("@anarchitecture/ghost/relay"),
      import("@anarchitecture/ghost/govern"),
      import("@anarchitecture/ghost/compare"),
    ]);

    const fingerprintApi = fingerprint as Record<string, unknown>;
    const scanApi = scan as Record<string, unknown>;
    const relayApi = relay as Record<string, unknown>;

    expect(fingerprintApi.initFingerprintPackage).toBeTypeOf("function");
    expect(fingerprintApi.lintFingerprintPackage).toBeTypeOf("function");
    expect(fingerprintApi.verifyFingerprintPackage).toBeTypeOf("function");
    expect(fingerprintApi.loadFingerprint).toBeTypeOf("function");
    expect(fingerprintApi.writePackageContextBundle).toBeUndefined();
    expect(fingerprintApi.writeContextBundle).toBeUndefined();

    expect(scanApi.scanStatus).toBeTypeOf("function");
    expect(scanApi.signals).toBeTypeOf("function");
    expect(scanApi.loadFingerprintStackForPath).toBeTypeOf("function");
    expect(scanApi.initFingerprintPackage).toBeUndefined();
    expect(scanApi.lintFingerprintPackage).toBeUndefined();
    expect(scanApi.writePackageContextBundle).toBeUndefined();

    expect(relay.gatherRelayContext).toBeTypeOf("function");
    expect(relay.formatRelayBrief).toBeTypeOf("function");
    expect(relay.GHOST_RELAY_CONTEXT_SCHEMA).toBe("ghost.relay-context/v1");
    expect(relay.GHOST_RELAY_CONFIG_SCHEMA).toBe("ghost.relay-config/v1");
    expect(relay.GHOST_RELAY_REQUEST_SCHEMA).toBe("ghost.relay-request/v1");
    expect(relay.parseGhostRelayRequest).toBeTypeOf("function");
    expect(relayApi.GHOST_CONTEXT_PACKET_SCHEMA).toBeUndefined();

    expect(govern.runGhostCheck).toBeTypeOf("function");
    expect(govern.runGhostCheck).toBe(govern.runGhostDriftCheck);
    expect(govern.formatGhostCheckMarkdown).toBeTypeOf("function");
    expect(govern.formatGhostCheckMarkdown).toBe(
      govern.formatGhostDriftCheckMarkdown,
    );

    expect(compareApi.compare).toBeTypeOf("function");
    expect(compareApi.compareFingerprints).toBeTypeOf("function");
    expect(compareApi.formatComparison).toBeTypeOf("function");
  });
});
