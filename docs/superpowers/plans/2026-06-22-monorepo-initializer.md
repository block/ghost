# Monorepo Initializer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ghost init --monorepo` as a safe, opt-in initializer that creates the root package, detects workspace child package roots, and prints or applies scoped child initialization.

**Architecture:** Add a focused monorepo detector under `packages/ghost/src/scan/` that reads deterministic workspace metadata only. Wire `init --monorepo` in `fingerprint-commands.ts`, reusing existing root and scoped package initialization helpers. Keep default mode plan-only, with `--apply` required for child writes.

**Tech Stack:** TypeScript, CAC CLI, Node `fs/promises`, YAML parsing via existing `yaml`, Vitest CLI tests, generated CLI manifest.

## Global Constraints

- Plain `ghost init` must keep current behavior.
- `ghost init --monorepo` is opt-in.
- Default monorepo mode prints proposed child commands and does not write child packages.
- `ghost init --monorepo --apply` writes child packages.
- Detection uses `pnpm-workspace.yaml`, `package.json` array workspaces, and `package.json` object workspaces only.
- Detection must ignore `node_modules`, hidden directories, duplicate candidates, and candidates without `package.json`.
- No interactive prompts.
- No arbitrary folder-name guessing in the first version.
- `--monorepo --scope <path>` and `--monorepo [dir]` are invalid combinations.

---

### Task 1: Monorepo Workspace Detector

**Files:**
- Create: `packages/ghost/src/scan/monorepo-init.ts`
- Modify: `packages/ghost/src/scan/index.ts`
- Test: `packages/ghost/test/cli.test.ts`

**Interfaces:**
- Produces: `detectMonorepoInitCandidates(root: string): Promise<MonorepoInitCandidate[]>`
- Produces: `MonorepoInitCandidate = { path: string; source: "package-json" | "pnpm-workspace"; packageJson: string }`
- Consumes: Node filesystem APIs and `yaml.parse`

- [x] **Step 1: Write failing tests**

Add CLI tests near existing `init` tests:

```ts
it("init --monorepo detects package.json array workspaces without creating children by default", async () => {
  await mkdir(join(dir, "apps", "checkout"), { recursive: true });
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ workspaces: ["apps/*"] }, null, 2),
  );
  await writeFile(
    join(dir, "apps", "checkout", "package.json"),
    JSON.stringify({ name: "checkout" }, null, 2),
  );

  const result = await runCli(["init", "--monorepo", "--format", "json"], dir);

  expect(result.code).toBe(0);
  const out = JSON.parse(result.stdout);
  expect(out.mode).toBe("plan");
  expect(out.candidates).toEqual([
    {
      path: "apps/checkout",
      source: "package-json",
      packageJson: "apps/checkout/package.json",
      state: "candidate",
    },
  ]);
  expect(out.commands).toEqual(["ghost init --scope apps/checkout"]);
  await expect(
    readFile(join(dir, ".ghost", "fingerprint", "manifest.yml"), "utf-8"),
  ).resolves.toContain("ghost.fingerprint-package/v1");
  await expect(
    readFile(
      join(dir, "apps", "checkout", ".ghost", "fingerprint", "manifest.yml"),
      "utf-8",
    ),
  ).rejects.toThrow();
});

it("init --monorepo detects pnpm workspace packages", async () => {
  await mkdir(join(dir, "packages", "admin"), { recursive: true });
  await writeFile(join(dir, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
  await writeFile(
    join(dir, "packages", "admin", "package.json"),
    JSON.stringify({ name: "admin" }, null, 2),
  );

  const result = await runCli(["init", "--monorepo", "--format", "json"], dir);

  expect(result.code).toBe(0);
  expect(JSON.parse(result.stdout).candidates).toEqual([
    {
      path: "packages/admin",
      source: "pnpm-workspace",
      packageJson: "packages/admin/package.json",
      state: "candidate",
    },
  ]);
});
```

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm vitest run packages/ghost/test/cli.test.ts -- -t "init --monorepo"
```

Expected: FAIL because `--monorepo` is unknown and detector output does not exist.

- [x] **Step 3: Implement detector**

Create `monorepo-init.ts` with:

```ts
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";

export interface MonorepoInitCandidate {
  path: string;
  source: "package-json" | "pnpm-workspace";
  packageJson: string;
}

