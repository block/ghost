# Model Steering for Agent-Readable Brand Systems

> **Prose, exemplar materials, and invariants are the right starting triad, but they are not the whole steering system.**  
> The fuller model is: **retrieval → conditioning → commitment → constraint → review → renewal.**

> Research grounding for the claims in this doc — with honest evidence tiers —
> lives in [research-references.md](./research-references.md).

Brand work is moving from static outputs to **agent-readable input systems**. Ghost is the operational version: making those inputs **selectable, grounded, ratified, and reviewable**.

The core theory:

> A model does not “know your brand” as a stable object. It generates the next token from learned priors plus current context. Authoring works by changing what context gets selected, what patterns are easiest to continue, what paths are disallowed, and what gets checked after generation.

So the question is not only “what should we tell the model?”

It is:

1. **Will the right truth be retrieved?**
2. **Will the model understand what is normative?**
3. **Will it have concrete material to continue from?**
4. **Will it avoid generic gravity wells?**
5. **Will it commit to the right structure early?**
6. **Will hard lines be preserved?**
7. **Will drift be caught after generation?**
8. **Where does human originality enter instead of median recombination?**

---

## 1. Retrieval handles

### What they are

The parts that help the agent decide what to read before generation:

- node id
- filename/kind
- `description`
- glossary category
- the manifest-declared cover
- task-shaped language

In Ghost, this is the `ghost gather` / `ghost pull` layer.

### How they influence generation

They do not directly affect the final output unless they get pulled into context.

This is the first steering gate:

> If the relevant truth is not retrieved, it has zero effect.

A lot of “the model ignored the brand” is actually “the model never saw the right node.”

### How to think of them

Think of descriptions like tool descriptions or search snippets.

They should answer:

> “When should an agent realize this applies?”

Not:

> “What is this poetically about?”

### Weak example

```yaml
description: Our trust principles.
```

### Strong example

```yaml
description: Checkout trust — gather for payment, pricing, fees, irreversible actions, disclosure, risk, or user hesitation before commitment.
```

### How to author

Use the words future asks will contain:

- checkout
- pricing
- empty state
- failure
- onboarding
- dashboard
- destructive action
- motion
- logo
- campaign
- launch
- recovery
- disclosure

Good format:

```yaml
description: <moment/surface> — gather when <task situations, user questions, or failure modes>.
```

---

## 2. Stance prose / principles

### What they are

The broad interpretive truths:

- what the brand is for
- who it serves
- what it values
- what tradeoff wins
- how it behaves under pressure
- what it refuses to become

This is the classic prose layer.

### How they influence generation

Prose changes the model’s **semantic prior**.

It nudges the model toward a region of its learned distribution. But prose is coarse. Words like “premium,” “clean,” “bold,” “playful,” or “modern” activate generic learned associations.

So prose is weakest when it uses adjectives. It is strongest when it encodes **decision logic**.

### How to think of it

Prose answers:

> “When the model has to invent, what should it optimize for?”

It gives decision logic, not exact form.

### Weak example

```markdown
We are modern, trustworthy, simple, and human.
```

This excludes almost nothing.

### Strong example

```markdown
At moments of financial commitment, reduce felt risk before increasing momentum. The user should understand what will happen, what it costs, and how to recover before the primary action asks for trust. Clarity beats speed when the action is irreversible.
```

That gives the model a tradeoff.

### How to author

Write as forced choices:

```markdown
When X conflicts with Y, X wins.
```

Examples:

```markdown
When density and spaciousness conflict on operational surfaces, density wins — but hierarchy must come from alignment and weight before color.

When trust and conversion pressure conflict, trust wins. Never hide risk to make the primary action feel easier.

When delight and comprehension conflict, comprehension wins. Motion may clarify state change; it must not become decoration.
```

Avoid brand-book filler. A principle should make the model reject a plausible wrong answer.

---

## 3. Concrete inventory / agent-readable materials

### What they are

The concrete things the model should use instead of guessing:

- CSS variables
- tokens
- fonts
- SVGs
- components
- HTML examples
- motion JSON
- copy snippets
- implementation paths
- Figma links
- screenshots
- asset folders

HTML/CSS/SVG/JSON are not just documentation. They are **buildable context**.

### How they influence generation

Inventory solves knowledge gaps.

If the model does not know your component names, token values, logo files, motion curves, or type ramp, it will invent plausible ones.

No amount of “stay on brand” fixes missing facts.

### How to think of it

Inventory answers:

