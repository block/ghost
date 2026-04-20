import { Route } from "react-router";
import { DocsMdxRoute } from "@/components/docs/docs-mdx-layout";
import { docsEntries } from "@/content/docs-manifest";

export function mdxDocsRoutes() {
  return docsEntries.map((entry) => {
    const path = entry.route.replace(/^\//, "");
    return (
      <Route
        key={entry.route}
        path={path}
        element={
          <DocsMdxRoute
            frontmatter={entry.frontmatter}
            Content={entry.Content}
          />
        }
      />
    );
  });
}
