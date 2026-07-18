import { Callout } from "./callout";

export function BetaWarning() {
  return (
    <Callout variant="warning" title="Pre-1.0">
      <p>
        ghost is still taking shape. We do not recommend relying on it yet. The
        CLI, package format, and APIs may change before 1.0 without a migration
        path.
      </p>
      <p>
        Feel free to explore it. Read the docs, try it in a branch or throwaway
        repo, follow development on{" "}
        <a className="doc-link" href="https://github.com/block/ghost">
          GitHub
        </a>
        , and tell us what feels wrong or missing.
      </p>
    </Callout>
  );
}