> “What should the model not have to invent?”

This is the factual layer.

### Example

```markdown
---
description: Product color, type, and motion materials — gather before building UI, motion demos, or branded surfaces.
materials:
  - src/styles/tokens.css
  - src/components/brand/**
  - src/motion/type-curves.json
  - public/brand/logo*.svg
---

Use the product tokens rather than ad hoc values. Primary actions use `--color-action-primary`; never introduce a new blue because a generic button pattern expects one. Motion uses the curves in `src/motion/type-curves.json`; do not approximate easing with default `ease-in-out`.
```

### How to author

Use inventory when the model keeps:

- inventing colors
- inventing components
- using generic Tailwind defaults
- approximating motion
- missing asset rules
- creating new styles instead of using existing ones

But do not turn the fingerprint into duplicated API docs.

Bad:

```markdown
The Button component takes size, variant, iconLeft, iconRight...
```

Better:

```markdown
Primary actions use the existing Button primitive. The brand move is not the API; it is restraint: one primary action per surface, no competing accent treatment, and no new button color outside the token ramp.
```

`materials` locate. Prose explains meaning.

---

## 4. Exemplars

### What they are

Concrete examples of good output:

- a real screen
- a launch page
- a component implementation
- an HTML artifact
- an error message
- a motion demo
- a product flow
- a campaign module

These can live directly in prose or be pointed to through `materials`.

### How they influence generation

Exemplars are often the strongest generation-time signal.

Mechanically, they work like in-context demonstrations. The model sees structure, rhythm, naming, spacing, hierarchy, tone, and code shape, then continues in that pattern.

This is why HTML/CSS examples are so powerful: they expose structure, not just appearance.

A screenshot says:

> “Look at this.”

HTML/CSS says:

> “Continue from this.”

### How to think of them

Exemplars answer:

> “What does good look like?”

But they need annotation. Otherwise the model copies accidents as if they were brand.

### Example

```markdown
---
description: On-brand failure copy — gather for errors, failed saves, retries, and recovery states.
---

Normative for rhythm and stance at failure moments. Match the structure, not the exact words.

> We couldn't save your changes. Your work is still here — try again, and if it keeps failing, we'll hold onto everything while you sort it out.

What makes it ours:
- Leads with what happened, not apology.
- States what is safe before what to do.
- Gives one calm next step.
- No "Oops."
- No exclamation points.
- No blame on the user or the network.
```

### How to author

For every exemplar, say:

1. what it is normative for;
2. what is incidental;
3. what features make it on-brand;
4. when to reuse the pattern;
5. when not to.

Good phrase:

```markdown
This sample is normative for <layout/rhythm/hierarchy/voice>, not for <incidental specifics>.
```

---

## 5. Counter-exemplars / anti-goals

### What they are

Specific rejected patterns:

- generic SaaS cards
- bootstrap-blue buttons
- gradient hero text
- emoji headings
- “Oops!” error copy
- fake dashboard previews
- over-rounded cards
- decorative motion
- three equal CTAs

### How they influence generation

Anti-goals fight model gravity wells.

Models regress toward common training patterns. If you ask for “modern landing page,” you will get something like:

- gradient headline
- rounded cards
- soft shadows
- three-column feature grid
- blue/purple accent
- generic dashboard mockup

Positive prose often does not escape this. Specific negation does.

### How to think of it

Anti-goals answer:

> “Which likely continuation should the model refuse?”

They prune the distribution.

### Example

```markdown
---
description: Generic generated UI we reject — gather before building product UI or marketing surfaces.
---

We are not the generic generated interface: no indigo-600 primary buttons, no rounded-xl white cards floating on gray-50, no emoji in headings, no gradient hero text, no fake dashboard preview unless the product moment is actually dashboard-shaped.

When a layout feels like a template any product could ship, it is off-brand even if every token is technically valid.

Default away from that gravity well: flat surfaces, hard alignment, one accent used sparingly, and hierarchy from spacing before decoration.
```

### How to author

Do not say:

```markdown
Avoid generic design.
```

Say:

```markdown
No rounded-xl card grids on gray backgrounds. No gradient hero type. No decorative blob backgrounds. No fake analytics dashboard unless analytics is the actual product object.
```

Name the enemy.

---

## 6. Invariants

### What they are

Hard always/never rules:

- one primary CTA
- fees before commitment
- no new colors outside tokens
- logo never redrawn
- error states always include recovery
- motion respects reduced-motion
- type hierarchy never inverts
- children never outrank parent context

