# Research References for Ghost's Steering Claims

> **Audience: Ghost maintainers and contributors.** This doc maps the claims in
> [Model Steering for Agent-Readable Brand Systems](./agent-readable-brand-steering.md)
> to published research. It exists so we know which of our stances rest on
> validated results, which are extrapolations from adjacent domains, and which
> are our own untested priors. It is deliberately honest: a citation appears
> here only if the finding actually supports the claim as we make it.

## How to read this doc

Every claim carries an evidence tier:

| Tier | Meaning |
| --- | --- |
| **Established** | Direct, replicated, peer-visible result. The claim as written is supported. |
| **Adjacent** | The finding is real but from a neighboring task or older model class. We are extrapolating; the extrapolation is stated. |
| **Prior** | Mechanistically sound reasoning or practitioner consensus, but no benchmarked result for the claim as we make it. Testable; not yet tested. |

Rules for maintaining this doc:

- **Cite for the finding, not the aura.** A paper goes next to a claim only if
  its actual result supports that claim. Never cite a famous paper because it
  is nearby-sounding.
- **Carry the caveats.** If a result is on 2021-era models, on classification
  rather than generation, or contested, say so inline.
- **Downgrades are contributions.** If a newer result weakens a citation here,
  moving a claim from Established to Adjacent (or deleting the citation) is as
  valuable as adding one.
- **Priors want experiments.** Each Prior-tier claim should state the cheap
  experiment that would settle it.

---

## 1. The retrieval gate

**Ghost claim:** a truth that is not retrieved has zero effect; selection into
context is the first steering gate (`ghost gather` / `ghost pull`, task-shaped
descriptions).

**Tier: Established.**

- Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP
  Tasks*, [arXiv:2005.11401](https://arxiv.org/abs/2005.11401). Conditioning
  generation on retrieved context outperforms relying on parametric knowledge
  for knowledge-intensive tasks. The foundational result behind
  retrieve-then-generate as an architecture.
- Park et al., *Generative Agents: Interactive Simulacra of Human Behavior*,
  [arXiv:2304.03442](https://arxiv.org/abs/2304.03442). The closest published
  precedent for Ghost's shape: a flat memory stream of natural-language records
  with just-in-time relevance-scored retrieval into context. Their ablations
  show retrieval quality dominates output believability.
- Liu et al., *What Makes Good In-Context Examples for GPT-3?*,
  [arXiv:2101.06804](https://arxiv.org/abs/2101.06804). Semantically
  task-relevant in-context material outperforms randomly selected material —
  the justification for selecting nodes against the actual ask rather than
  shipping a static prompt.

**Honesty note:** these papers validate retrieve-then-generate and
relevance-based selection. None of them test *agent-side* selection against
human-authored descriptions specifically (Ghost's BYOA stance). That design
choice is architectural, argued in [purposes.md](./purposes.md), not
literature-backed.

---

## 2. Relevance beats volume; small briefs

**Ghost claims:** irrelevant or excess context degrades output ("3–5 nodes is
normal; 10 is a bad selection"); more context is not more control.

**Tier: Established** for degradation from irrelevant and from lengthy input.
**Prior** for the specific 3–5 node budget.

- Shi et al., *Large Language Models Can Be Easily Distracted by Irrelevant
  Context*, [arXiv:2302.00093](https://arxiv.org/abs/2302.00093). Adding
  irrelevant context measurably reduces accuracy — extra nodes are not merely
  wasted, they actively hurt.
- Levy, Jacoby & Goldberg, *Same Task, More Tokens: the Impact of Input Length
  on the Reasoning Performance of Large Language Models*,
  [arXiv:2402.14848](https://arxiv.org/abs/2402.14848). Reasoning degrades as
  input grows **even when the added content is relevant**, well before the
  context limit.
- Hsieh et al., *RULER: What's the Real Context Size of Your Long-Context
  Language Models?*, [arXiv:2404.06654](https://arxiv.org/abs/2404.06654).
  Effective context is much shorter than advertised context; performance on
  anything richer than needle retrieval decays far before the nominal window.

**Honesty note:** "3–5 nodes" is our operating number, not a measured optimum.
The literature says *smaller and more relevant is better*; it does not say
where the knee is for brand-steering packets. Cheap experiment: same task, same
fingerprint, pull sets of 3 / 6 / 10 nodes, blind-grade outputs for adherence.

---

## 3. Position and ordering in context

**Ghost claims:** beginning and end of context are privileged; `ghost pull`
emission order (stance first, guards late, skeletons dead last) and the brief's
section order are load-bearing, not cosmetic.

**Tier: Established** for position effects and order sensitivity.
**Prior** for Ghost's *specific* ordering being optimal.

- Liu et al., *Lost in the Middle: How Language Models Use Long Contexts*,
  [arXiv:2307.03172](https://arxiv.org/abs/2307.03172). The canonical U-shaped
  result: information at the beginning and end of context is used far better
  than information in the middle. Directly supports placing non-negotiables
  early and the skeleton — the thing to continue from — last.
- Xiao et al., *Efficient Streaming Language Models with Attention Sinks*,
  [arXiv:2309.17453](https://arxiv.org/abs/2309.17453). Mechanistic evidence
  that initial tokens receive disproportionate attention regardless of semantic
  content — the attention-level grounding for "beginning of context is
  privileged."
- Lu et al., *Fantastically Ordered Prompts and Where to Find Them*,
  [arXiv:2104.08786](https://arxiv.org/abs/2104.08786). Identical few-shot
  examples in different orders swing performance from near state-of-the-art to
  near random. Ordering is a real lever. (Measured on GPT-2/GPT-3-era models in
  classification settings; the magnitude on current instruct models is likely
  smaller, the direction holds.)
- Sclar et al., *Quantifying Language Models' Sensitivity to Spurious Features
  in Prompt Design*, [arXiv:2310.11324](https://arxiv.org/abs/2310.11324).
  Formatting choices alone cause double-digit accuracy swings. Supports the CLI
  emitting a deterministic, consistent packet shape rather than leaving
  assembly ad hoc per session.

**Honesty note:** the literature establishes that position and order matter a
lot. It does not establish that *Ghost's* order (stance → materials → rules →
guards → skeletons) is the best one. That order is derived from the position
results plus the continuation argument in §8, and it is testable: permute
packet order on a fixed task set and grade adherence.

---

## 4. Materials for facts: models invent what they were never taught

**Ghost claims:** models have thin, unreliable knowledge of niche APIs,
internal design systems, and private tokens; no amount of "stay on brand" fixes
missing facts; `materials` exists to close knowledge gaps, not to exhort.

**Tier: Established.**

- Kandpal et al., *Large Language Models Struggle to Learn Long-Tail
  Knowledge*, [arXiv:2211.08411](https://arxiv.org/abs/2211.08411). Ability to
  answer factual questions correlates strongly with how often the fact appears
  in pretraining data. An internal token name that appeared zero times will be
  replaced with a plausible invention. The single best citation for the
  inventory/materials layer.
- Meng et al., *Locating and Editing Factual Associations in GPT* (ROME),
  [arXiv:2202.05262](https://arxiv.org/abs/2202.05262). Factual knowledge is
  stored as localized associations in weights — grounding for "the model does
  not know your brand as a stable object" and for why context injection, not
  instruction, is the fix for a knowledge gap.
- Xu et al., *Hallucination is Inevitable: An Innate Limitation of Large
  Language Models*, [arXiv:2401.11817](https://arxiv.org/abs/2401.11817). A
  formal, computability-theoretic argument that hallucination cannot be fully
  trained away. Supports the structural stance that grounding plus post-hoc
  review is necessary — you cannot prompt your way to a model that never
  invents.

---

## 5. Exemplars: pattern continuation over instruction

**Ghost claims:** exemplars are a strong generation-time signal; the model
absorbs structure, rhythm, and code shape from examples and continues in that
pattern; exemplars need annotation or the model copies accidents as brand.

**Tier: Established** for demonstrations conditioning output strongly and for
structure/format being what gets absorbed. **Adjacent** for "often the
strongest generation-time signal" in open-ended design work.

- Brown et al., *Language Models are Few-Shot Learners*,
  [arXiv:2005.14165](https://arxiv.org/abs/2005.14165). The origin of
  in-context demonstrations as a steering mechanism.
- Min et al., *Rethinking the Role of Demonstrations: What Makes In-Context
  Learning Work?*, [arXiv:2202.12837](https://arxiv.org/abs/2202.12837). In
  classification settings, what the model uses from demonstrations is largely
  the **format, input distribution, and label space** — the structure — more
  than the literal input-label mapping. This is why "normative for rhythm, not
  for the exact words" works: structure transfers regardless. It is also why
  unannotated exemplars are dangerous — the model absorbs *everything*
  structural, including the accidents.
- Xie et al., *An Explanation of In-context Learning as Implicit Bayesian
  Inference*, [arXiv:2111.02080](https://arxiv.org/abs/2111.02080), and Dai et
  al., *Why Can GPT Learn In-Context?*,
  [arXiv:2212.10559](https://arxiv.org/abs/2212.10559). Two mechanism accounts
  of why demonstrations condition generation so strongly: they locate a latent
  concept learned in pretraining / behave like implicit fine-tuning. These are
  theoretical accounts, not settled fact, but both predict the same practical
  behavior we rely on.

**Honesty note:** the ranking claim — exemplars beating prose instructions for
*open-ended design generation* specifically — is an extrapolation from
classification and structured-task results. We hold it as a strong prior and
state it as a design stance ("highest-leverage"), not a measured ordering.
Cheap experiment: same brand truth expressed as (a) prose principle only,
(b) prose + annotated exemplar, on a fixed generation task; blind-grade.

---

## 6. Anti-goals, gravity wells, and AI sameness

**Ghost claims:** models regress toward the mean of training data (generic
cards, bootstrap-blue buttons); positive adjectives do not escape the well;
specific negation prunes it; coherence is not originality, so deliberate
novelty must be injected by humans.

**Tier: Established** for mode-seeking genericness and diversity loss.
**Adjacent** for the negation caveat. **Prior** for "specific negation prunes
better than positive adjectives" as stated.

- Holtzman et al., *The Curious Case of Neural Text Degeneration*,
  [arXiv:1904.09751](https://arxiv.org/abs/1904.09751).
  Likelihood-maximization produces generic, repetitive text — the formal
  version of the gravity well.
- Kirk et al., *Understanding the Effects of RLHF on LLM Generalisation and
  Diversity*, [arXiv:2310.06452](https://arxiv.org/abs/2310.06452). RLHF
  improves generalization but measurably **reduces output diversity**. The
  strongest citation for "AI sameness" being a property of aligned models, and
  the direct motivation for the deliberate-novelty bucket: the system will not
  produce non-median moves on its own.
- Padmakumar & He, *Does Writing with Language Models Reduce Content
  Diversity?*, [arXiv:2309.05196](https://arxiv.org/abs/2309.05196). Model
  assistance homogenizes what *humans* produce — the downstream brand-erosion
  argument for why steering artifacts matter at all.
- Kassner & Schütze, *Negated and Misprimed Probes for Pretrained Language
  Models*, [arXiv:1911.03343](https://arxiv.org/abs/1911.03343). Older LMs
  handle negation poorly, and naming a concept — even to reject it — primes
  it. **This is the citable basis for the guard rule in the skill bundle:
  never state only the rejected pattern; state the positive replacement.**
  Evidence is on BERT-era models; modern instruct models are meaningfully
  better at negation, but "mentioning primes" remains directionally true and
  the design rule costs nothing.
- Si et al., *Design2Code*, [arXiv:2403.03163](https://arxiv.org/abs/2403.03163).
  Benchmark evidence that frontend generation has systematic, measurable
  fidelity failures against a given design — the closest published grounding
  for the frontend gravity well specifically.

**Honesty note:** we have no benchmark showing that concrete anti-goals
("no rounded-xl card grids on gray-50") outperform positive adjectives
("modern, clean") at escaping generic output. It follows from the diversity
and priming results and matches consistent practitioner experience, but it is
a Prior. Cheap experiment: same task with adjective-only vs. anti-goal-only
steering; count generic-pattern occurrences.

---

## 7. Invariants: short, concrete, checkable

**Ghost claim:** invariants work best when short, concrete, numeric where
possible, and mirrored by review checks; "if it cannot be reviewed, it may not
be an invariant yet."

**Tier: Established** for verifiability as the load-bearing property.

- Zhou et al., *Instruction-Following Evaluation for Large Language Models*
  (IFEval), [arXiv:2311.07911](https://arxiv.org/abs/2311.07911). The standard
  instruction-following benchmark is built **entirely on verifiable
  instructions** (exact counts, always/never, checkable formats) precisely
  because vague instructions cannot be evaluated. The same reasoning as our
  invariant form: an unfalsifiable rule is not yet a rule.

---

## 8. Early commitment: skeletons and structural steering

**Ghost claims:** autoregressive generation commits early; the first tokens of
an output constrain everything after; starting from a pulled Skeleton verbatim
controls structure better than describing structure.

**Tier: Prior**, with mechanistic grounding. This is the weakest-cited claim
in the steering doc and we should say so.

- Vaswani et al., *Attention Is All You Need*,
  [arXiv:1706.03762](https://arxiv.org/abs/1706.03762). The autoregressive
  factorization itself: every token is conditioned on all previous tokens.
  Early commitments constraining later ones is definitional, not empirical.
- Ranzato et al., *Sequence Level Training with Recurrent Neural Networks*,
  [arXiv:1511.06732](https://arxiv.org/abs/1511.06732). Exposure bias: errors
  and choices early in a generated sequence compound, because the model
  conditions on its own prior output.
- Press et al., *Measuring and Narrowing the Compositionality Gap in Language
  Models*, [arXiv:2210.03350](https://arxiv.org/abs/2210.03350). Errors
  compound across dependent steps — indirect support for controlling the first
  structural commitment rather than correcting downstream.

**Honesty note:** "hand the model a skeleton and it stays in that structure"
is a strong practitioner prior with mechanistic plausibility, not a
benchmarked result for UI/design generation. Cheap experiment: fixed task,
(a) prose structural description vs. (b) verbatim skeleton start; measure
structural adherence. If we ever want to state this as fact in public docs,
run that first.

---

## 9. Decision traces: teaching the tradeoff function

**Ghost claim:** worked reasoning examples ("we chose command palette over
drawer because…") teach the model *how the brand decides*, not just what it
produces; models imitate reasoning traces as well as outputs.

**Tier: Established** that demonstrated reasoning steers model reasoning.
**Adjacent** for brand-tradeoff transfer specifically.

- Wei et al., *Chain-of-Thought Prompting Elicits Reasoning in Large Language
  Models*, [arXiv:2201.11903](https://arxiv.org/abs/2201.11903). Demonstrated
  reasoning in context changes how the model reasons, not just what it
  answers. Decision traces are brand-domain chain-of-thought exemplars.
- Zelikman et al., *STaR: Bootstrapping Reasoning With Reasoning*,
  [arXiv:2203.14465](https://arxiv.org/abs/2203.14465). Reasoning traces are
  themselves effective training/steering signal — showing *how* a conclusion
  was reached transfers better than stating the conclusion.

**Honesty note:** CoT results are on math/logic/symbolic tasks. That a worked
design tradeoff transfers the brand's *choice function* to novel conflicts is
an extrapolation we believe but have not measured.

---

## 10. Checks: external review loops work; self-correction alone does not

**Ghost claims:** a generate → review → repair loop is more reliable than
perfecting the first sample; checks are advisory packets graded by an agent;
checks must be grounded in specific fingerprint nodes.

**Tier: Established**, including the caveat that makes Ghost's specific design
necessary.

- Madaan et al., *Self-Refine: Iterative Refinement with Self-Feedback*,
  [arXiv:2303.17651](https://arxiv.org/abs/2303.17651), and Shinn et al.,
  *Reflexion*, [arXiv:2303.11366](https://arxiv.org/abs/2303.11366).
  Iterative feedback loops outperform single-shot generation across many
  tasks.
- Bai et al., *Constitutional AI: Harmlessness from AI Feedback*,
  [arXiv:2212.08073](https://arxiv.org/abs/2212.08073). The closest
  architectural precedent for the checks haunt: explicit written principles
  applied at **critique time** to revise outputs, rather than stuffed into the
  generation prompt.
- Zheng et al., *LLM-as-a-Judge with MT-Bench and Chatbot Arena*,
  [arXiv:2306.05685](https://arxiv.org/abs/2306.05685). Model-as-grader
  agrees with human raters at usable rates — and has known biases (position,
  verbosity, self-enhancement). Grounds "advisory packet for the host agent to
  judge" and warns why check results are advisory, not authoritative.
- Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet*,
  [arXiv:2310.01798](https://arxiv.org/abs/2310.01798). **The caveat that
  validates the design:** intrinsic self-correction — "review your own work"
  with no external signal — often makes outputs *worse*. Review loops work
  when the critique is grounded in an external criterion. This is exactly why
  checks carry `references` to specific fingerprint nodes and concrete
  flag-conditions, instead of asking the agent to vibe-check itself.

---

## 11. Checks never leak into generation

**Ghost claim:** if checks appear in `gather`, the model writes to the test
and the review signal collapses (purposes.md, leak #4).

**Tier: Established** as a general principle of measurement.

- Manheim & Garrabrant, *Categorizing Variants of Goodhart's Law*,
  [arXiv:1803.04585](https://arxiv.org/abs/1803.04585). When a measure becomes
  a target, it ceases to be a good measure — formalized into variants. The
  feed-forward/feed-back separation in Ghost is a Goodhart firewall: checks
  retain diagnostic value only while the generator does not optimize against
  them.

**Honesty note:** Goodhart is a principle about optimization pressure, not an
LLM benchmark. A single generation pass that has seen a check is not
"optimizing" in the RL sense; the leak risk compounds over repair loops and
over authoring (checks drifting into de facto guidance). The architectural
rule is cheap insurance justified by the principle, and we should describe it
that way.

---

## Claims we deliberately do not cite

Listed so nobody back-fills a weak citation later.

1. **The full steering hierarchy** (examples > constraints > scaffolding >
   persona framing > quality adjectives). Each pairwise edge has partial
   support above, but no paper establishes the total order. It is a synthesis.
   Public docs should say "consistent with the literature," never "shown by."
2. **BYOA over built-in selection.** The choice to let the host agent select
   nodes rather than ship an embedded retriever is architectural (simplicity,
   agent context-awareness, no NLP in the CLI), defended in
   [purposes.md](./purposes.md). The retrieval literature validates
   retrieve-then-generate; it does not adjudicate who should do the
   retrieving.
3. **Flat corpus over hierarchy/graph.** No paper compares flat prose corpora
   against hierarchical knowledge bases as LLM steering input. Our argument is
   about authoring cost, leak prevention, and projection freedom — an
   engineering argument, not a model-science one.
4. **Descriptions in task language retrieve better than poetic descriptions.**
   Almost certainly true by analogy to tool-description and retrieval-query
   findings, but we have not seen it isolated in a study. Our own
   `.ghost/.events` pulse data is the honest evidence source here: misses and
   unused pulls are the experiment already running.
5. **Vendor guidance** (Anthropic's prompt-engineering and agent-building
   posts, OpenAI's prompting guides). Aligned with our stances on ordering,
   examples-over-adjectives, and determinism-in-the-harness, and worth reading
   — but they are industry practice documents, not validation, and we cite
   them nowhere as evidence.

---

## Open experiments

The Prior-tier claims above, collected. Each is cheap to run against a fixture
fingerprint and a fixed task set, blind-graded:

| # | Claim | Experiment |
| --- | --- | --- |
| 1 | 3–5 node pull budget | Pull sets of 3 / 6 / 10 nodes, grade adherence and genericness. |
| 2 | Ghost's packet order | Permute pull emission order, grade adherence. |
| 3 | Skeleton-verbatim start controls structure | Prose structure description vs. verbatim skeleton start, measure structural adherence. |
| 4 | Anti-goals beat adjectives | Adjective-only vs. anti-goal-only steering, count generic-pattern occurrences. |
| 5 | Exemplar > prose principle for design output | Same truth as prose vs. prose + annotated exemplar, blind-grade. |

Results, when we have them, should be recorded here and the corresponding
claims promoted or revised — in the steering doc as well as this one.
