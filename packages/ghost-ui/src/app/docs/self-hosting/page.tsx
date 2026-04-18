"use client";

import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { DocProse } from "@/components/docs/doc-prose";
import { DocSection, DocsPageLayout } from "@/components/docs/docs-page-layout";

export default function SelfHostingPage() {
  return (
    <DocsPageLayout>
      <AnimatedPageHeader
        kicker="Docs"
        title="Self-Hosting"
        description="Run Ghost UI as your own design system documentation site."
      />

      <DocProse>
        <DocSection title="Overview">
          <p>
            Ghost UI is a standalone Vite + React app that serves as both a
            reference design system and an interactive component catalogue. You
            can fork it, swap in your own registry and tokens, and deploy it as
            the documentation site for your design system.
          </p>
        </DocSection>

        <DocSection title="Clone the Repository">
          <pre>
            <code>
              {`git clone https://github.com/block/ghost.git
cd ghost
pnpm install`}
            </code>
          </pre>
        </DocSection>

        <DocSection title="Swap Your Registry">
          <p>
            Ghost UI reads from <code>packages/ghost-ui/registry.json</code> — a
            shadcn-compatible registry that defines all components, styles, and
            dependencies. Replace this with your own:
          </p>
          <pre>
            <code>
              {`# Replace the registry with your own
cp path/to/your/registry.json packages/ghost-ui/registry.json

# Or rebuild from your shadcn config
cd packages/ghost-ui
pnpm build:registry`}
            </code>
          </pre>
          <p>
            The registry format follows the{" "}
            <strong>shadcn registry specification</strong> — each item has a
            name, type, dependencies, and file contents. Ghost UI uses this to
            render install commands, source previews, and dependency graphs.
          </p>
        </DocSection>

        <DocSection title="Customise Theme Tokens">
          <p>
            Design tokens live in CSS custom properties. The main entry point is
            the styles directory:
          </p>
          <pre>
            <code>
              {`packages/ghost-ui/src/styles/
├── base.css          # CSS variable definitions (light + dark)
├── globals.css       # Global resets and imports
└── ...`}
            </code>
          </pre>
          <p>
            Edit <code>base.css</code> to change colours, spacing, border radii,
            typography scales, and shadows. All components inherit from these
            tokens — changes propagate everywhere automatically.
          </p>

          <h3>Theme Presets</h3>
          <p>
            Ghost UI ships with theme presets in{" "}
            <code>src/lib/theme-presets.ts</code>. You can add your own brand
            preset or modify existing ones. The live theme panel (accessible via
            the UI) lets you experiment with token values in real time.
          </p>
        </DocSection>

        <DocSection title="Update Component Demos">
          <p>
            Component demos live in <code>src/components/docs/primitives/</code>{" "}
            and <code>src/components/docs/ai-elements/</code>. Each file exports
            a default component that renders a demo for its corresponding UI
            component.
          </p>
          <p>
            The component registry in <code>src/lib/component-registry.ts</code>{" "}
            maps component slugs to their metadata (name, category, description,
            demo component). Add or remove entries here to control what appears
            in the catalogue.
          </p>
        </DocSection>

        <DocSection title="Fonts">
          <p>Ghost UI defaults to system fonts. To use a custom typeface:</p>
          <ol>
            <li>Add your font files to the fonts directory</li>
            <li>
              Update the <code>@font-face</code> declarations in{" "}
              <code>globals.css</code>
            </li>
            <li>
              Update the <code>--font-display</code> and{" "}
              <code>--font-body</code> CSS variables
            </li>
          </ol>
        </DocSection>

        <DocSection title="Development">
          <pre>
            <code>
              {`# Start the dev server
just dev
# or: cd packages/ghost-ui && pnpm dev

# The site is available at http://localhost:5173`}
            </code>
          </pre>
        </DocSection>

        <DocSection title="Build & Deploy">
          <p>
            Ghost UI builds to a static SPA that can be deployed to any static
            hosting provider:
          </p>
          <pre>
            <code>
              {`# Build for production
just build-ui
# or: cd packages/ghost-ui && pnpm build

# Output is in packages/ghost-ui/dist/`}
            </code>
          </pre>
          <p>
            The <code>dist/</code> directory contains a fully self-contained
            SPA. Deploy it to Vercel, Netlify, Cloudflare Pages, GitHub Pages,
            or any static file server.
          </p>

          <h3>Docker</h3>
          <p>
            For container deployments, serve the static output with any web
            server:
          </p>
          <pre>
            <code>
              {`FROM nginx:alpine
COPY packages/ghost-ui/dist/ /usr/share/nginx/html/
# Configure SPA fallback for client-side routing
RUN echo 'server { listen 80; location / { try_files $uri /index.html; } }' \\
    > /etc/nginx/conf.d/default.conf`}
            </code>
          </pre>
        </DocSection>

        <DocSection title="Connect to Ghost">
          <p>
            Once your design system is running as a Ghost UI site, you can use
            Ghost's core tooling to fingerprint the parent and track drift
            across consumers:
          </p>
          <ol>
            <li>
              Publish your <code>registry.json</code> at a stable URL
            </li>
            <li>
              Profile the registry to an <code>expression.md</code>:{" "}
              <code>
                ghost profile --registry https://your-host/registry.json --emit
              </code>
            </li>
            <li>
              Check consumers against it with{" "}
              <code>ghost comply . --against parent.expression.md</code>, or
              gate PRs with <code>ghost review</code>
            </li>
          </ol>

          <hr />

          <p>
            See{" "}
            <Link to="/tools/drift/getting-started" className="font-semibold">
              Getting Started
            </Link>{" "}
            for the consumer-side setup, or browse the{" "}
            <Link to="/ui/components" className="font-semibold">
              Component Catalogue
            </Link>{" "}
            to see what ships out of the box.
          </p>
        </DocSection>
      </DocProse>
    </DocsPageLayout>
  );
}
