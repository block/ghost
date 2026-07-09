# vessel-light

vessel-light is Vessel's design language as a locked-and-loaded `.ghost/` fingerprint for agents writing raw HTML/CSS. No package. No build. No dependencies. Copy the fingerprint into a repo, hand it to `ghost`, and make the agent style with the same tokens, primitives, and worked compositions Vessel uses.

## Copy

```bash
npx degit <repo>/packages/vessel-light/.ghost .ghost
```

Or copy it without degit:

```bash
cp -R packages/vessel-light/.ghost .ghost
```

## Loop

```bash
ghost gather
ghost pull <selected-node> [...]
# generate HTML/CSS
ghost review
```

## Structure

The corpus is factored by rate of change under rebrand: `grammar.*` nodes are value-free decision logic that survives any fork; `signature.*` nodes are the identity dials (shape, palette, type, temperature), each stating Vessel's current answer; `register.*` nodes are named conditions that re-tune the contract; `anti-goal.median` is the model's measured defaults (prune lines your brand legitimately violates) and `anti-goal.tells` guards near-misses of Vessel's own signature. Every literal value lives in `materials/tokens.css`.

## Curation

Each ref carries an annotation header declaring what it is normative for and what is incidental; together the refs demonstrate every closed set the grammar enumerates (the emphasis ladder, text variants, tones, elevation tiers). Regenerate refs whenever tokens or signature nodes change — a stale exemplar steers harder than any prose. Promote a new ref when repeated work proves a gap; do not add coverage upfront because a surface might exist someday.
