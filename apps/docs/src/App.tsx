import { ThemeProvider } from "@design-intelligence/vessel-react";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import HomePage from "@/app/page";

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
      <main className="relative z-10 min-h-screen">
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </ThemeProvider>
  );
}
