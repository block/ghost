import { describe, expect, it } from "vitest";
import { CANONICAL_DECISION_DIMENSIONS } from "../src/decision-vocabulary.js";
import {
  computeRuleSeverity,
  DEFAULT_MATCH,
  DEFAULT_TOLERANCE,
  escalateForPresence,
  escalateTier,
  PERCEPTUAL_TIER,
  type PerceptualTier,
  resolveMatchShape,
  resolveTolerance,
  TIER_SEVERITY,
  tierForCanonical,
} from "../src/perceptual-prior.js";

describe("PERCEPTUAL_TIER", () => {
  it("covers every canonical dimension", () => {
    for (const dim of CANONICAL_DECISION_DIMENSIONS) {
      expect(PERCEPTUAL_TIER[dim]).toBeDefined();
    }
  });

  it("places color-strategy and font-sourcing in loud", () => {
    expect(PERCEPTUAL_TIER["color-strategy"]).toBe("loud");
    expect(PERCEPTUAL_TIER["font-sourcing"]).toBe("loud");
  });

  it("places shape-language and elevation in structural", () => {
    expect(PERCEPTUAL_TIER["shape-language"]).toBe("structural");
    expect(PERCEPTUAL_TIER["elevation"]).toBe("structural");
  });

  it("places spatial-system, density, motion in rhythmic", () => {
    expect(PERCEPTUAL_TIER["spatial-system"]).toBe("rhythmic");
    expect(PERCEPTUAL_TIER["density"]).toBe("rhythmic");
    expect(PERCEPTUAL_TIER["motion"]).toBe("rhythmic");
  });
});

describe("TIER_SEVERITY", () => {
  it("maps tiers to drift severities in perceptual order", () => {
    expect(TIER_SEVERITY.loud).toBe("critical");
    expect(TIER_SEVERITY.structural).toBe("serious");
    expect(TIER_SEVERITY.rhythmic).toBe("nit");
  });
});

describe("escalateTier", () => {
  it("rhythmic → structural", () => {
    expect(escalateTier("rhythmic")).toBe("structural");
  });

  it("structural → loud", () => {
    expect(escalateTier("structural")).toBe("loud");
  });

  it("loud saturates at loud", () => {
    expect(escalateTier("loud")).toBe("loud");
  });
});

describe("tierForCanonical", () => {
  it("returns the canonical tier for a known slug", () => {
    expect(tierForCanonical("motion")).toBe("rhythmic");
    expect(tierForCanonical("color-strategy")).toBe("loud");
  });

  it("returns structural for unknown / undefined", () => {
    expect(tierForCanonical(undefined)).toBe("structural");
    expect(tierForCanonical("not-a-real-dimension")).toBe("structural");
  });
});

describe("escalateForPresence", () => {
  it("escalates when bucket count is below floor", () => {
    expect(escalateForPresence("rhythmic", 0, 0)).toBe("structural");
    expect(escalateForPresence("rhythmic", 1, 2)).toBe("structural");
  });

  it("does not escalate when bucket count is above floor", () => {
    expect(escalateForPresence("rhythmic", 5, 2)).toBe("rhythmic");
    expect(escalateForPresence("structural", 10, 0)).toBe("structural");
  });

  it("treats count == floor as triggering escalation", () => {
    // floor is the boundary at which escalation kicks in (≤ floor → escalate)
    expect(escalateForPresence("rhythmic", 2, 2)).toBe("structural");
  });

  it("defaults presence floor to 0", () => {
    expect(escalateForPresence("rhythmic", 0)).toBe("structural");
    expect(escalateForPresence("rhythmic", 1)).toBe("rhythmic");
  });

  it("loud saturates even with escalation triggered", () => {
    expect(escalateForPresence("loud", 0, 0)).toBe("loud");
  });
});

