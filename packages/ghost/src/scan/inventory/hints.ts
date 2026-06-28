import type { LanguageHistogramEntry } from "#ghost-core";
import { PLATFORM_ENUM_VALUES } from "./constants.js";
import type { WalkResult } from "./walk.js";

function basenames(manifests: string[]): string[] {
  return manifests.map((m) => {
    const idx = m.lastIndexOf("/");
    return idx === -1 ? m : m.slice(idx + 1);
  });
}

/**
 * Derive coarse platform hints from manifest presence + the language
 * histogram + walk signals. Output is constrained to `PLATFORM_ENUM_VALUES`
 * (mirrors the map `platform:` enum) — a deduped sorted list of *hints*, not
 * a single platform. Build-system / language-runtime signals are not emitted
 * here (bazel lives in build-system hints; the rest don't disambiguate a UI
 * platform alone).
 */
export function derivePlatformHints(
  manifests: string[],
  languageHistogram: LanguageHistogramEntry[],
  walk: WalkResult,
): string[] {
  const hints = new Set<string>();
  const names = basenames(manifests);

  for (const m of names) {
    if (m === "package.json") hints.add("web");
    if (
      m === "Package.swift" ||
      m === "Package.resolved" ||
      m.endsWith(".podspec")
    ) {
      hints.add("ios");
    }
    if (m === "pubspec.yaml") hints.add("flutter");
    if (
      m === "settings.gradle" ||
      m === "settings.gradle.kts" ||
      m === "build.gradle" ||
      m === "build.gradle.kts"
    ) {
      hints.add("android");
    }
  }

  const hasBazelBuild = names.some(
    (m) =>
      m === "WORKSPACE" ||
      m === "WORKSPACE.bazel" ||
      m === "MODULE.bazel" ||
      m === "BUILD.bazel" ||
      m === ".bazelversion",
  );

  const nameSet = new Set(names);
  const totalFiles = languageHistogram.reduce((acc, l) => acc + l.files, 0);
  if (totalFiles > 0) {
    const share = (langName: string): number => {
      const entry = languageHistogram.find((l) => l.name === langName);
      return entry ? entry.files / totalFiles : 0;
    };

    const swiftShare = share("swift");
    const kotlinShare = share("kotlin") + share("java");
    const dartShare = share("dart");

    const hasSpm = nameSet.has("Package.swift");
    if (swiftShare > 0.4 && (hasSpm || walk.hasXcodeProject || hasBazelBuild)) {
      hints.add("ios");
    }

    const hasGradle =
      nameSet.has("build.gradle") ||
      nameSet.has("build.gradle.kts") ||
      nameSet.has("settings.gradle") ||
      nameSet.has("settings.gradle.kts");
    if (
      kotlinShare > 0.4 &&
      walk.hasAndroidManifest &&
      (hasGradle || hasBazelBuild)
    ) {
      hints.add("android");
    }

    if (dartShare > 0.4 && nameSet.has("pubspec.yaml")) hints.add("flutter");
  }

  const platformish = new Set<string>(["web", "ios", "android", "flutter"]);
  if ([...hints].filter((h) => platformish.has(h)).length >= 2) {
    hints.add("mixed");
  }

  for (const hint of [...hints]) {
    if (!PLATFORM_ENUM_VALUES.has(hint)) hints.delete(hint);
  }

  return [...hints].sort();
}

/**
 * Derive coarse build-system hints from manifest presence + walk signals.
 * Informational only — the recipe authors the authoritative `build_system`.
 */
export function deriveBuildSystemHints(
  manifests: string[],
  walk: WalkResult,
): string[] {
  const hints = new Set<string>();

  for (const m of basenames(manifests)) {
    if (
      m === "settings.gradle" ||
      m === "settings.gradle.kts" ||
      m === "build.gradle" ||
      m === "build.gradle.kts"
    ) {
      hints.add("gradle");
    }
    if (
      m === "WORKSPACE" ||
      m === "WORKSPACE.bazel" ||
      m === "MODULE.bazel" ||
      m === "BUILD.bazel" ||
      m === ".bazelversion"
    ) {
      hints.add("bazel");
    }
    if (
      m === "Package.swift" ||
      m === "Package.resolved" ||
      m.endsWith(".podspec")
    ) {
      hints.add("xcode");
    }
    if (m === "Cargo.toml") hints.add("cargo");
    if (m === "go.mod") hints.add("go");
    if (m === "pom.xml") hints.add("maven");
  }

  if (walk.hasXcodeProject) hints.add("xcode");
  if (walk.hasStyleDictionary) hints.add("style-dictionary");
  for (const hint of walk.buildToolHints) hints.add(hint);

  return [...hints].sort();
}
