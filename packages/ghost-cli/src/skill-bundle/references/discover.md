# Recipe: Discover public design systems

**Goal:** find public design systems matching a query — for benchmarking, inspiration, or competitive analysis.

Ghost's CLI does not search the web. You do, using your host harness's web-search capability.

## Steps

### 1. Search

Use WebSearch (or whatever search tool your harness provides) for:

- "<query> design system"
- "<query> component library"
- "<query> figma library"

Collect candidate systems with: name, URL, public repo (if any), brief description.

### 2. Filter

Drop: toy repos, single-component libraries, abandoned projects (last commit > 2 years), paywalled systems with no public assets.

Keep: systems with public token files, published component libraries, documented design principles, or public Figma files.

### 3. (Optional) Profile

For each kept candidate, if the user wants fingerprint-level detail:

- Clone or fetch the public repo.
- Run the [profile recipe](profile.md) against it.
- Save the resulting `fingerprint.md` somewhere named for the system (e.g. `discovered/linear.fingerprint.md`).

Then compare against the user's fingerprint:

    ghost compare my-fingerprint.md discovered/linear.fingerprint.md --semantic

### 4. Report

Summarize findings as a small table: name, URL, one-line character description, optional distance to the user's fingerprint.
