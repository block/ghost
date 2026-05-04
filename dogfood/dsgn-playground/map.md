---
schema: ghost.map/v1
id: dsgn-playground
repo: squareup/dsgn-playground
mapped_at: 2026-05-04
platform: web
languages:
  - { name: typescript, files: 77, share: 0.484 }
  - { name: svelte, files: 36, share: 0.226 }
  - { name: json, files: 17, share: 0.107 }
  - { name: markdown, files: 7, share: 0.044 }
  - { name: scss, files: 7, share: 0.044 }
  - { name: javascript, files: 6, share: 0.038 }
  - { name: yaml, files: 5, share: 0.031 }
  - { name: shell, files: 2, share: 0.013 }
  - { name: css, files: 1, share: 0.006 }
  - { name: html, files: 1, share: 0.006 }
build_system: [pnpm, vite]
package_manifests:
  - package.json
composition:
  frameworks:
    - { name: svelte, version: "5.39.8" }
    - { name: sveltekit, version: "2.43.7" }
    - { name: vite, version: "6.3.6" }
    - { name: tailwindcss, version: "4.1.14" }
    - { name: bits-ui, version: "1.8.0" }
    - { name: gsap, version: "3.14.2" }
    - { name: phosphor-svelte, version: "3.0.1" }
  rendering: sveltekit
  styling:
    - tailwindcss-v4
    - scss
    - css-custom-properties
  navigation: sveltekit-router
design_system:
  paths:
    - src/app.css
    - src/scss
    - src/lib/components
    - src/lib/animations
  entry_files:
    - src/app.css
    - src/scss/_variables.scss
    - src/scss/_fonts.scss
    - src/scss/_breakpoints.scss
    - src/scss/_mixins.scss
    - src/scss/_editorial.scss
    - src/scss/global.scss
    - src/scss/design-drops.scss
    - tailwind.config.js
  token_source: inline
  status: active
ui_surface:
  include:
    - src/app.css
    - src/scss/**
    - src/lib/components/**
    - src/lib/animations/**
    - src/routes/**
  exclude:
    - "**/node_modules/**"
    - "**/dist/**"
    - "**/build/**"
    - "**/.svelte-kit/**"
    - "**/*.test.ts"
    - "**/*.spec.ts"
    - src/lib/server/**
    - src/routes/api/**
feature_areas:
  - name: tokens-and-theme
    paths:
      - src/app.css
      - src/scss
    sub_areas:
      - tailwind-theme
      - scss-variables
      - cash-fonts
      - breakpoint-mixins
      - editorial-mixins
  - name: editorial-feed
    paths:
      - src/routes/+page.svelte
      - src/lib/components/EditorialHero.svelte
      - src/lib/components/FeedTimeline.svelte
      - src/lib/components/FeedGrid.svelte
      - src/lib/components/GridCard.svelte
  - name: post-detail
    paths:
      - src/lib/components/PostExpanded.svelte
      - src/lib/components/Post.svelte
      - src/lib/components/PostPreview.svelte
      - src/routes/post/[id]
  - name: creation-flow
    paths:
      - src/lib/components/PostEdit.svelte
      - src/lib/components/Combobox.svelte
      - src/lib/components/Select.svelte
      - src/lib/components/Modal.svelte
  - name: media-surfaces
    paths:
      - src/lib/components/Media.svelte
      - src/lib/components/Video.svelte
      - src/lib/components/AudioPlayer.svelte
      - src/lib/components/Placeholder.svelte
  - name: design-drops
    paths:
      - src/routes/drops
      - src/scss/design-drops.scss
  - name: motion-system
    paths:
      - src/lib/animations
      - src/lib/components/ScribbleLoader.svelte
orientation_files:
  - README.md
  - src/app.css
  - src/scss/_variables.scss
  - src/scss/_editorial.scss
  - src/scss/design-drops.scss
  - src/lib/components/EditorialHero.svelte
  - src/lib/components/GridCard.svelte
  - src/lib/components/PostExpanded.svelte
  - src/lib/components/PostEdit.svelte
  - ../ghost/packages/ghost-ui/expression.md
---

## Identity

Design Playground is a SvelteKit web app for Block's design community: a media-heavy internal gallery where designers post work, browse a feed, open detailed showcases, and collect work into drops. It is an app, not a reusable UI package, but it carries a clear in-repo design language through `src/app.css`, SCSS variables and mixins, Svelte component styles, and GSAP-driven interaction.

## Topology

The design language is split between a Tailwind 4 token sheet (`src/app.css`) and SCSS authoring layers under `src/scss`. `src/app.css` declares light/dark semantic custom properties, `@theme inline` aliases, Cash Sans font aliases, radii, named shadows, control heights, breakpoints, and animation tokens. The SCSS files provide the grayscale palette, Cash Sans font-face loads, editorial mixins, breakpoint helpers, and a `design-drops.scss` layer for the drops pages.

Product surfaces live primarily in `src/lib/components` and `src/routes`. The home feed (`EditorialHero`, `FeedTimeline`, `FeedGrid`, `GridCard`) is the canonical first read for the editorial-media posture; `PostExpanded`, `Post`, `PostEdit`, `Modal`, `Combobox`, and `Select` show how the same tokens behave in dense operational flows. Server, API, database, and sync folders are excluded because they do not shape the visual language.

## Conventions

The app blends Tailwind utility classes with substantial component-local SCSS. Global tokens are monochrome and Square/Cash-branded: Cash Sans, Cash Sans Wide, and Cash Sans Mono are loaded from `cash-f.squarecdn.com`, while color defaults to grayscale with red reserved for destructive/error states. Motion is a first-class convention: GSAP scroll reveal, grid reveal, Flip-like transitions, modal slide-ins, and a hand-drawn SVG loader give the playground a kinetic gallery feel.

For dogfooding Ghost, the closest internal comparison point is `ghost-ui`: this scan keeps a direct orientation reference to `../ghost/packages/ghost-ui/expression.md`. The two systems share monochrome editorial discipline, Cash-family affinity, pill controls, and high-contrast surface treatment, but Playground is more media-first and animated, with local SCSS composition instead of a registry-distributed React design system.
