import { ThemeProvider } from "@design-intelligence/vessel-react";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import DocsIndex from "@/app/docs/page";
import HomePage from "@/app/page";
import { Dock } from "@/components/docs/dock";
import { mdxDocsRoutes } from "@/routes/docs-routes";

const legacyAuthoringPath = `docs/${["finger", "print-authoring"].join("")}`;

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

          <Route path="docs" element={<DocsIndex />} />
          <Route
            path={legacyAuthoringPath}
            element={<Navigate to="/docs/authoring" replace />}
          />
          {mdxDocsRoutes()}
        </Routes>
      </main>
    </ThemeProvider>
  );
}
