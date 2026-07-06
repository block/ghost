import { describe, expect, it } from "vitest";
import { runProbe } from "../src/review/probes.js";

describe("review probes", () => {
  it("captures non-zero exit code and truncated streams", async () => {
    const probe = await runProbe(
      "node -e \"console.log('x'.repeat(20)); console.error('bad'); process.exit(7)\"",
      { cwd: process.cwd(), truncateChars: 10 },
    );

    expect(probe.exitCode).toBe(7);
    expect(probe.timedOut).toBe(false);
    expect(probe.stdout).toContain("truncated to 10 characters");
    expect(probe.stderr).toBe("bad\n");
  });

  it("reports timeout evidence without throwing", async () => {
    const probe = await runProbe('node -e "setTimeout(() => {}, 1000)"', {
      cwd: process.cwd(),
      timeoutMs: 50,
    });

    expect(probe.timedOut).toBe(true);
    expect(probe.exitCode).toBeNull();
  });
});
