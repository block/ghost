import { ThemeProvider } from "ghost-ui";
import { Navigate, Route, Routes } from "react-router";
import DriftEngineIndex from "@/app/docs/page";
import WorkflowPage from "@/app/docs/workflow/page";
import HomePage from "@/app/page";
import ToolsIndex from "@/app/tools/page";
import { Dock } from "@/components/docs/dock";
import { mdxDocsRoutes } from "@/routes/docs-routes";

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
        </Routes>
      </main>
    </ThemeProvider>
  );
}