### How they influence generation

Invariants constrain the search space.

They are strongest when they are:

- short;
- concrete;
- checkable;
- numeric where possible;
- written as always/never;
- placed early in the brief;
- mirrored by review checks.

### How to think of them

Invariants answer:

> “What must survive every interpretation?”

They are the floor.

### Example

```markdown
---
description: Checkout trust invariants — hard rules for payment, pricing, and irreversible commitment.
---

These hold for every checkout or payment-adjacent surface:

- Fees are disclosed before the committing action. Never reveal a new fee after the primary CTA.
- At most one primary action appears in a checkout step.
- Reassurance sits near the action it supports; never isolate trust copy in a generic footer.
- Recovery is visible wherever failure is possible: retry, edit, cancel, or contact support.
- The primary price and the committing action appear in the same viewport before commitment.
```

### How to author

Use invariant form when the failure is a repeated review comment.

Good syntax:

```markdown
- Always <specific behavior> when <condition>.
- Never <specific rejected behavior>; instead <allowed alternative>.
- At most/exactly/no more than <number> <object>.
```

If it cannot be reviewed, it may not be an invariant yet.

---

## 7. Composition patterns

### What they are

Reusable structures that bind part of the output and leave part open.

This is the “pattern” layer:

- empty state
- status with next step
- pricing comparison
- checkout disclosure
- confirmation
- onboarding step
- launch hero
- feature proof
- destructive action modal

### How they influence generation

Patterns steer early commitment.

Autoregressive generation commits quickly. Once the model starts a three-card grid, modal, dashboard, or hero section, the rest of the output gets pulled into that structure.

A composition pattern gives the model a better starting scaffold.

### How to think of it

Patterns answer:

> “What shape should this kind of thing take before details are chosen?”

They sit between principle and exemplar.

### Example

```markdown
---
description: Status plus next step — gather when the user asks where something stands and what to do now.
---

**Applies when:** the surface explains the state of something in flight: an order, transfer, review, delivery, setup, or request.

**Bound:**

- Current status renders first and largest.
- One sentence explains why the status matters.
- Exactly one primary next step appears last.
- Supporting evidence may not compete with the status.

**Open:**

- Evidence may be a timeline, timestamp, or compact stat list.
- Tone may flex warmer for consumer surfaces and more direct for operational ones.
- Secondary actions may appear only after the primary next step.

**Refines:** `principle.composition`. If this conflicts with the composition floor, the floor wins.
```

### How to author

Use the bound/open distinction.

- **Bound** = do not redecide.
- **Open** = the agent may choose, within limits.

If everything is bound, you wrote a template.  
If nothing is bound, you wrote vibes.

---

## 8. Conditions and altitude

### What they are

Scope rules for when a truth applies.

A universal truth is stated plainly. A narrower truth names the situation that activates it.

Ghost is right that this belongs in prose, not hierarchy.

### How they influence generation

Conditions prevent truth smearing.

Without conditions, the model applies good guidance everywhere:

- checkout trust leaks into marketing;
- operational density leaks into onboarding;
- failure voice leaks into success copy;
- launch-page drama leaks into settings UI.

### How to think of it

Conditions answer:

> “When does this truth fire?”

### Weak example

```markdown
For dashboards, use compact density.
```

### Strong example

```markdown
When the user's first question is comparative — “which record needs attention?” — density may increase by one step. Even then, hierarchy comes from alignment and weight before color.
```

The second can apply outside literal dashboards and avoid applying inside dashboards when the situation does not match.

### How to author

Use condition language:

```markdown
When the user is about to commit money...
When recognition matters more than space...
When the surface must compare many records...
When the action is irreversible...
When the brand should recede behind the task...
```

Avoid pure destination buckets:

```markdown
for dashboards
for mobile
for marketing
for emails
```

Those are hints, not the real condition.

---

## 9. Decision traces / procedures

This bucket is underweighted in many brand systems.

### What they are

Worked reasoning examples showing how a brand decision was made.

Not just:

> “Use dense layouts.”

But:

> “We considered a drawer, inline chips, and a command palette. We chose command palette because density beats discoverability in this operational moment.”

### How they influence generation

They teach the model the **tradeoff function**.

Models imitate reasoning traces as well as outputs. A decision trace shows how the brand resolves conflict.

This matters because two brands can share:

- the same tokens;
- similar components;
- similar layouts;
- similar voice adjectives;

but differ completely in how they decide under pressure.

### How to think of it

