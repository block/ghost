/**
 * haunt — the BYO-design-system adherence and drift layer for Ghost (Problem A).
 *
 * Where Fingerprint (@anarchitecture/ghost) carries the portable, medium-agnostic
 * intent contract, Haunt is the implementation-layer counterpart: it bridges to the
 * design-system code a repo already owns (code as source of truth) and grades
 * *high-altitude* compositional drift — hierarchy collapsing, density creeping,
 * restraint eroding — the drift linters can't see, prose tools can't reach, and
 * stack-owners won't police.
 *
 * Design-system-agnostic by design. Vessel is the reference body it ships knowing
 * best, but Haunt never requires it. See notes/naming-and-structure.md.
 *
 * The mechanism (BYOA): the deterministic core assembles the evidence —
 * inventory-extracted code facts + the bound intent/composition prose + the diff —
 * and the host agent renders the adherence judgment.
 *
 * Status: scaffolded. Surface intentionally empty until the design lands.
 */

export const HAUNT_VERSION = "0.0.0";
