#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function fail(message) {
  console.error(`check-release-workflows failed: ${message}`);
  process.exit(1);
}

function readWorkflow(name) {
  return readFileSync(join(ROOT, ".github", "workflows", name), "utf8");
}

const releaseWorkflow = readWorkflow("release.yml");
const tarballWorkflow = readWorkflow("release-tarball.yml");
const friendlyTagAssignment = 'TAG="design-intelligence-ghost@$' + '{VERSION}"';
const releaseTarballPackCommand =
  'node scripts/pack-release-tarball.mjs "$GITHUB_WORKSPACE/dist-tarball"';
const tapAppSecretGate =
  "HAS_TAP_APP: $" +
  "{{ secrets.BLOCK_HOMEBREW_TAP_APP_ID != '' && secrets.BLOCK_HOMEBREW_TAP_PRIVATE_KEY != '' }}";
const ghostInternalAppSecretGate =
  "HAS_GHOST_INTERNAL_APP: $" +
  "{{ secrets.GHOST_INTERNAL_SYNC_APP_ID != '' && secrets.GHOST_INTERNAL_SYNC_APP_PRIVATE_KEY != '' }}";

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

if (!releaseWorkflow.includes(ghostInternalAppSecretGate)) {
  fail(
    "release.yml must gate the ghost-internal synchronization on both GitHub App secrets",
  );
}

if (!releaseWorkflow.includes("repository: squareup/ghost-internal")) {
  fail("release.yml must check out ghost-internal after publishing Ghost");
}

if (!releaseWorkflow.includes("pnpm install --no-frozen-lockfile")) {
  fail("release.yml must update the ghost-internal lockfile");
}

if (!releaseWorkflow.includes("run: pnpm ci")) {
  fail("release.yml must validate the synchronized ghost-internal pin");
}

if (
  !releaseWorkflow.includes(
    "uses: peter-evans/create-pull-request@22a9089034f40e5a961c8808d113e2c98fb63676",
  )
) {
  fail("release.yml must create a ghost-internal version pull request");
}

if (/gh pr merge/.test(releaseWorkflow)) {
  fail("release.yml must not merge ghost-internal version pull requests");
}

if (/^\s*push:/m.test(tarballWorkflow)) {
  fail("release-tarball.yml must stay dispatch-only to avoid release races");
}

console.log("check-release-workflows: release workflows are wired correctly");
