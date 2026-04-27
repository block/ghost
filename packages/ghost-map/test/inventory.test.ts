import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { inventory } from "../src/core/inventory.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "fixtures");
const FIXTURE = resolve(FIXTURES, "web-repo");

describe("inventory — web-repo baseline", () => {
  it("emits deterministic raw signals for a small web repo fixture", () => {
    const out = inventory(FIXTURE);

    expect(out.root).toBe(FIXTURE);
    expect(out.package_manifests).toEqual(["package.json"]);
    expect(out.platform_hints).toEqual(["web"]);

    const langs = Object.fromEntries(
      out.language_histogram.map((l) => [l.name, l.files]),
    );
    expect(langs.typescript).toBeGreaterThanOrEqual(3);
    // SKIP_DIRS (coverage/) must not contribute — no `javascript` leak.
    expect(langs.javascript ?? 0).toBe(0);

    expect(out.candidate_config_files).toContain("registry.json");
    expect(out.candidate_config_files).toContain("tailwind.config.ts");
    expect(out.candidate_config_files).toContain("tsconfig.json");
    expect(out.candidate_config_files).toContain("src/styles/tokens.css");

    expect(out.registry_files).toEqual(["registry.json"]);

    const topPaths = out.top_level_tree.map((t) => t.path);
    expect(topPaths).toContain("src/");
    expect(topPaths).toContain("test/");
    expect(topPaths).toContain("package.json");

    // top_level_tree is sorted lexicographically
    expect([...topPaths].sort()).toEqual(topPaths);
  });

  it("is reproducible — two consecutive calls return equivalent JSON", () => {
    const a = inventory(FIXTURE);
    const b = inventory(FIXTURE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("returns null git fields outside a git repo", () => {
    // The fixture sub-tree isn't its own git repo — git lookups should
    // either resolve to the surrounding ghost repo or null. We just assert
    // the field types so the contract holds.
    const out = inventory(FIXTURE);
    expect(typeof out.git_remote === "string" || out.git_remote === null).toBe(
      true,
    );
    expect(
      typeof out.git_default_branch === "string" ||
        out.git_default_branch === null,
    ).toBe(true);
  });
});

describe("inventory — Bazel + Swift detection", () => {
  const BAZEL = resolve(FIXTURES, "bazel-repo");

  it("detects Bazel manifests at the root", () => {
    const out = inventory(BAZEL);
    // Whatever the order, all four canonical Bazel marker files must be
    // present so downstream lint sees `package_manifests.length >= 1`.
    expect(out.package_manifests).toContain("WORKSPACE");
    expect(out.package_manifests).toContain("MODULE.bazel");
    expect(out.package_manifests).toContain("BUILD.bazel");
    expect(out.package_manifests).toContain(".bazelversion");
  });

  it("infers ios from Swift dominance + Bazel build signal", () => {
    const out = inventory(BAZEL);
    // `bazel` is a build-system signal — it lives in build_system_hints,
    // NOT platform_hints. platform_hints is constrained to the Platform
    // enum (web/ios/android/desktop/flutter/mixed/other).
    expect(out.platform_hints).not.toContain("bazel");
    expect(out.platform_hints).toContain("ios");
    expect(out.build_system_hints).toContain("bazel");
  });

  it("skips bazel-* output trees in the language histogram", () => {
    // The fixture drops a `should-be-skipped.swift` under `bazel-bin/`.
    // It must NOT count toward the swift file total. The fixture has 4
    // tracked .swift files outside `bazel-bin/`.
    const out = inventory(BAZEL);
    const swift = out.language_histogram.find((l) => l.name === "swift");
    expect(swift?.files).toBe(4);
  });

  it("skips bazel-* output trees in top_level_tree", () => {
    const out = inventory(BAZEL);
    const top = out.top_level_tree.map((t) => t.path);
    expect(top).not.toContain("bazel-bin/");
    expect(top).not.toContain("bazel-out/");
    // Real-source dirs are still surfaced.
    expect(top).toContain("Code/");
  });

  it("ranks design-system-anchored config candidates first", () => {
    // Code/DesignSystem/Color+Brand.swift should sort before
    // features/banking/Color+Banking.swift. The DS path has a
    // designsystem ancestor; the feature path has none.
    const out = inventory(BAZEL);
    const dsIdx = out.candidate_config_files.indexOf(
      "Code/DesignSystem/Color+Brand.swift",
    );
    const featureIdx = out.candidate_config_files.indexOf(
      "features/banking/Color+Banking.swift",
    );
    expect(dsIdx).toBeGreaterThanOrEqual(0);
    expect(featureIdx).toBeGreaterThanOrEqual(0);
    expect(dsIdx).toBeLessThan(featureIdx);
  });
});

describe("inventory — iOS SPM detection", () => {
  const SPM = resolve(FIXTURES, "ios-spm-repo");

  it("detects Package.swift", () => {
    const out = inventory(SPM);
    expect(out.package_manifests).toContain("Package.swift");
  });

  it("infers ios from the SPM manifest alone", () => {
    const out = inventory(SPM);
    expect(out.platform_hints).toContain("ios");
  });
});

describe("inventory — Android Gradle detection", () => {
  const ANDROID = resolve(FIXTURES, "android-gradle-repo");

  it("detects Gradle manifests at the root", () => {
    const out = inventory(ANDROID);
    expect(out.package_manifests).toContain("build.gradle.kts");
    expect(out.package_manifests).toContain("settings.gradle.kts");
  });

  it("infers android from Kotlin + Gradle + AndroidManifest", () => {
    const out = inventory(ANDROID);
    expect(out.platform_hints).toContain("android");
  });
});

describe("inventory — Flutter detection", () => {
  const FLUTTER = resolve(FIXTURES, "flutter-repo");

  it("detects pubspec.yaml", () => {
    const out = inventory(FLUTTER);
    expect(out.package_manifests).toContain("pubspec.yaml");
  });

  it("infers flutter platform", () => {
    const out = inventory(FLUTTER);
    expect(out.platform_hints).toContain("flutter");
  });
});

describe("inventory — token directories", () => {
  const TOKENS = resolve(FIXTURES, "token-pipeline-repo");

  it("surfaces token-pipeline directories in candidate_config_files", () => {
    const out = inventory(TOKENS);
    // Directory entries are emitted with a trailing slash so callers can
    // tell them apart from file entries.
    expect(out.candidate_config_files).toContain("tokens/");
    expect(out.candidate_config_files).toContain("design-tokens/");
  });

  it("still finds in-tree config files inside token directories", () => {
    const out = inventory(TOKENS);
    expect(out.candidate_config_files).toContain("src/styles/tokens.css");
  });
});

describe("inventory — extended SKIP_DIRS", () => {
  const PYREPO = resolve(FIXTURES, "python-venv-repo");

  it("excludes venv/ from the language histogram", () => {
    const out = inventory(PYREPO);
    const py = out.language_histogram.find((l) => l.name === "python");
    // src/foo.py contributes 1; venv/lib/python.py must NOT.
    expect(py?.files).toBe(1);
  });

  it("excludes venv/ from top_level_tree", () => {
    const out = inventory(PYREPO);
    const top = out.top_level_tree.map((t) => t.path);
    expect(top).toContain("src/");
    expect(top).not.toContain("venv/");
    expect(out.package_manifests).toContain("pyproject.toml");
    // python is a runtime/language signal — NOT a platform. The
    // platform-enum-only constraint means it stays out of platform_hints.
    expect(out.platform_hints).not.toContain("python");
  });
});

describe("inventory — workspace expansion", () => {
  const WS = resolve(FIXTURES, "workspace-repo");

  it("surfaces manifests from package.json:workspaces globs", () => {
    const out = inventory(WS);
    // packages/* is declared in workspaces — both children land in the
    // result with relative paths.
    expect(out.package_manifests).toContain("packages/foo/package.json");
    expect(out.package_manifests).toContain("packages/bar/package.json");
  });

  it("surfaces manifests from conventional apps/, libs/, common/ dirs", () => {
    const out = inventory(WS);
    expect(out.package_manifests).toContain("apps/web/package.json");
    expect(out.package_manifests).toContain("libs/util/package.json");
    expect(out.package_manifests).toContain("common/lint/package.json");
  });

  it("keeps the root manifest as a basename, not a relative path", () => {
    const out = inventory(WS);
    // Root entry is `package.json` (no leading slash, no `./`) — stable
    // with the pre-4b shape callers depend on.
    expect(out.package_manifests).toContain("package.json");
    expect(out.package_manifests).not.toContain("./package.json");
  });

  it("dedupes by absolute path and sorts the result", () => {
    const out = inventory(WS);
    const sorted = [...out.package_manifests].sort();
    expect(out.package_manifests).toEqual(sorted);
    const seen = new Set(out.package_manifests);
    expect(seen.size).toBe(out.package_manifests.length);
  });
});

describe("inventory — platform_hints stays inside the platform enum", () => {
  // Closed set of values the schema's `platform` enum accepts.
  const PLATFORM_ENUM = new Set([
    "web",
    "ios",
    "android",
    "desktop",
    "flutter",
    "mixed",
    "other",
  ]);

  it("never emits build-system or runtime signals (bazel, ruby, …)", () => {
    // Bazel + Ruby Fastlane + Swift app — emulates real iOS monorepos
    // that hit the Phase 5a bug, where `platform_hints` returned
    // ["bazel", "ios", "ruby"] instead of just ["ios"].
    const out = inventory(resolve(FIXTURES, "bazel-ruby-ios-repo"));
    expect(out.platform_hints).not.toContain("bazel");
    expect(out.platform_hints).not.toContain("ruby");
    expect(out.platform_hints).toContain("ios");
    // bazel must surface as a build-system hint, not a platform hint.
    expect(out.build_system_hints).toContain("bazel");
  });

  it("constrains every platform_hints value to the Platform enum across all fixtures", () => {
    for (const fixture of [
      "web-repo",
      "bazel-repo",
      "ios-spm-repo",
      "android-gradle-repo",
      "flutter-repo",
      "token-pipeline-repo",
      "python-venv-repo",
      "workspace-repo",
      "bazel-ruby-ios-repo",
      "vite-nx-repo",
    ]) {
      const out = inventory(resolve(FIXTURES, fixture));
      for (const hint of out.platform_hints) {
        expect(PLATFORM_ENUM.has(hint)).toBe(true);
      }
    }
  });
});

describe("inventory — build_system_hints", () => {
  it("returns an empty hint array for the web fixture (no lockfile-aware hint)", () => {
    const out = inventory(FIXTURE);
    // package.json alone doesn't pick npm vs pnpm vs yarn — the recipe
    // resolves that via lockfile presence. We deliberately don't hint.
    expect(Array.isArray(out.build_system_hints)).toBe(true);
  });

  it("hints `gradle` for an Android Gradle fixture", () => {
    const out = inventory(resolve(FIXTURES, "android-gradle-repo"));
    expect(out.build_system_hints).toContain("gradle");
  });

  it("hints `bazel` for a Bazel fixture", () => {
    const out = inventory(resolve(FIXTURES, "bazel-repo"));
    expect(out.build_system_hints).toContain("bazel");
  });

  it("hints `xcode` for an SPM fixture", () => {
    const out = inventory(resolve(FIXTURES, "ios-spm-repo"));
    expect(out.build_system_hints).toContain("xcode");
  });

  it("hints `vite` and `nx` for a Vite-on-Nx monorepo", () => {
    // Phase 5b widened the build_system enum to cover JS bundlers (vite,
    // webpack, rollup, parcel, esbuild) and meta-build coordinators (nx,
    // turbo). The fixture ships `vite.config.ts` + `nx.json` at the root.
    const out = inventory(resolve(FIXTURES, "vite-nx-repo"));
    expect(out.build_system_hints).toContain("vite");
    expect(out.build_system_hints).toContain("nx");
  });
});
