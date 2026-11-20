const NUMBER = "(?:0|[1-9][0-9]*)";
const SEMVER = new RegExp(
  `^(${NUMBER})\\.(${NUMBER})\\.(${NUMBER})(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`,
);

function parseVersion(value: string): string[] | undefined {
  const match = SEMVER.exec(value);
  if (!match || match[0] !== value) return undefined;
  const prerelease = match[4]?.split(".") ?? [];
  if (
    prerelease.some(
      (part) => /^[0-9]+$/.test(part) && !/^(0|[1-9][0-9]*)$/.test(part),
    )
  )
    return undefined;
  return [match[1], match[2], match[3], ...prerelease];
}

/** SemVer 2.0 precedence, including prereleases; build metadata is ignored. */
export function compareVersions(a: string, b: string): number | undefined {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return undefined;
  for (let i = 0; i < 3; i++) {
    const x = BigInt(left[i]);
    const y = BigInt(right[i]);
    if (x !== y) return x > y ? 1 : -1;
  }
  if (left.length === 3 || right.length === 3)
    return left.length === right.length ? 0 : left.length === 3 ? 1 : -1;
  for (let i = 3; i < Math.max(left.length, right.length); i++) {
    const x = left[i];
    const y = right[i];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const numericX = /^[0-9]+$/.test(x);
    const numericY = /^[0-9]+$/.test(y);
    if (numericX && numericY) return BigInt(x) > BigInt(y) ? 1 : -1;
    if (numericX !== numericY) return numericX ? -1 : 1;
    return x > y ? 1 : -1;
  }
  return 0;
}
