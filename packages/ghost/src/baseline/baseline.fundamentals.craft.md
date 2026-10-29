---
for: "Finishing controls, task states, truncation, layering, or motion."
requires: [baseline.fundamentals.core, baseline.fundamentals.accessibility]
---

## Usage

Defaults for visible behavior. Interactive work needs the states its task can enter; a static page, screen, document, or presentation depicts the requested moment.

## Rules

- Any truncation is deliberate, preserves the task, and offers a route to the full content.
- In interactive work, anything that looks actionable works.
- The loading, empty, error, success, disabled, confirmation, and recovery states the implemented task can actually enter are present.
- Those states are clearly distinguishable from one another.
- The person's work is preserved where possible.
- Recovery identifies the problem and offers a plain next step.
- A high-stakes action includes review or confirmation that explains what will happen.
- Static pages, screens, documents, and presentations do not invent application states.
- One action has clear priority within a decision region.
- Competing actions are subordinated, grouped, or removed in a single-action decision region.
- Content stays below sticky navigation, menus and overlays, and modal dialogs.
- The project's declared layering values are followed.
- Motion explains state, continuity, or causality.
- Genuine loading may loop; other repetition clarifies a task-specific change and still obeys the accessibility motion requirement.

## Never

- Never use an extreme `z-index` value such as `999` or `9999` to force something on top — instead fix the underlying stacking structure.
- Never add looping or uniform entrance motion, including pulse, float, shimmer, bounce, wobble, or fade-and-rise, that communicates no state, continuity, or cause — instead omit it or use motion to clarify a visible change, reserving repetition for genuine loading or a task-specific reason.
