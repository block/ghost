import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "ghost-ui/styles.css";
import { App } from "./App";
import "./styles/dev-fonts.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL || "/"}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
