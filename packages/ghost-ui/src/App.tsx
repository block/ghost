import { Route, Routes } from "react-router";
import ComponentPage from "@/app/components/[name]/page";
import ComponentsIndex from "@/app/components/page";
import ColorsPage from "@/app/foundations/colors/page";
import FoundationsIndex from "@/app/foundations/page";
import TypographyPage from "@/app/foundations/typography/page";
import HomePage from "@/app/page";
import { Dock } from "@/components/docs/dock";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Dock />
      <main className="min-h-screen">
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="components" element={<ComponentsIndex />} />
          <Route path="components/:name" element={<ComponentPage />} />
          <Route path="foundations" element={<FoundationsIndex />} />
          <Route path="foundations/colors" element={<ColorsPage />} />
          <Route path="foundations/typography" element={<TypographyPage />} />
        </Routes>
      </main>
    </ThemeProvider>
  );
}
