---
name: create-pr
description: >-
  Create a GitHub pull request for the Ghost repo from the current branch:
  inspect branch changes, handle scoped commits, verify release and Ghost
  review requirements, push safely, and open a draft PR. Use when the user says
  "create PR", "open PR", "submit PR", "push PR", "make a pull request", or
  asks to publish the current Ghost branch for review.
---

# Create PR

Create a GitHub pull request for the Ghost repo from the current branch. Prefer
a draft PR unless the user explicitly asks for a ready PR and validation has
passed.

The goal is to make agent-authored PRs easy to review: explain the product or
developer intent, account for every changed file, show validation, and preserve
the release hygiene expected by this repo.

## Step 1: Resolve Base Branch

Before changing anything, identify the PR base branch.

1. Prefer the branch's upstream base if it is clear from local Git metadata.
2. Otherwise use the repository default branch from `git remote show origin`.
3. Fall back to `origin/main` only if the repo does not expose a default branch.

Fetch the base ref when needed. If the branch is stale relative to the base,
tell the user and ask whether to proceed, rebase, or merge first.

Use merge-base semantics for all branch summaries and PR body evidence:

```bash
git merge-base <base> HEAD
git log <merge-base>..HEAD --oneline
git diff <base>...HEAD --stat
git diff <base>...HEAD
```

## Step 2: Check Worktree And Scope

Run `git status --short --branch`.

If there are staged, unstaged, or untracked changes:

- Show the outstanding paths to the user.
- Separate changes that belong to this PR from unrelated local work.
- Never stage or commit unrelated user changes.
- If committing is needed, stage only the relevant paths and write a concise
  imperative commit message.
- If the scope is ambiguous, pause and ask what should be included.

If there are no uncommitted changes, continue.

## Step 3: Gather Branch Context

Run these in parallel where possible:

1. `git rev-parse --abbrev-ref HEAD`
2. `git remote -v`
3. `git status --short --branch`
4. `git merge-base <base> HEAD`
5. `git log <merge-base>..HEAD --oneline`
6. `git diff <base>...HEAD --stat`
7. `git diff <base>...HEAD`

Before pushing, verify that `origin` points to a Block-managed GitHub
organization for this repo, normally `git@github.com:block/ghost.git` or an
equivalent `https://github.com/block/ghost` remote. Do not push Ghost source to
personal or non-Block repositories.

## Step 4: Check Release Hygiene

Ghost publishes only `@anarchitecture/ghost-fingerprint`; private packages are ignored by
Changesets.

Inspect the diff and decide whether a changeset is required:

- Required: user-visible changes to the public package, including CLI behavior,
  public exports, schema behavior, package output, docs that affect users, or
  fixes shipped through `@anarchitecture/ghost-fingerprint`.
- Usually not required: tests only, internal scripts only, private package only,
  CI-only changes, or docs/ideas notes that are not release-facing.

When a changeset is required, create one before the PR:

```markdown
---
"@anarchitecture/ghost-fingerprint": patch
---

One sentence, user-facing, present tense.
```

Use `patch` for fixes and docs, `minor` for new commands, flags, exports, or
public capabilities, and `major` for removed or renamed public behavior.

If commands, flags, help text, or CLI summaries changed, run:

```bash
pnpm dump:cli-help
```

Include `apps/docs/src/generated/cli-manifest.json` if it changes.

## Step 5: Validate

Choose validation based on the diff. Prefer running all relevant checks before
opening the PR. If a command is too expensive or unavailable, say so in the PR
body and tell the user.

Common validation:

```bash
pnpm build
pnpm test
pnpm check
```

Ghost-specific validation:

```bash
ghost check --base <base>
ghost review --base <base> --include-memory
```

If `ghost` is not on `PATH`, build first and use the local CLI:

```bash
node packages/ghost/dist/bin.js check --base <base>
node packages/ghost/dist/bin.js review --base <base> --include-memory
```

Run `ghost check` for implementation or fingerprint changes that can affect a
surface. Run `ghost review` when the change touches UI generation behavior,
fingerprint semantics, review packets, composition rules, docs about Ghost's
surface model, or anything where advisory drift context would help reviewers.

For fingerprint edits, also run:

```bash
ghost lint .ghost
ghost verify .ghost --root .
```

Only active deterministic `ghost check` failures block. Advisory
`ghost review` findings should be summarized as review context, not treated as
CI failures unless tied to an active check.

## Step 6: Optional Issue Tracking

Keep issue tracking lightweight and outside the PR body.

1. Look for an explicit issue key or URL in the user request, branch name,
   commit messages, or changed-file context.
2. If one issue clearly matches this branch, link the PR after creation when
   tooling is available.
3. If no issue is clear, continue without one unless the user asks to create or
   attach an issue.
4. If issue tooling is unavailable, do not block PR creation.

## Step 7: Generate PR Title And Body

Generate a concise title under 72 characters. Use imperative mood and make the
intent clear, for example:

```text
preserve accepted memory in review packets
```

Write from the perspective of a product-minded maintainer explaining the why to
engineers. Be concise and grounded in the branch diff.

Use this body structure:

```markdown
**Category:** new-feature | improvement | fix | infrastructure
**User Impact:** One standalone sentence a non-technical stakeholder could understand.
**Problem:** The user-facing, maintainer-facing, or agent-facing friction this PR addresses.
**Solution:** How the change resolves it, including brief rationale when useful.

**Validation:**
- `command`: result

**Changeset:** added | not needed because ...

**Ghost Review:**
- `ghost check --base <base>`: result | not run because ...
- `ghost review --base <base> --include-memory`: result | not run because ...

<details>
<summary>File changes</summary>

**path/to/file.ts**
What changed and why.

**path/to/other.md**
What changed and why.

</details>

**Screenshots/Demos:** N/A | link or description | not captured because ...
```

Guidelines:

- Keep Problem and Solution to 2-4 sentences total.
- List every changed file in the collapsible section.
- Focus file notes on intent and reviewer orientation, not line-by-line
  implementation details.
- Use `N/A` for Screenshots/Demos when no visual surface changed.
- Do not include issue-linking bookkeeping in the PR body unless the repo
  already expects it.

## Step 8: Push And Create PR

Push the branch if it has not been pushed:

```bash
git push -u origin HEAD
```

Create the PR with the generated title and body. Prefer `gh pr create --draft`
unless the user explicitly asked for a ready PR and validation is complete.

Use a body file or heredoc to preserve formatting. After creation, output the PR
URL as a clickable link and mention any skipped validation, missing issue link,
or advisory Ghost review finding the user should know about.

## Tone

Be crisp, calm, and concrete. The reviewer can read the code; the PR body should
explain the intent, release impact, validation state, and the few choices that
would otherwise take extra time to infer.
