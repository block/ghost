import { compareFleet } from "../evolution/fleet.js";
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
import type { ComparisonInput } from "./comparison.js";
import { ComparisonAgent } from "./comparison.js";
import type { ComplianceInput, ComplianceReport } from "./compliance.js";
import { ComplianceAgent } from "./compliance.js";
import type { DiscoveredSystem, DiscoveryInput } from "./discovery.js";
import { DiscoveryAgent } from "./discovery.js";
import { ExtractionAgent } from "./extraction.js";
import { FingerprintAgent } from "./fingerprint.js";

/**
 * Director Agent — orchestrates agent pipelines.
 *
 * Routes high-level user intent to the appropriate sequence of agents.
 * Handles multi-step workflows like "profile X and compare to Y".
 * Parallelizes independent agent calls where possible.
 */
export class Director {
  private extractionAgent = new ExtractionAgent();
  private fingerprintAgent = new FingerprintAgent();
  private comparisonAgent = new ComparisonAgent();
  private discoveryAgent = new DiscoveryAgent();
  private complianceAgent = new ComplianceAgent();

  /**
   * Profile a target: extract → fingerprint
   */
  async profile(
    target: Target,
    ctx: AgentContext,
  ): Promise<{
    extraction: AgentResult<SampledMaterial>;
    fingerprint: AgentResult<EnrichedFingerprint>;
  }> {
    const extraction = await this.extractionAgent.execute(target, ctx);
    const fingerprint = await this.fingerprintAgent.execute(
      extraction.data,
      ctx,
    );

    return { extraction, fingerprint };
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
    // Profile both in parallel
    const [sourceResult, targetResult] = await Promise.all([
      this.profile(sourceTarget, ctx),
      this.profile(targetTarget, ctx),
    ]);

    // Compare
    const comparisonInput: ComparisonInput = {
      source: sourceResult.fingerprint.data,
      target: targetResult.fingerprint.data,
      sourceLabel: sourceTarget.name ?? sourceTarget.value,
      targetLabel: targetTarget.name ?? targetTarget.value,
    };

    const comparison = await this.comparisonAgent.execute(
      comparisonInput,
      ctx,
    );

    return {
      source: sourceResult.fingerprint,
      target: targetResult.fingerprint,
      comparison,
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
    const { fingerprint } = await this.profile(target, ctx);

    const comparison = await this.comparisonAgent.execute(
      {
        source: parentFingerprint,
        target: fingerprint.data,
      },
      ctx,
    );

    return { fingerprint, comparison };
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
    const { fingerprint } = await this.profile(target, ctx);

    const compliance = await this.complianceAgent.execute(
      {
        ...input,
        fingerprint: fingerprint.data,
      },
      ctx,
    );

    return { fingerprint, compliance };
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
    // Profile all targets in parallel
    const profileResults = await Promise.all(
      targets.map(async (target) => {
        const result = await this.profile(target, ctx);
        return { target, fingerprint: result.fingerprint };
      }),
    );

    // Build fleet members
    const fleetMembers: FleetMember[] = profileResults.map((r) => ({
      id: r.target.name ?? r.target.value,
      fingerprint: r.fingerprint.data,
      parentRef: r.target,
    }));

    // Run fleet comparison
    const fleetResult = compareFleet(fleetMembers, {
      cluster: options?.cluster ?? true,
    });

    return {
      members: profileResults,
      fleet: fleetResult,
    };
  }
}
