import { compareFleet } from "../evolution/fleet.js";
import { compare as compareStage } from "../stages/compare.js";
import type { ComplianceInput, ComplianceReport } from "../stages/comply.js";
import { comply as complyStage } from "../stages/comply.js";
import { extract } from "../stages/extract.js";
import type {
  AgentContext,
  AgentResult,
  EnrichedComparison,
  EnrichedExpression,
  Expression,
  FleetComparison,
  FleetMember,
  SampledMaterial,
  Target,
} from "../types.js";
import type { DiscoveredSystem, DiscoveryInput } from "./discovery.js";
import { DiscoveryAgent } from "./discovery.js";
import { ExpressionAgent } from "./expression.js";

/**
 * Director — orchestrates the expression pipeline.
 *
 * Uses plain stage functions for deterministic steps (extract, compare, comply)
 * and agents for LLM-powered steps (expression, discovery).
 */
export class Director {
  private discoveryAgent = new DiscoveryAgent();

  /**
   * Profile one or more targets as a single design language.
   *
   * One target → standard expression. Multiple targets → synthesized
   * expression across the combined sources (e.g. tokens package + iOS impl + web impl).
   * The expression agent explores all materialized source directories via its tools.
   */
  async profile(
    targets: Target[],
    ctx: AgentContext,
  ): Promise<{
    extraction: AgentResult<SampledMaterial>;
    expression: AgentResult<EnrichedExpression>;
    dirs: { label: string; dir: string }[];
  }> {
    const extractionResult = await extract(targets);
    const extraction = stageToAgentResult(extractionResult);

    // Fresh agent per call — ExpressionAgent holds per-run state that
    // would collide if two profiles ran in parallel on the same instance.
    const agent = new ExpressionAgent();
    agent.setToolContext({
      sourceDirs: extractionResult.dirs,
      material: extraction.data,
    });

    const expression = await agent.execute(extraction.data, ctx);

    // Stamp source provenance when more than one target contributed
    if (targets.length > 1) {
      expression.data.sources = targets.map(
        (t) => t.name ?? `${t.type}:${t.value}`,
      );
    }

    return { extraction, expression, dirs: extractionResult.dirs };
  }

  /**
   * Compare two targets: (extract → express) × 2 → compare
   * Runs the two profile pipelines in parallel.
   */
  async compare(
    sourceTarget: Target,
    targetTarget: Target,
    ctx: AgentContext,
  ): Promise<{
    source: AgentResult<EnrichedExpression>;
    target: AgentResult<EnrichedExpression>;
    comparison: AgentResult<EnrichedComparison>;
  }> {
    const [sourceResult, targetResult] = await Promise.all([
      this.profile([sourceTarget], ctx),
      this.profile([targetTarget], ctx),
    ]);

    const comparisonResult = await compareStage({
      source: sourceResult.expression.data,
      target: targetResult.expression.data,
      sourceLabel: sourceTarget.name ?? sourceTarget.value,
      targetLabel: targetTarget.name ?? targetTarget.value,
    });

    return {
      source: sourceResult.expression,
      target: targetResult.expression,
      comparison: stageToAgentResult(comparisonResult),
    };
  }

  /**
   * Profile a target and compare against a known expression.
   */
  async drift(
    target: Target,
    parentExpression: Expression,
    ctx: AgentContext,
  ): Promise<{
    expression: AgentResult<EnrichedExpression>;
    comparison: AgentResult<EnrichedComparison>;
  }> {
    const { expression } = await this.profile([target], ctx);

    const comparisonResult = await compareStage({
      source: parentExpression,
      target: expression.data,
    });

    return { expression, comparison: stageToAgentResult(comparisonResult) };
  }

  /**
   * Discover design systems matching a query or similar to an expression.
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
    input: Omit<ComplianceInput, "expression">,
    ctx: AgentContext,
  ): Promise<{
    expression: AgentResult<EnrichedExpression>;
    compliance: AgentResult<ComplianceReport>;
  }> {
    const { expression } = await this.profile([target], ctx);

    const complianceResult = await complyStage({
      ...input,
      expression: expression.data,
    });

    return {
      expression,
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
      expression: AgentResult<EnrichedExpression>;
    }>;
    fleet: FleetComparison;
  }> {
    const profileResults = await Promise.all(
      targets.map(async (target) => {
        const result = await this.profile([target], ctx);
        return { target, expression: result.expression };
      }),
    );

    const fleetMembers: FleetMember[] = profileResults.map((r) => ({
      id: r.target.name ?? r.target.value,
      expression: r.expression.data,
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
