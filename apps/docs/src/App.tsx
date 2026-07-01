import { ThemeProvider } from "@anarchitecture/ghost-vessel";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import DocsIndex from "@/app/docs/page";
import HomePage from "@/app/page";
import GhostDriftLanding from "@/app/tools/drift/page";
import ToolsIndex from "@/app/tools/page";
import GhostScanLanding from "@/app/tools/scan/page";
import { Dock } from "@/components/docs/dock";
import { mdxDocsRoutes } from "@/routes/docs-routes";

function ScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;

    const id = decodeURIComponent(hash.slice(1));
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    });
  }, [hash, pathname]);

  return null;
}

export function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ScrollToHash />
      <Dock />
      <main className="relative z-10 min-h-screen">
        <Routes>
          <Route index element={<HomePage />} />

          {/* Tools: four-card index plus per-tool landings */}
          <Route path="tools" element={<ToolsIndex />} />
          <Route
            path="tools/map"
            element={<Navigate to="/tools/scan" replace />}
          />
          <Route path="tools/scan" element={<GhostScanLanding />} />
          <Route path="tools/drift" element={<GhostDriftLanding />} />

          {/* Cross-tool docs hub */}
          <Route path="docs" element={<DocsIndex />} />
          <Route
            path="docs/workflow"
            element={
              <Navigate to="/docs/getting-started#how-ghost-works" replace />
            }
          />

          {/* MDX-authored doc pages under /docs/* */}
          {mdxDocsRoutes()}

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
            element={
              <Navigate to="/docs/getting-started#how-ghost-works" replace />
            }
          />
          <Route
            path="tools/drift/workflow"
            element={
              <Navigate to="/docs/getting-started#how-ghost-works" replace />
            }
          />
        </Routes>
      </main>
    </ThemeProvider>
  );
}
