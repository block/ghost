import { ThemeProvider } from "ghost-ui";
import { Navigate, Route, Routes, useParams } from "react-router";
import DocsIndex from "@/app/docs/page";
import HomePage from "@/app/page";
import GhostDriftLanding from "@/app/tools/drift/page";
import GhostExpressionLanding from "@/app/tools/expression/page";
import GhostFleetLanding from "@/app/tools/fleet/page";
import GhostMapLanding from "@/app/tools/map/page";
import ToolsIndex from "@/app/tools/page";
import GhostUiLanding from "@/app/tools/ui/page";
import ComponentPage from "@/app/ui/components/[name]/page";
import ComponentsIndex from "@/app/ui/components/page";
import ColorsPage from "@/app/ui/foundations/colors/page";
import FoundationsIndex from "@/app/ui/foundations/page";
import TypographyPage from "@/app/ui/foundations/typography/page";
import DesignLanguageIndex from "@/app/ui/page";
import { Dock } from "@/components/docs/dock";
import { mdxDocsRoutes } from "@/routes/docs-routes";

function ComponentRedirect() {
  const { name } = useParams<{ name: string }>();
  return <Navigate to={`/ui/components/${name}`} replace />;
}

export function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Dock />
      <main className="relative z-10 min-h-screen">
        <Routes>
          <Route index element={<HomePage />} />

          {/* Tools — five-card index plus per-tool landings */}
          <Route path="tools" element={<ToolsIndex />} />
          <Route path="tools/map" element={<GhostMapLanding />} />
          <Route path="tools/expression" element={<GhostExpressionLanding />} />
          <Route path="tools/drift" element={<GhostDriftLanding />} />
          <Route path="tools/fleet" element={<GhostFleetLanding />} />
          <Route path="tools/ui" element={<GhostUiLanding />} />

          {/* Cross-tool docs hub */}
          <Route path="docs" element={<DocsIndex />} />

          {/* MDX-authored doc pages (getting-started + cli reference under /docs/*) */}
          {mdxDocsRoutes()}

          {/* Design Language (ghost-ui catalogue) */}
          <Route path="ui" element={<DesignLanguageIndex />} />
          <Route path="ui/foundations" element={<FoundationsIndex />} />
          <Route path="ui/foundations/colors" element={<ColorsPage />} />
          <Route
            path="ui/foundations/typography"
            element={<TypographyPage />}
          />
          <Route path="ui/components" element={<ComponentsIndex />} />
          <Route path="ui/components/:name" element={<ComponentPage />} />

          {/* Redirects from the previous /tools/drift/{getting-started,cli} URLs */}
          <Route
            path="tools/drift/getting-started"
            element={<Navigate to="/docs/getting-started" replace />}
          />
          <Route
            path="tools/drift/cli"
            element={<Navigate to="/docs/cli" replace />}
          />
          <Route
            path="tools/drift/concepts"
            element={<Navigate to="/tools" replace />}
          />
          <Route
            path="tools/drift/workflow"
            element={<Navigate to="/tools" replace />}
          />

          {/* Redirects from legacy root /foundations and /components URLs */}
          <Route
            path="foundations"
            element={<Navigate to="/ui/foundations" replace />}
          />
          <Route
            path="foundations/colors"
            element={<Navigate to="/ui/foundations/colors" replace />}
          />
          <Route
            path="foundations/typography"
            element={<Navigate to="/ui/foundations/typography" replace />}
          />
          <Route
            path="components"
            element={<Navigate to="/ui/components" replace />}
          />
          <Route path="components/:name" element={<ComponentRedirect />} />
        </Routes>
      </main>
    </ThemeProvider>
  );
}
