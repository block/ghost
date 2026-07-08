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

## Curation

Refs exist only where freehand agents drift: form composition, conversation grammar, and overlays. Primitives are the steering layer. Promote a new ref when repeated work proves a gap; do not add coverage upfront because a surface might exist someday.
