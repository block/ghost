import { ThemeProvider } from "ghost-ui";
import { Navigate, Route, Routes, useParams } from "react-router";
import DriftEngineIndex from "@/app/docs/page";
import WorkflowPage from "@/app/docs/workflow/page";
import HomePage from "@/app/page";
import ToolsIndex from "@/app/tools/page";
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

          {/* Tools */}
          <Route path="tools" element={<ToolsIndex />} />
          <Route path="tools/drift" element={<DriftEngineIndex />} />
          <Route path="tools/drift/workflow" element={<WorkflowPage />} />

          {/* MDX-authored doc pages */}
          {mdxDocsRoutes()}

          {/* Design Language (ghost-ui catalogue — not linked from home/dock) */}
          <Route path="ui" element={<DesignLanguageIndex />} />
          <Route path="ui/foundations" element={<FoundationsIndex />} />
          <Route path="ui/foundations/colors" element={<ColorsPage />} />
          <Route
            path="ui/foundations/typography"
            element={<TypographyPage />}
          />
          <Route path="ui/components" element={<ComponentsIndex />} />
          <Route path="ui/components/:name" element={<ComponentPage />} />

          {/* Redirects from old /docs/* URLs */}
          <Route path="docs" element={<Navigate to="/tools/drift" replace />} />
          <Route
            path="docs/getting-started"
            element={<Navigate to="/tools/drift/getting-started" replace />}
          />
          <Route
            path="docs/cli"
            element={<Navigate to="/tools/drift/cli" replace />}
          />
          <Route
            path="docs/concepts"
            element={<Navigate to="/tools/drift/workflow" replace />}
          />
          <Route
            path="tools/drift/concepts"
            element={<Navigate to="/tools/drift/workflow" replace />}
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