describe("computeRuleSeverity", () => {
  it("honors explicit severity override", () => {
    expect(
      computeRuleSeverity(
        { canonical: "spatial-system", severity: "critical" },
        100,
      ),
    ).toBe("critical");
  });

  it("derives from canonical tier when no override", () => {
    expect(computeRuleSeverity({ canonical: "color-strategy" }, 50)).toBe(
      "critical",
    );
    expect(computeRuleSeverity({ canonical: "shape-language" }, 50)).toBe(
      "serious",
    );
    expect(computeRuleSeverity({ canonical: "spatial-system" }, 50)).toBe(
      "nit",
    );
  });

  it("escalates a rhythmic rule when bucket count crosses floor", () => {
    // motion at 2 occurrences with floor of 2 → escalates rhythmic → structural → serious
    expect(
      computeRuleSeverity({ canonical: "motion", presence_floor: 2 }, 2),
    ).toBe("serious");
  });

  it("does not escalate when bucket count exceeds floor", () => {
    expect(
      computeRuleSeverity({ canonical: "motion", presence_floor: 2 }, 12),
    ).toBe("nit");
  });

  it("escalates structural to loud (critical) at zero presence", () => {
    expect(
      computeRuleSeverity({ canonical: "elevation", presence_floor: 0 }, 0),
    ).toBe("critical");
  });

  it("treats unknown canonical as structural with conservative escalation", () => {
    expect(computeRuleSeverity({ canonical: "novel-dimension" }, 5)).toBe(
      "serious",
    );
    expect(computeRuleSeverity({ canonical: "novel-dimension" }, 0)).toBe(
      "critical",
    );
  });
});

describe("DEFAULT_MATCH", () => {
  it("color is exact", () => {
    expect(DEFAULT_MATCH.color).toBe("exact");
  });

  it("spacing is band", () => {
    expect(DEFAULT_MATCH.spacing).toBe("band");
  });

  it("type-size is percent; type-family and type-weight are exact", () => {
    expect(DEFAULT_MATCH["type-size"]).toBe("percent");
    expect(DEFAULT_MATCH["type-family"]).toBe("exact");
    expect(DEFAULT_MATCH["type-weight"]).toBe("exact");
  });

  it("radius and shadow are structural", () => {
    expect(DEFAULT_MATCH.radius).toBe("structural");
    expect(DEFAULT_MATCH.shadow).toBe("structural");
  });
});

describe("DEFAULT_TOLERANCE", () => {
  it("exact and structural have no tolerance", () => {
    expect(DEFAULT_TOLERANCE.exact).toBeUndefined();
    expect(DEFAULT_TOLERANCE.structural).toBeUndefined();
  });

  it("band defaults to ±2", () => {
    expect(DEFAULT_TOLERANCE.band).toBe(2);
  });

  it("percent defaults to ±10%", () => {
    expect(DEFAULT_TOLERANCE.percent).toBeCloseTo(0.1);
  });
});

describe("resolveMatchShape", () => {
  it("explicit match wins", () => {
    expect(resolveMatchShape({ match: "percent", kind: "color" })).toBe(
      "percent",
    );
  });

  it("falls back to kind default", () => {
    expect(resolveMatchShape({ kind: "spacing" })).toBe("band");
  });

  it("returns exact when no signal", () => {
    expect(resolveMatchShape({})).toBe("exact");
  });
});

describe("resolveTolerance", () => {
  it("explicit tolerance wins", () => {
    expect(resolveTolerance({ tolerance: 4, kind: "spacing" })).toBe(4);
  });

  it("derives from match shape default", () => {
    expect(resolveTolerance({ kind: "spacing" })).toBe(2);
    expect(resolveTolerance({ kind: "type-size" })).toBeCloseTo(0.1);
  });

  it("returns undefined for exact / structural", () => {
    expect(resolveTolerance({ kind: "color" })).toBeUndefined();
    expect(resolveTolerance({ kind: "radius" })).toBeUndefined();
  });
});

describe("perceptual-prior tier-coverage invariant", () => {
  it("every canonical dimension lands in one of three tiers", () => {
    const tiers = new Set<PerceptualTier>(["loud", "structural", "rhythmic"]);
    for (const dim of CANONICAL_DECISION_DIMENSIONS) {
      expect(tiers.has(PERCEPTUAL_TIER[dim])).toBe(true);
    }
  });
});
