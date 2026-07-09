---
name: adapting-a-starter
description: Transplant a starter fingerprint — a body like vessel-light or the naked skeleton — into your own brand, one procedure from manifest id to regenerated refs.
handoffs:
  - label: Validate the adapted package
    command: ghost validate --format json
    prompt: Does the adapted fingerprint validate, and did any pruned rule orphan a check reference?
---

# Recipe: Adapt A Starter Fingerprint

**Goal:** turn an installed starter — a full body (`ghost init --body
vessel-light`) or the naked skeleton (`ghost init`) — into *your* brand's
fingerprint without shipping a self-contradicting package.

A starter is factored by rate of change under adaptation. Knowing which stratum a
file belongs to tells you what to do with it:

| Stratum | Files | On adaptation |
| --- | --- | --- |
| Grammar | `grammar.*` | Keep unchanged — value-free decision logic that survives any adaptation. |
| Median floor | `anti-goal.median` | Prune, never rewrite — Ghost stamps this measured model truth into every initialized package; you own it after init. |
| Signature | `signature.*` | Answer — each is a dial; restate it with your brand's answer. |
| Values | `materials/tokens.css` | Edit — the single injection point for every literal value. |
| Registers | `register.*` | Re-tune — conditions referencing signature ids; revisit after the dials change. |
| Derived artifacts | `materials/ref/*.html`, `anti-goal.tells` | Regenerate — they demonstrate the values and near-misses of a *specific* signature. |

Do the steps **in order and in one sitting** where possible. A half-adapted
package is worse than an unadapted one: stale refs steer harder than any prose
you rewrote, so stopping after step 4 ships a fingerprint that contradicts
itself.

## The procedure

1. **Change the manifest id.** Edit `id:` in `manifest.yml` to your brand's
   name. This is deliberately first: it is the explicit act that marks the
   adaptation as begun. Until it changes, the package honestly claims to be the
   starter, and every consuming agent cites it as a starter default.
2. **Prune `anti-goal.median`.** Each rule is a `###` heading section; delete
   the whole section for every rule your brand legitimately violates (a brand
   built on gradients deletes the Gradients section — that is the node working,
   not failing). Do not rewrite surviving rules; they are the model's measured
   floor, not your taste. Then run `ghost validate`: every check reference
   orphaned by a pruned heading surfaces as its own warning — delete the paired
   flag and its reference from the check.
3. **Answer the signature dials.** Walk each `signature.*` node as a
   questionnaire item. Keep the fixed relationship (the part the node marks
   as worth keeping); replace the starter's answer — or the open question —
   with your brand's: restate the node as "this brand's current answer is …".
   Ask the human for any dial they have not decided; never freehand a value
   and present it as brand-backed.
4. **Edit `materials/tokens.css`.** Every literal value lives here — radii,
   palette, type sizes, durations, eases. Change the values; keep the role
   names. The role names are the grammar's vocabulary and the reason the
   grammar nodes survive untouched.
5. **Regenerate the refs.** This is the step that decides whether the adaptation
   succeeded. Exemplars dominate prose: a prose rule contradicted by a stale
   ref loses. Rebuild each `materials/ref/*.html` against the new tokens and
   answered dials, keep the annotation headers (`normative-for` /
   `incidental`) current, and make each ref demonstrate its closed sets
   completely. If the starter shipped no refs (the skeleton), generate them
   now — a fingerprint with no exemplars steers at half strength.
6. **Rewrite `anti-goal.tells`.** The tells are near-misses of the *starter's*
   signature; yours are different. For each answered dial, name the failure
   mode one step away from your answer and its replacement. If the starter
   shipped no tells node (the skeleton), author one.
7. **Re-run the checks — including against the refs.** `ghost validate` for
   package shape, then review the regenerated refs against the median and
   value checks (stage the ref changes and run `ghost review`). The floor
   only holds if the refs hold it too: a ref that trips a median flag will
   teach every future generation the violation. Rewrite the body's
   `checks/values.md` alongside the dials it references.

## Consuming an unadapted starter

Work does not block on adaptation. Before the procedure runs (or midway
through it), cite starter content honestly:

- Grammar: **Ghost-backed** — value-free decision logic that holds for any
  brand.
- Surviving median rules: **owner-backed after init** — Ghost stamps this
  measured model truth into every initialized package; you own the pruning and
  any adaptation thereafter.
- The starter's signature values (a body) or your provisional choices (the
  skeleton): **Ghost-backed (starter default, unadapted)** or **provisional**
  — never plain brand truth. The manifest id tells you which state you are
  in: a starter id means unadapted.
- In a brief, `anti-goal.median` sits in the anti-goals slot — after intent,
  inventory, and composition, never before the brand truths. If a median rule
  conflicts with an answered signature node, the signature wins and the
  median line is a prune candidate to report.

## Never

- Never rewrite grammar nodes to taste — if a grammar rule is wrong for your
  brand, it was never grammar; move it to a signature node and answer it.
- Never leave the starter's refs alongside your new tokens — regenerate or
  delete; a stale exemplar outweighs your rewritten prose.
- Never prune a median rule without deleting its paired check flag, or keep a
  check that asserts an obligation no node states.
- Never pre-write the manifest id change into automation — it is the human's
  act of ownership, the one step an agent should not take alone.