Decision traces answer:

> “How do we choose when two good options conflict?”

This is brand as taste under pressure.

### Example

```markdown
---
description: How we choose dense operational controls — gather when filtering, searching, or narrowing large record sets.
---

Decision trace:

We needed filtering for a high-volume review queue.

Options considered:
- Drawer: clearer, but too heavy for repeated use.
- Inline chips: visible, but noisy after five filters.
- Command palette: less discoverable, but fastest for expert operators.

We chose command palette because this surface is used repeatedly by trained operators. In this condition, speed and density beat first-use discoverability. On consumer onboarding, this decision would reverse.
```

### How to author

Ask during fingerprint interviews:

- What decision did you reverse?
- What almost shipped but felt wrong?
- What did you choose between?
- Which value won?
- When would that decision reverse?
- What did a senior designer catch that others missed?

This captures the “taste move,” not just the artifact.

---

## 10. Checks and review assertions

### What they are

Post-generation tests or review prompts.

In Ghost, these live under the checks directory:

```text
.ghost/checks/*.md
```

They are feed-back, not feed-forward. They do not appear in `ghost gather` or `ghost pull`.

### How they influence generation

Strictly speaking, checks do not steer the first generation unless the harness uses them in a loop.

They steer the system by creating:

```text
generate → review → repair → review again
```

That is often more reliable than trying to make the first sample perfect.

### How to think of it

Checks answer:

> “How do we know the truth survived implementation?”

They turn invariants into reviewable assertions.

### Example

```markdown
---
name: checkout-fees-before-commitment
description: Checkout discloses fees before the committing action.
severity: high
references:
  - principle.checkout-trust
---

Grade whether the change preserves the rule that fees are disclosed before the committing action. Flag any flow where a new fee appears after the primary CTA, where fee text is visually detached from the action, or where the user must expand optional UI to discover required cost.
```

### How to author

Every hard “never” or “always” should be considered for a check.

Good checks say:

- what to inspect;
- what to flag;
- what counts as preserved;
- which node grounds the assertion.

Do not invent new obligations in checks. They should reference the brand truth they enforce.

---

## 11. Context assembly / brief shape

### What it is

The way selected truths are assembled before generation.

This is not cosmetic. Order matters.

The first few commitments in a generated output strongly shape everything after. If the model starts from a generic scaffold, later brand instructions have to fight that scaffold.

### How it influences generation

A good brief controls what the model commits to first.

Useful order:

1. grounded nodes;
2. non-negotiables;
3. applicable conditions;
4. intent;
5. inventory/materials;
6. composition pattern;
7. exemplars;
8. anti-goals;
9. silent/provisional areas.

### How to think of it

Context assembly answers:

> “What should the model anchor on before it starts producing?”

### Example

```markdown
## Grounded in

Cover already in context: `brand`. Pulled: `principle.checkout-trust`, `pattern.status-with-next-step`, `anti-goal.generic-ui`.

## Non-negotiables

- Fees before commitment. [`principle.checkout-trust`]
- At most one primary action per step. [`principle.checkout-trust`]
- No generic rounded-card SaaS layout. [`anti-goal.generic-ui`]

## Conditions that apply

This is a payment-adjacent commitment moment, so checkout trust rules apply.

## Intent

Reduce felt risk before increasing momentum. Clarity beats speed.

## Inventory

Use existing checkout components and token ramp. Do not introduce new button styles.

## Composition

Current state first, one line of meaning, one next step last.

## Silent / provisional

The fingerprint does not specify loading skeletons. Follow local code convention provisionally.
```

### How to author

The fingerprint should make this easy:

- keep nodes purpose-coherent;
- make descriptions selectable;
- put true global non-negotiables on the cover;
- distinguish hard rules from soft guidance;
- label silence.

---

## 12. Deliberate novelty

### What it is

The non-median creative move:

- the weird launch concept;
- the memorable above-the-fold idea;
- the campaign hook;
- the specific idea the system would not have produced from recombination alone.

### How they influence generation

They disrupt median convergence.

A well-authored brand system makes outputs coherent. But coherence is not originality. Models recombine what they are given and drift toward the center of allowed possibilities.

Deliberate novelty is human injection of a surprising idea.

### How to think of it

Deliberate novelty answers:

> “What makes this specific output memorable, not merely correct?”

It is usually task-specific, not permanent brand law.

### Example

