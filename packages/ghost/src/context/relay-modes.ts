export const RELAY_MODES = ["generation", "review", "prompt"] as const;

export type GhostRelayMode = (typeof RELAY_MODES)[number];

export const SHARED_GHOST_CAPABILITIES = [
  "product.posture",
  "generation.context",
  "review.grounding",
  "design.composition",
  "review.fidelity",
  "material.evidence",
  "material.exemplars",
  "validation.check",
  "review.rubric",
  "prompt.disambiguation",
  "prompt.routing",
  "relay.stack-resolution",
  "agent.context",
  "source.grounding",
  "human.escalation",
] as const;

export type SharedGhostCapability = (typeof SHARED_GHOST_CAPABILITIES)[number];

export type GhostCapability = SharedGhostCapability | (string & {});

export const MODE_DEFAULT_CAPABILITIES: Record<
  GhostRelayMode,
  SharedGhostCapability[]
> = {
  generation: [
    "product.posture",
    "generation.context",
    "design.composition",
    "material.evidence",
    "material.exemplars",
    "prompt.disambiguation",
  ],
  review: [
    "product.posture",
    "review.grounding",
    "review.fidelity",
    "review.rubric",
    "validation.check",
    "material.evidence",
    "source.grounding",
  ],
  prompt: [
    "product.posture",
    "prompt.routing",
    "prompt.disambiguation",
    "relay.stack-resolution",
    "agent.context",
    "human.escalation",
  ],
};

const SHARED_CAPABILITY_SET = new Set<string>(SHARED_GHOST_CAPABILITIES);

export function isRelayMode(value: string): value is GhostRelayMode {
  return (RELAY_MODES as readonly string[]).includes(value);
}

export function defaultCapabilitiesForMode(
  mode: GhostRelayMode,
): SharedGhostCapability[] {
  return [...MODE_DEFAULT_CAPABILITIES[mode]];
}

export function isSharedGhostCapability(value: string): boolean {
  return SHARED_CAPABILITY_SET.has(value);
}

export function isNamespacedGhostCapability(value: string): boolean {
  return /^[a-z][a-z0-9-]*\.[a-z][a-z0-9.-]*$/.test(value);
}

export function validateGhostCapability(value: string): string | undefined {
  if (isSharedGhostCapability(value)) return undefined;
  if (isNamespacedGhostCapability(value)) return undefined;
  return `Capability '${value}' must be a shared Ghost capability or a namespaced custom capability such as acme.context.`;
}

export function resolveRequestedCapabilities(input: {
  mode?: GhostRelayMode;
}): string[] {
  const mode = input.mode ?? "generation";
  return defaultCapabilitiesForMode(mode);
}
