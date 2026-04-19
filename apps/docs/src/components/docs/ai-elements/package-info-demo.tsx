"use client";

import {
  PackageInfo,
  PackageInfoContent,
  PackageInfoDependencies,
  PackageInfoDependency,
  PackageInfoDescription,
} from "@ghost/ui";

export function PackageInfoDemo() {
  return (
    <div className="grid max-w-md gap-6">
      <PackageInfo
        name="react"
        currentVersion="18.2.0"
        newVersion="19.0.0"
        changeType="major"
      >
        <PackageInfoDescription>
          A JavaScript library for building user interfaces
        </PackageInfoDescription>
        <PackageInfoContent>
          <PackageInfoDependencies>
            <PackageInfoDependency name="loose-envify" version="^1.1.0" />
            <PackageInfoDependency name="scheduler" version="^0.24.0" />
          </PackageInfoDependencies>
        </PackageInfoContent>
      </PackageInfo>

      <PackageInfo
        name="tailwindcss"
        currentVersion="3.4.1"
        newVersion="4.0.0"
        changeType="major"
      />

      <PackageInfo
        name="typescript"
        currentVersion="5.3.3"
        newVersion="5.4.0"
        changeType="minor"
      />

      <PackageInfo
        name="zod"
        currentVersion="3.22.4"
        newVersion="3.22.5"
        changeType="patch"
      />

      <PackageInfo name="@acme/ui" newVersion="1.0.0" changeType="added" />

      <PackageInfo name="moment" currentVersion="2.30.1" changeType="removed" />
    </div>
  );
}
