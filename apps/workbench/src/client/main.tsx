import { ThemeProvider } from "ghost-ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "ghost-ui/styles.css";
import "../styles/workbench.css";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Ghost Workbench root element was not found.");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <App />
    </ThemeProvider>
  </StrictMode>,
);