export async function detectMonorepoInitCandidates(
  root: string,
): Promise<MonorepoInitCandidate[]> {
  const candidates = new Map<string, MonorepoInitCandidate>();
  for (const pattern of await readPackageJsonWorkspacePatterns(root)) {
    for (const path of await expandWorkspacePattern(root, pattern)) {
      candidates.set(path, {
        path,
        source: "package-json",
        packageJson: `${path}/package.json`,
      });
    }
  }
  for (const pattern of await readPnpmWorkspacePatterns(root)) {
    for (const path of await expandWorkspacePattern(root, pattern)) {
      if (!candidates.has(path)) {
        candidates.set(path, {
          path,
          source: "pnpm-workspace",
          packageJson: `${path}/package.json`,
        });
      }
    }
  }
  return [...candidates.values()].sort((a, b) => a.path.localeCompare(b.path));
}
```

Implement helpers for JSON/YAML pattern reading, one-segment trailing wildcard expansion, exact path expansion, root containment, hidden directory and `node_modules` filtering, and `package.json` existence.

- [x] **Step 4: Export detector**

Add to `packages/ghost/src/scan/index.ts`:

```ts
export type { MonorepoInitCandidate } from "./monorepo-init.js";
export { detectMonorepoInitCandidates } from "./monorepo-init.js";
```

- [x] **Step 5: Run focused tests**

Run:

```bash
pnpm vitest run packages/ghost/test/cli.test.ts -- -t "init --monorepo"
```

Expected: detector tests still fail until CLI wiring is added.

### Task 2: CLI Monorepo Init Wiring

**Files:**
- Modify: `packages/ghost/src/fingerprint-commands.ts`
- Test: `packages/ghost/test/cli.test.ts`

**Interfaces:**
- Consumes: `detectMonorepoInitCandidates(root)`
- Produces JSON output with `root`, `mode`, `memoryDir`, `candidates`, `created`, `skipped`, `errors`, and `commands`

- [x] **Step 1: Add command options and invalid combinations**

Extend init command options:

```ts
.option("--monorepo", "Detect monorepo child package roots and propose scoped Ghost packages")
.option("--apply", "With --monorepo, create detected child scoped packages")
```

In the action, reject:

```ts
if (opts.monorepo && dirArg) {
  console.error("Error: use either init [dir] or init --monorepo");
  process.exit(2);
  return;
}
if (opts.monorepo && typeof opts.scope === "string") {
  console.error("Error: use either init --scope <path> or init --monorepo");
  process.exit(2);
  return;
}
if (opts.apply && !opts.monorepo) {
  console.error("Error: --apply can only be used with --monorepo");
  process.exit(2);
  return;
}
```

- [x] **Step 2: Implement monorepo action branch**

Before existing single-package initialization, call a helper:

```ts
if (opts.monorepo) {
  const output = await initMonorepoFingerprintPackages({
    memoryDir: memoryDirFromOpts(opts),
    apply: Boolean(opts.apply),
    initOptions,
  });
  writeMonorepoInitOutput(output, opts.format);
  process.exit(output.errors.length > 0 ? 2 : 0);
  return;
}
```

Add local helper types and functions in `fingerprint-commands.ts` to:

- create or preserve the root package;
- detect candidates;
- mark candidates with `state: "candidate" | "exists"`;
- apply child initialization only when requested;
- catch child errors into `errors` instead of aborting the whole report;
- produce stable command strings.

- [x] **Step 3: Add apply and skip tests**

Add tests:

```ts
it("init --monorepo --apply creates detected child packages", async () => {
  await mkdir(join(dir, "apps", "checkout"), { recursive: true });
  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({ workspaces: { packages: ["apps/*"] } }, null, 2),
  );
  await writeFile(
    join(dir, "apps", "checkout", "package.json"),
    JSON.stringify({ name: "checkout" }, null, 2),
  );

  const result = await runCli(
    ["init", "--monorepo", "--apply", "--format", "json"],
    dir,
  );

  expect(result.code).toBe(0);
  const out = JSON.parse(result.stdout);
  expect(out.mode).toBe("apply");
  expect(out.created.map((entry: { path: string }) => entry.path)).toEqual([
    "apps/checkout",
  ]);
  await expect(
    readFile(
      join(dir, "apps", "checkout", ".ghost", "fingerprint", "manifest.yml"),
      "utf-8",
    ),
  ).resolves.toContain("ghost.fingerprint-package/v1");
});
```

Add invalid combination tests for `--monorepo custom-dir`, `--monorepo --scope apps/checkout`, and `--apply` without `--monorepo`.

- [x] **Step 4: Run focused tests**

Run:

```bash
pnpm vitest run packages/ghost/test/cli.test.ts -- -t "init --monorepo|initializes the default fingerprint package"
```

Expected: PASS.

### Task 3: Docs, Manifest, and Changeset

**Files:**
- Modify: `README.md`
- Modify: `apps/docs/src/content/docs/cli-reference.mdx`
- Modify: `docs/fingerprint-format.md`
- Modify: `apps/docs/src/generated/cli-manifest.json`
- Add: `.changeset/green-monorepos-init.md`

**Interfaces:**
- Consumes: finalized CLI help from Task 2
- Produces: user-facing documentation and release note

- [x] **Step 1: Update docs**

Document:

```bash
ghost init --monorepo
ghost init --monorepo --apply
```

Explain that `--monorepo` creates or preserves the root package, detects workspace child roots, and prints scoped init commands by default.

- [x] **Step 2: Regenerate CLI manifest**

Run:

```bash
pnpm dump:cli-help
```

Expected: generated manifest updates `init` options with `--monorepo` and `--apply`.

- [x] **Step 3: Add changeset**

Add a patch changeset:

```md
---
"@anarchitecture/ghost": patch
---

Add an opt-in monorepo initializer that detects workspace child package roots and can create scoped Ghost packages.
```

- [x] **Step 4: Run verification**

Run:

```bash
pnpm vitest run packages/ghost/test/cli.test.ts
pnpm check
```

Expected: PASS.

### Task 4: Commit Implementation

**Files:**
- All modified files from Tasks 1-3

**Interfaces:**
- Consumes: passing verification
- Produces: committed implementation on `chai/monorepo-initializer`

- [x] **Step 1: Review diff**

Run:

```bash
git -c core.fsmonitor=false diff --stat
git -c core.fsmonitor=false diff --check
```

Expected: no whitespace errors and diff only covers monorepo initializer work.

- [x] **Step 2: Commit**

Run:

```bash
git -c core.fsmonitor=false add packages/ghost/src packages/ghost/test README.md docs apps/docs .changeset docs/superpowers/plans/2026-06-22-monorepo-initializer.md
git -c core.fsmonitor=false commit -m "feat: add monorepo initializer"
```

Expected: commit succeeds after hooks.
