#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const QUALITY_GATE = "pnpm run quality:all";

function fail(message) {
  console.error(`check-release-workflows failed: ${message}`);
  process.exit(1);
}

function readWorkflow(name) {
  return readFileSync(join(ROOT, ".github", "workflows", name), "utf8");
}

function assertExactQualityGate(workflow, workflowName) {
  const commands =
    workflow.match(/^\s*(?:-\s*)?run:\s*pnpm run quality:all\s*$/gm) ?? [];
  if (commands.length !== 1) {
    fail(
      `${workflowName} must invoke exactly one authoritative quality gate as '${QUALITY_GATE}'`,
    );
  }
  if (/^\s*(?:-\s*)?run:\s*pnpm (?:run )?ci\s*$/m.test(workflow)) {
    fail(`${workflowName} must not invoke the retired pnpm ci command`);
  }
}

function assertOrder(workflow, workflowName, operations) {
  let previousIndex = -1;
  for (const [label, marker] of operations) {
    const index = workflow.indexOf(marker);
    if (index === -1) {
      fail(`${workflowName} is missing ${label}`);
    }
    if (index <= previousIndex) {
      fail(`${workflowName} must run ${label} after the preceding operation`);
    }
    previousIndex = index;
  }
}

const ciWorkflow = readWorkflow("ci.yml");
const releaseWorkflow = readWorkflow("release.yml");
const tarballWorkflow = readWorkflow("release-tarball.yml");
const friendlyTagAssignment = 'TAG="design-intelligence-ghost@$' + '{VERSION}"';
const releaseTarballPackCommand =
  'node scripts/pack-release-tarball.mjs "$GITHUB_WORKSPACE/dist-tarball"';
const tapAppSecretGate =
  "HAS_TAP_APP: $" +
  "{{ secrets.BLOCK_HOMEBREW_TAP_APP_ID != '' && secrets.BLOCK_HOMEBREW_TAP_PRIVATE_KEY != '' }}";
const strictSemverGuard = 'if (!semver.test(input ?? ""))';
const packageVersionRead =
  'const expected = require("./packages/ghost/package.json").version;';
const packageVersionGuard = "if (input !== expected)";

for (const [name, workflow] of [
  ["ci.yml", ciWorkflow],
  ["release.yml", releaseWorkflow],
  ["release-tarball.yml", tarballWorkflow],
]) {
  assertExactQualityGate(workflow, name);
}

assertOrder(releaseWorkflow, "release.yml", [
  ["the quality gate", QUALITY_GATE],
  ["Changesets publishing", "publish: pnpm changeset publish"],
  ["release tarball packing", releaseTarballPackCommand],
  ["GitHub Release upload", 'gh release upload "$TAG"'],
]);

assertOrder(tarballWorkflow, "release-tarball.yml", [
  ["the quality gate", QUALITY_GATE],
  ["strict semver validation", strictSemverGuard],
  ["package version comparison", packageVersionGuard],
  ["release tarball packing", releaseTarballPackCommand],
  ["tag resolution", 'TAG="design-intelligence-ghost@$INPUT_VERSION"'],
  ["GitHub Release creation", 'gh release create "$TAG"'],
]);

if (!releaseWorkflow.includes("publish: pnpm changeset publish")) {
  fail(
    "release.yml must publish through Changesets so the action can detect published packages and skip already-published versions",
  );
}

if (/publish:\s+npm publish\b/.test(releaseWorkflow)) {
  fail(
    "release.yml must not call npm publish directly because changesets/action will report published=false",
  );
}

if (!releaseWorkflow.includes("createGithubReleases: false")) {
  fail(
    "release.yml must let the tarball step own the friendly Homebrew GitHub Release instead of creating a second scoped Changesets release",
  );
}

if (
  !releaseWorkflow.includes("if: steps.changesets.outputs.published == 'true'")
) {
  fail("release.yml must attach tarballs only after a real npm publish");
}

if (!releaseWorkflow.includes(friendlyTagAssignment)) {
  fail(
    "release.yml must keep the Homebrew-friendly design-intelligence-ghost@<version> release tag",
  );
}

if (
  !releaseWorkflow.includes(
    'gh release upload "$TAG" dist-tarball/*.tgz --clobber',
  )
) {
  fail("release.yml must upload the packed .tgz asset to the GitHub Release");
}

if (!releaseWorkflow.includes(releaseTarballPackCommand)) {
  fail(
    "release.yml must publish the self-contained release tarball instead of the npm package tarball",
  );
}

if (!tarballWorkflow.includes(releaseTarballPackCommand)) {
  fail(
    "release-tarball.yml must publish the self-contained release tarball instead of the npm package tarball",
  );
}

if (!releaseWorkflow.includes(tapAppSecretGate)) {
  fail(
    "release.yml must gate the Homebrew tap bump on both GitHub App secrets",
  );
}

if (!tarballWorkflow.includes(packageVersionRead)) {
  fail(
    "release-tarball.yml must compare the dispatch version with packages/ghost/package.json",
  );
}

if (/^\s*push:/m.test(tarballWorkflow)) {
  fail("release-tarball.yml must stay dispatch-only to avoid release races");
}

console.log("check-release-workflows: release workflows are wired correctly");
