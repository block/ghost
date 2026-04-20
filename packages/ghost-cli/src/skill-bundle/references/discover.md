---
name: discover
description: Find public design languages matching a query — for benchmarking, inspiration, or adoption.
handoffs:
  - label: Profile a discovered system into its own fingerprint.md
    skill: profile
    prompt: Profile the discovered system into a fingerprint.md under discovered/
  - label: Compare my fingerprint against a discovered system
    skill: compare
    prompt: Compare my fingerprint.md against the discovered system's fingerprint with --semantic
---

# Recipe: Discover public design languages

**Goal:** find public design languages matching a query — for benchmarking, inspiration, or competitive analysis.

Ghost's CLI does not search the web. You do, using your host harness's web-search capability.

## Steps

### 1. Search

Use WebSearch (or whatever search tool your harness provides) for:

- "<query> design language"
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
