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

The naked skeleton is factored by what must happen during adaptation:

| Stratum | Files | On adaptation |
| --- | --- | --- |
| Cover | `brand.md` | Write it — essence in one paragraph, temperature, and brand-only refusals. Apply the admission test to every line: a violation visible in one element belongs in that element's chapter; visible in one view, in the composition chapter; visible only across the whole body of work, here. Keep a one-screen budget and delete every scaffolding sentence when real. |
| Foundation | `foundation.*` | Answer each chapter's open section (`Palette`, `Typeface`, `Radius`, `Character`, `Warmth`), restate it as the brand's current answer, and edit misuse lists to the brand's real failure modes. |
| Context | `context.*` | Add or re-tune after the open questions are answered; context nodes state only what inverts in a matching situation. |
| Cliche floor | `cliche.*` | Prune — delete entries a foundation misuse list absorbs, delete the paired check flag with it, and replace generic entries with refusals only this brand makes. If a refusal passes the cover admission test, graduate it to `brand.md`. |
| Materials and refs | `materials/*`, referenced implementations, refs | Add or regenerate so the prose has concrete material to inspect. |
| Checks | `checks/*` | Keep paired with the nodes they enforce; delete or rewrite flags when their source rule changes. |

Do the steps **in order and in one sitting** where possible. A half-adapted
package is worse than an unadapted one: stale refs steer harder than any prose
you rewrote, so stopping before refs and checks are current ships a fingerprint
that contradicts itself.

## The procedure

1. **Change the manifest id.** Edit `id:` in `manifest.yml` to your brand's
   name. This is deliberately first: it is the explicit act that marks the
   adaptation as begun. Until it changes, the package honestly claims to be the
   starter, and every consuming agent cites it as a starter default.
2. **Write the cover.** Replace `brand.md` with the brand's essence in one
   paragraph, the shared temperature of words and motion, and the refusals only
   this brand makes. Test every line: a violation visible in one element moves
   to that element's chapter; visible in one view, to the composition chapter;
   only what shows solely across the whole body of work stays. Keep the cover
   to one screen and delete every scaffolding sentence when it is real.
3. **Answer the foundation chapters.** Walk each `foundation.*` node. Keep the
   usage rules that describe the closed vocabulary; answer the open section as
   the brand's current answer. Ask the human for undecided values; never
   freehand a value and present it as brand-backed. Edit each misuse list to the
   failures this brand actually needs to avoid.
4. **Add or edit materials.** Record literal values where the implementation or
   asset materials live, then add `materials` locators to the nodes that explain
   them. Role names can stay stable while values change. The point is that a
   realizing agent can inspect the same concrete source the prose governs.
5. **Re-tune contexts.** Revisit each `context.*` node after the foundation
   answers exist. Keep only inversions that apply in that situation; delete
   generic foundation rules repeated there, and add new contexts only when a
   task situation truly bends the defaults.
6. **Prune `cliche.median`.** Each rule is a `###` heading section; delete the
   whole section for every rule a foundation misuse list now absorbs or your
   brand legitimately violates. Do not rewrite surviving measured defaults into
   taste. Then run `ghost validate`: every check reference orphaned by a pruned
   heading surfaces as its own warning — delete the paired flag and its
   reference from the check.
7. **Regenerate refs.** Exemplars dominate prose: a prose rule contradicted by a
   stale ref loses. Rebuild each ref against the new values and chapter answers,
   keep any annotation headers current, and make each ref demonstrate its closed
   sets completely. If the starter shipped no refs, generate them now — a
   fingerprint with no exemplars steers at half strength.
8. **Rewrite checks and near-miss nodes.** For each answered foundation chapter,
   name the failure mode one step away from the answer and its replacement. Put
   pre-generation guidance in nodes and review assertions in `checks/`; never
   leave a check that asserts an obligation no node states.
9. **Re-run the checks, including against refs.** `ghost validate` for package
   shape, then review the regenerated refs against the median and value checks
   (stage the ref changes and run `ghost review`). The floor only holds if the
   refs hold it too: a ref that trips a median flag will teach every future
   generation the violation.

## Consuming an unadapted starter

Work does not block on adaptation. Before the procedure runs (or midway through
it), cite starter content honestly:

- Cover scaffolding and unanswered foundation sections: **provisional** — never
  plain brand truth.
- Foundation usage rules: **Ghost-backed starter structure** until the human
  answers the open sections and edits the misuse lists.
- Surviving median rules: **owner-backed after init** — Ghost stamps this
  measured model truth into every initialized package; you own the pruning and
  any adaptation thereafter.
- Context nodes: **conditional** — read only when their situation matches, and
  revisit them after the foundation answers change.
- The manifest id tells you which state you are in: a starter id means
  unadapted.

## Never

- Never leave cover scaffolding in a real fingerprint.
- Never present your provisional value as the brand's answer.
- Never leave stale refs alongside new values — regenerate or delete; a stale
  exemplar outweighs rewritten prose.
- Never prune a median rule without deleting its paired check flag, or keep a
  check that asserts an obligation no node states.
- Never pre-write the manifest id change into automation — it is the human's
  act of ownership, the one step an agent should not take alone.
