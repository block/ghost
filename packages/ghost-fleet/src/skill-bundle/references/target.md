# Reasoning over a fleet of monolithic targets

This fragment guides the world-model narrative for a fleet whose members are each **monolithic targets** — one repo, one expression. It's the only profiling mode supported in the current milestone; modular and rollup fragments arrive when the modular profile pathway lands.

The CLI hands you `fleet.md` with frontmatter populated and three empty body sections: `## World shape`, `## Cohorts`, `## Tracks`. Your job is to fill those sections with prose that's grounded in the frontmatter — never restating it.

## Read the frontmatter first

The frontmatter holds five structured pieces. Read all five before writing a sentence.

1. `members` — id, platform, build_system, registry presence, expression mtime. Confirm coverage matches what `ghost-fleet members` told you. Members in the table that aren't here mean you've got an orphan map.md or a broken expression.

2. `distances` — pairwise array, sorted ascending by `(a, b)`. Each entry is `{a, b, distance}` where distance is in [0, 1] roughly: the cosine-derived embedding distance between two expressions. Treat the numbers as *relative* — there is no universal threshold for "drifted." Look at the distribution.

3. `tracks` — directed edges from each member's `.ghost-sync.json`. The right-hand side is whatever the member declared (a member id, a target string, or a local path). You decide whether the edge resolves to another member.

4. `groupings.by_platform` / `by_build_system` / `by_registry` / `by_rendering` / `by_styling` — the five axes the CLI reads from each `map.md`. These are your cohort scaffolding.

5. `generated_at` — note staleness. If the timestamp is more than a few weeks old and individual `expression_at` dates are even older, say so.

## World shape — the elevation view

Two paragraphs. Anchor each claim in a number from `distances` or a group-by table.

Three questions to answer:

- **Where does the fleet center?** Look at the median pairwise distance. Tight (e.g., median < 0.10) means a coherent family. Wide (median > 0.30) means several distinct languages coexist. Don't say "tight" or "wide" without naming the median.
- **How is it shaped?** Is the spread uniform, or are there one or two outliers pulling the mean? Look at the max distance vs the median.
- **What account axes drive the distances?** Cross-reference the largest distances against the group-by tables. Big distances between platforms? Between registries? Between two specific members regardless of axis?

Distance is data, not blame. Don't moralize. "Tidal pulls away from the Cash family on warmth and density" beats "Tidal is drifting too far."

## Cohorts — the cluster narrative

For the milestone, fleet does **not** emit clusters in frontmatter — clustering is a projection you compute over `distances` + `groupings`. Two valid approaches:

- **Group-by-derived cohorts.** Use the axes the CLI already gave you. "All web members on shadcn" is a cohort. "All ios members" is a cohort. This is the safer narrative when the fleet is small or the axes are imbalanced.
- **Distance-derived cohorts.** Read the pairwise array. Members whose distances to each other are below the fleet median, while distances to outsiders are above it, form a cohort. Name three or four; don't try to enumerate all of them.

For each cohort, write one sentence on what binds them and one sentence on the inside outlier (if any). The outlier dimension matters more than the cohort name — readers care about what to look at next.

## Tracks — narrative over the graph

Read `tracks` and answer:

- **Who declares whom?** Resolve edges to member ids when possible. An edge `{from: "cash-web", to: "cash-design-system"}` is informative when both ids appear in `members`; less informative when `to` is `github:org/repo` and the parent is external.
- **Are there leaves?** Members nobody tracks. Sometimes a leaf is a parent (the canonical reference everyone else tracks); sometimes it's an orphan that nobody references. The graph alone can't distinguish — name the candidates and let the reader decide.
- **Are there loops?** A → B → A is rare and worth flagging. It usually means two members consider each other reference, which is governance noise.
- **Cross-cohort references?** A member from the "ios" cohort tracking a member in the "web" cohort is interesting. Note the cross-reference and which cohort it bridges.

## Heuristics worth codifying

- When the fleet has fewer than four members, "cohorts" is a stretch. Be honest — say "too small for cohorts; here are the pairwise distances directly."
- When two distances are within a hair of each other (e.g., 0.15 and 0.16), don't pretend the difference matters. Ranking matters; tiny gaps don't.
- Group-by axes can be imbalanced. If 9 of 10 members are `platform: web`, the platform axis isn't doing useful work. Switch to a different axis or fall back to distance-derived cohorts.
- The `tracks` graph is sparse by design. Most members won't have a track target. That's fine — say so once and move on.

## Always

- Cite. Every claim in the body should be traceable to a number in the frontmatter or to an axis bucket.
- Use the same member ids the frontmatter uses. Don't rename.
- Keep the partition. Numbers in frontmatter; interpretation in body.

## Never

- Never invent a distance you didn't see. If the pairwise array doesn't have a number, don't claim one.
- Never replace the frontmatter with prose. The frontmatter is the artifact; the body annotates it.
- Never call drift "bad" or "good" without a stance from the user. Fleet is a measuring tool, not a leaderboard.
