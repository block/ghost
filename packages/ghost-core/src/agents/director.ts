import { compareFleet } from "../evolution/fleet.js";
import { compare as compareStage } from "../stages/compare.js";
import type { ComplianceInput, ComplianceReport } from "../stages/comply.js";
import { comply as complyStage } from "../stages/comply.js";
import { extract } from "../stages/extract.js";
import type {
  AgentContext,
  AgentResult,
  DesignFingerprint,
  EnrichedComparison,
  EnrichedFingerprint,
  FleetComparison,
  FleetMember,
  SampledMaterial,
  Target,
} from "../types.js";
import type { DiscoveredSystem, DiscoveryInput } from "./discovery.js";
import { DiscoveryAgent } from "./discovery.js";
import { FingerprintAgent } from "./fingerprint.js";

/**
 * Director — orchestrates the fingerprinting pipeline.
 *
 * Uses plain stage functions for deterministic steps (extract, compare, comply)
 * and agents for LLM-powered steps (fingerprint, discovery).
 */
export class Director {
  private discoveryAgent = new DiscoveryAgent();

  /**
   * Profile one or more targets as a single design language.
   *
   * One target → standard fingerprint. Multiple targets → synthesized
   * fingerprint across the combined sources (e.g. tokens package + iOS impl + web impl).
   * The fingerprint agent explores all materialized source directories via its tools.
   */
  async profile(
    targets: Target[],
    ctx: AgentContext,
  ): Promise<{
    extraction: AgentResult<SampledMaterial>;
    fingerprint: AgentResult<EnrichedFingerprint>;
    dirs: { label: string; dir: string }[];
  }> {
    const extractionResult = await extract(targets);
    const extraction = stageToAgentResult(extractionResult);

    // Fresh agent per call — FingerprintAgent holds per-run state that
    // would collide if two profiles ran in parallel on the same instance.
    const agent = new FingerprintAgent();
    agent.setToolContext({
      sourceDirs: extractionResult.dirs,
      material: extraction.data,
    });

    const fingerprint = await agent.execute(extraction.data, ctx);

    // Stamp source provenance when more than one target contributed
    if (targets.length > 1) {
      fingerprint.data.sources = targets.map(
        (t) => t.name ?? `${t.type}:${t.value}`,
      );
    }

    return { extraction, fingerprint, dirs: extractionResult.dirs };
  }

  /**
   * Compare two targets: (extract → fingerprint) × 2 → compare
   * Runs the two profile pipelines in parallel.
   */
  async compare(
    sourceTarget: Target,
    targetTarget: Target,
    ctx: AgentContext,
  ): Promise<{
    source: AgentResult<EnrichedFingerprint>;
    target: AgentResult<EnrichedFingerprint>;
    comparison: AgentResult<EnrichedComparison>;
  }> {
    const [sourceResult, targetResult] = await Promise.all([
      this.profile([sourceTarget], ctx),
      this.profile([targetTarget], ctx),
    ]);

    const comparisonResult = await compareStage({
      source: sourceResult.fingerprint.data,
      target: targetResult.fingerprint.data,
      sourceLabel: sourceTarget.name ?? sourceTarget.value,
      targetLabel: targetTarget.name ?? targetTarget.value,
    });

    return {
      source: sourceResult.fingerprint,
      target: targetResult.fingerprint,
      comparison: stageToAgentResult(comparisonResult),
    };
  }

  /**
   * Profile a target and compare against a known fingerprint.
   */
  async drift(
    target: Target,
    parentFingerprint: DesignFingerprint,
    ctx: AgentContext,
  ): Promise<{
    fingerprint: AgentResult<EnrichedFingerprint>;
    comparison: AgentResult<EnrichedComparison>;
  }> {
    const { fingerprint } = await this.profile([target], ctx);

    const comparisonResult = await compareStage({
      source: parentFingerprint,
      target: fingerprint.data,
    });

    return { fingerprint, comparison: stageToAgentResult(comparisonResult) };
  }

  /**
   * Discover design systems matching a query or similar to a fingerprint.
   */
  async discover(
    input: DiscoveryInput,
    ctx: AgentContext,
  ): Promise<AgentResult<DiscoveredSystem[]>> {
    return this.discoveryAgent.execute(input, ctx);
  }

  /**
   * Check compliance of a target against rules.
   */
  async comply(
    target: Target,
    input: Omit<ComplianceInput, "fingerprint">,
    ctx: AgentContext,
  ): Promise<{
    fingerprint: AgentResult<EnrichedFingerprint>;
    compliance: AgentResult<ComplianceReport>;
  }> {
    const { fingerprint } = await this.profile([target], ctx);

    const complianceResult = await complyStage({
      ...input,
      fingerprint: fingerprint.data,
    });

    return {
      fingerprint,
      compliance: stageToAgentResult(complianceResult),
    };
  }

  /**
   * Profile multiple targets and run fleet comparison.
   * Profiles all targets in parallel, then computes pairwise distances and clustering.
   */
  async fleet(
    targets: Target[],
    ctx: AgentContext,
    options?: { cluster?: boolean },
  ): Promise<{
    members: Array<{
      target: Target;
      fingerprint: AgentResult<EnrichedFingerprint>;
    }>;
    fleet: FleetComparison;
  }> {
    const profileResults = await Promise.all(
      targets.map(async (target) => {
        const result = await this.profile([target], ctx);
        return { target, fingerprint: result.fingerprint };
      }),
    );

    const fleetMembers: FleetMember[] = profileResults.map((r) => ({
      id: r.target.name ?? r.target.value,
      fingerprint: r.fingerprint.data,
      parentRef: r.target,
    }));

    const fleetResult = compareFleet(fleetMembers, {
      cluster: options?.cluster ?? true,
    });

    return {
      members: profileResults,
      fleet: fleetResult,
    };
  }
}

/** Convert a StageResult to an AgentResult for backward compatibility. */
function stageToAgentResult<T>(
  stage: import("../stages/types.js").StageResult<T>,
): AgentResult<T> {
  return {
    ...stage,
    iterations: 1,
  };
}
