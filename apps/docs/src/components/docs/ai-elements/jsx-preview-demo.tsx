"use client";

import { JSXPreview, JSXPreviewContent, JSXPreviewError } from "@ghost/ui";

const validJsx = `<div style={{ padding: "1.5rem", borderRadius: "0.75rem", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", textAlign: "center" }}>
  <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 600 }}>Welcome Back</h2>
  <p style={{ margin: 0, opacity: 0.9, fontSize: "0.875rem" }}>Your dashboard is ready to explore.</p>
  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginTop: "1rem" }}>
    <button style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "rgba(255,255,255,0.2)", color: "white", border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.875rem" }}>View Reports</button>
    <button style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "white", color: "#764ba2", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>Get Started</button>
  </div>
</div>`;

const errorJsx = `<div>
  <InvalidComponent />
</div>`;

export function JsxPreviewDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <JSXPreview jsx={validJsx}>
        <JSXPreviewContent />
        <JSXPreviewError />
      </JSXPreview>

      <JSXPreview jsx={errorJsx}>
        <JSXPreviewContent />
        <JSXPreviewError />
      </JSXPreview>
    </div>
  );
}