```markdown
---
description: Launch-specific creative hook — use only for the Type launch page.
---

For this launch, the hero should feel like entering a shared writing room after midnight: cursors moving, fragments collecting, multiple minds arriving at one sentence. This is a one-time campaign idea, not a reusable product UI pattern.

Preserve:
- multiplayer atmosphere;
- language as material;
- visible collaboration;
- slightly nocturnal energy.

Do not generalize this into the core product UI.
```

### How to author

Keep deliberate novelty distinct from invariants.

A one-time creative move can become an exemplar later, but do not accidentally turn a campaign-specific idea into permanent brand law.

Ask:

- Is this reusable truth?
- Or is this a specific creative leap for one moment?

Both are valuable. They should not be stored with the same normative weight.

---

## The updated steering stack

| Bucket | What it is | Model mechanism | Best for |
|---|---|---|---|
| Retrieval handles | Descriptions, ids, glossary, cover | Gets right context selected | Making truths findable |
| Stance prose | Principles and tradeoffs | Shifts semantic prior | Decision-making in novel cases |
| Inventory/materials | Tokens, components, HTML, CSS, SVG, JSON | Fixes knowledge gaps | Preventing invention |
| Exemplars | Good outputs in context | Pattern continuation / few-shot shaping | Form, rhythm, code shape |
| Anti-goals | Rejected defaults | Prunes generic priors | Escaping AI sameness |
| Invariants | Always/never rules | Constrains generation | Hard brand/product lines |
| Patterns | Bound/open structures | Controls early commitment | Reusable UI/content shapes |
| Conditions | Applicability rules | Gates truths | Preventing over-application |
| Decision traces | Worked tradeoff reasoning | Teaches choice function | Taste under conflict |
| Checks | Review assertions | Feedback loop | Catching drift |
| Brief assembly | Ordered context packet | Controls first commitments | Reliable generation setup |
| Deliberate novelty | Task-specific creative leap | Breaks median recombination | Memorable creative output |

---

## How to update the original triad

The original triad:

> prose, exemplar materials, invariants

Expanded:

> **Prose for decision logic, materials for facts, exemplars for form, anti-goals for escaping priors, patterns for structure, invariants for hard boundaries, decision traces for taste, checks for drift, and deliberate novelty for non-median originality.**

Or shorter:

> **Say the stance. Show the material. Name the enemy. Bind the structure. State the hard lines. Show how decisions are made. Check the result. Leave room for the non-obvious idea.**

---

## A practical authoring template

A strong Ghost-style node could look like this:

```markdown
---
description: <task-shaped retrieval phrase — when should this be gathered?>
materials:
  - <optional path, glob, or URL>
---

<One sentence of stance or purpose.>

**Applies when:** <situation, not destination>

**Preserve:**
- <positive obligation>
- <positive obligation>

**Never:**
- <specific rejected default>
- <specific rejected default>

**Bound:**
- <decided structure, if this is a pattern>

**Open:**
- <where the agent may choose>

**Use / inspect:**
- <material or implementation path, if relevant>

**Example:**
> <verbatim sample or linked material>

What makes this example intentional:
- <feature>
- <feature>
- <feature>

**Decision trace:**
We chose <A> over <B> because <value/tradeoff>. This would reverse when <condition>.
```

Not every node needs every section. But this template forces the author to ask the right questions.

---

## The diagnostic

When the model fails, do not immediately add more prose. Classify the failure.

### It invented a component, token, color, or asset

Add **inventory/materials/exact values**.

### It looked generic

Add **exemplars and anti-goals**.

### It chose the wrong structure

Add a **composition pattern**.

### It crossed a hard line

Add an **invariant** and probably a **check**.

### It applied good guidance in the wrong place

Add **conditions / altitude**.

### It made a technically correct but forgettable output

Add a **specific creative concept** or stronger non-obvious idea.

### It did not use an existing truth

Fix the **description / retrieval handle**.

### It made a bad tradeoff

Add a **decision trace**.

---

## Final mental model

Brand steering for agents is not “documentation the model reads.”

It is closer to a layered control system:

1. **Retrieval** decides what enters context.
2. **Prose** sets decision logic.
3. **Materials** provide facts.
4. **Exemplars** teach form.
5. **Anti-goals** suppress generic priors.
6. **Patterns** control structural commitment.
7. **Invariants** define hard boundaries.
8. **Decision traces** teach taste.
9. **Checks** catch drift.
10. **Deliberate novelty** injects originality beyond recombination.

That is the theory behind why prose, exemplar materials, and invariants matter — and why they are necessary but not sufficient.
