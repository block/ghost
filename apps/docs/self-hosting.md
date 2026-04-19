# Self-Hosting

Run the catalogue (`apps/catalogue`) as your own design system documentation site.

## Overview

The catalogue is a standalone Vite + React app that serves as both a reference design system and an interactive component catalogue. Fork it, swap in your own registry and tokens, and deploy it as the documentation site for your design system.

## Clone the Repository

```bash
git clone https://github.com/block/ghost.git
cd ghost
pnpm install
```

## Swap Your Registry

The library reads from `packages/ghost-ui/registry.json` — a shadcn-compatible registry that defines all components, styles, and dependencies. Replace this with your own:

```bash
# Replace the registry with your own
cp path/to/your/registry.json packages/ghost-ui/registry.json

# Or rebuild from your shadcn config
pnpm -F @ghost/ui build:registry
```

The registry format follows the **shadcn registry specification** — each item has a name, type, dependencies, and file contents. The catalogue uses this to render install commands, source previews, and dependency graphs.

## Customise Theme Tokens

Design tokens live in CSS custom properties:

```
packages/ghost-ui/src/styles/
├── main.css          # CSS variable definitions (light + dark)
├── font-faces.css    # @font-face declarations (empty by default)
└── ...
```

Edit `main.css` to change colours, spacing, border radii, typography scales, and shadows. All components inherit from these tokens — changes propagate everywhere automatically.

### Theme Presets

The library ships with theme presets in `packages/ghost-ui/src/lib/theme-presets.ts`. Add your own brand preset or modify existing ones. The live theme panel (accessible via the catalogue UI) lets you experiment with token values in real time.

## Update Component Demos

Component demos live in `apps/catalogue/src/components/docs/primitives/` and `apps/catalogue/src/components/docs/ai-elements/`. Each file exports a default component that renders a demo for its corresponding UI component.

The component registry in `apps/catalogue/src/lib/component-registry.ts` maps component slugs to their metadata (name, category, description, demo component). Add or remove entries here to control what appears in the catalogue.

## Fonts

The library ships with no bundled fonts — consumers bring their own. To use a custom typeface:

1. Add your font files to `packages/ghost-ui/src/fonts/` (or your consumer app's fonts directory).
2. Update the `@font-face` declarations in `packages/ghost-ui/src/styles/font-faces.css`.
3. Update the `--font-display` and `--font-body` CSS variables in `main.css`.

## Development

```bash
# Start the catalogue dev server
just dev
# or: pnpm -F @ghost/catalogue dev

# The site is available at http://localhost:5173
```

## Build & Deploy

The catalogue builds to a static SPA that can be deployed to any static hosting provider:

```bash
# Build for production
just build-ui
# or: pnpm -F @ghost/catalogue build

# Output is in apps/catalogue/dist/
```

The `dist/` directory contains a fully self-contained SPA. Deploy it to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static file server.

### Docker

For container deployments, serve the static output with any web server:

```dockerfile
FROM nginx:alpine
COPY apps/catalogue/dist/ /usr/share/nginx/html/
# Configure SPA fallback for client-side routing
RUN echo 'server { listen 80; location / { try_files $uri /index.html; } }' \
    > /etc/nginx/conf.d/default.conf
```

## Connect to Ghost

Once your design system is running as a catalogue site, use Ghost's core tooling to fingerprint the parent and track drift across consumers:

1. Publish your `registry.json` at a stable URL.
2. Profile the registry to an `expression.md`:
   ```bash
   ghost profile --registry https://your-host/registry.json --emit
   ```
3. Check consumers against it with `ghost review project . --against parent.expression.md`, or gate PRs with `ghost review`.

---

**See also:** [Getting Started](./getting-started) for the consumer-side setup.
