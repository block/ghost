# vessel-light

vessel-light packages Vessel's design language for agents writing raw HTML and CSS. It has no install, build, or dependencies. Copy the `.ghost/` package into a repo so your agent can select and apply Vessel's guidance, tokens, primitives, and worked compositions.

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

The corpus is factored by rate of change under adaptation: `foundation.*` nodes carry Vessel's load-bearing decisions — value-free decision logic that survives any adaptation, plus the identity dials (shape, palette, type, temperature), each stating Vessel's current answer; `context.*` nodes are named situations that re-tune the contract; `standard.model-defaults` is the model's measured shared defaults (prune lines your brand legitimately violates) and `foundation.tells` guards near-misses of Vessel's own signature. Every literal value lives in `materials/tokens.css`.

## Curation

Each example says what to keep and what to change. Together they demonstrate every closed set the foundations enumerate: the emphasis ladder, text variants, tones, and elevation tiers. Regenerate examples whenever tokens or answered foundation values change. Add one when repeated work proves a gap, not because a surface might exist someday.
