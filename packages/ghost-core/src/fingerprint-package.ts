export const FINGERPRINT_PACKAGE_DIR = ".ghost/fingerprint" as const;
export const PROFILE_FILENAME = "profile.md" as const;

export interface FingerprintPackagePaths {
  dir: string;
  map: string;
  survey: string;
  profile: string;
  checks: string;
}
