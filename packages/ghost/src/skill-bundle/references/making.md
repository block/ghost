---
name: making
description: Complete the ghost making loop for visual artifacts, from gather through rendered repair and review.
---

# Recipe: Make a Visual Artifact From A ghost Package

Use this recipe when the requested output has a rendered form: product UI,
marketing pages, emails, components, charts, empty states, slides, or any other
surface where structure, hierarchy, density, imagery, motion, or responsive
behavior can fail after source looks correct.

The portable loop is:

```text
gather → select → pull → inspect → brief → make → render → repair → review
```

ghost supplies deterministic context and review packets. The current host agent
selects, inspects, makes, renders, judges, and repairs in the same session.

## The sequence

1. **Gather for the actual ask.** Follow [recall.md](recall.md): run
   `ghost gather <ask>` with the user's real task, not a generic label.
2. **Select applicable nodes.** Read descriptions against the situation. Pull
   guidance whose stated condition, material, structure, refusal, or decision
   governs the work. Topic overlap alone is not applicability.
3. **Pull selected nodes.** Run `ghost pull <id> [<id>…]`. Prefer the pulled
   packet over direct file reading because it preserves steering order, inlines
   readable materials, emits inspect-pointers, extracts Skeletons last, and logs
   the local selection event.
4. **Name silence and provisional reasoning.** If ghost does not cover a needed
   decision, say so. Proceed provisionally only when the cover's silence posture
   and task risk allow it.
5. **Inspect concrete materials.** Availability is not use. For every material
   that affects exactness, structure, or taste:
   - read inlined text materials;
   - open referenced source, token, or component files;
   - view image inspect-pointers instead of relying on filenames;
   - inspect rendered exemplars, not just their descriptions;
   - record remote, oversized, missing, or unreadable materials;
   - never claim material grounding for something you did not inspect.
6. **Separate exemplar intent from incidentals.** When a pulled exemplar applies,
   identify what is load-bearing, what should change with task facts, and the
   conditions where the exemplar stops applying. Do not turn one exemplar into a
   universal visual target.
7. **Brief the work.** Follow [brief.md](brief.md). The brief is a steering step,
   not a report. Keep the five-section shape, cap non-negotiables at five, and
   keep ghost-backed claims separate from provisional local reasoning.
8. **Start from the Skeleton when one matches.** If the pulled packet ends with a
   matching Skeleton, write that opening structure verbatim first, then fill it
   with task facts. Skeleton-last ordering is load-bearing; do not paraphrase the
   Skeleton into the brief or move it ahead of the interpretive guidance.
9. **Make from the brief plus the pulled packet.** Use the inspected materials,
   repository conventions, and local implementation path. Do not substitute
   plausible tokens, assets, components, or copy when a pulled material governs
   the choice and was available to inspect.
10. **Render with host-native tools.** Use whatever the current host or repo
    provides: Goose browser skill, Claude Code browser, screenshot, or test
    tools, Cursor preview, Storybook, local preview commands, fixture previews,
    screenshot tests, or another render path. Choose the matrix from the task:
    relevant viewports, normal and edge states, and content stress such as long
    headlines, missing imagery, sparse data, dense data, loading, errors,
    completion states, and localization.
11. **Verify in two lanes.** Keep mechanical evidence and visual read
    separate:
    - **Mechanical evidence:** probes, browser measurements, tests, and computed
      checks own exact claims: overflow, overlap, dimensions, contrast, touch
      targets, focus order, accessibility violations, required content, and
      forbidden implementation patterns. Never estimate what software can
      measure.
    - **Visual read:** inspect screenshots, recordings, or the live render
      for hierarchy, composition, density, rhythm, imagery, motion, brand fit,
      and generic tells. Never treat a passing probe as proof that the surface
      feels right.
12. **Repair within a bounded budget.** Fix visible or mechanical problems with
    coherent changes grounded in the evidence and pulled guidance. Default to two
    repair passes after the first render. Use a third pass only for a clear,
    bounded remaining fix. If a third pass fails, stop patching and re-inspect
    the pulled guidance, materials, and brief, or ask for human review.
13. **Review the final diff when checks exist.** Run `ghost review` when the
    package has checks and a diff is available. Judge the advisory packet,
    apply relevant findings, and report remaining findings, coverage gaps,
    residual failures, inaccessible materials, and any verification the host
    could not perform.

## Render honesty

Rendered verification is required for visual claims, but ghost does not prescribe
a renderer. If the current host has no render, browser, screenshot, image, or
preview capability, say rendered verification was not completed. Do not infer
visual success from source code alone. You may still report source-level checks,
local reasoning, and the exact verification gap.

If rendering is possible but incomplete, be precise: name the viewports, states,
fixtures, probes, and materials checked, and name what was not checked. A narrow
verified claim is better than broad confidence without evidence.

## What to report back

Keep the final report short and evidence-based:

- ghost nodes pulled and the main decisions they forced.
- Materials inspected and materials unavailable.
- Render matrix used: viewport, state, fixture, or preview path.
- Mechanical probes or measurements run, with failures fixed or remaining.
- Visual issues found and repaired.
- Review result when `ghost review` ran, or why it did not.
- Residual risks, including any unavailable render or image-inspection capability.

Do not paste the whole brief unless the user asks. The user needs the completed
work, the verification performed, and the remaining risks.
