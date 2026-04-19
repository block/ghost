import { defineConfig } from "vitepress";

// When deployed under a GitHub Pages repo sub-path, CI sets DEPLOY_BASE
// (e.g. "/ghost/") and this config nests the docs at `${DEPLOY_BASE}docs/`.
// On Vercel or a custom domain, leave unset — base stays "/docs/". The
// catalogue app owns the root path.
const DEPLOY_BASE = process.env.DEPLOY_BASE ?? "/";
const BASE = `${DEPLOY_BASE.replace(/\/$/, "")}/docs/`;

export default defineConfig({
  title: "Ghost",
  description: "Perception of organic drift across a decentralized fleet.",
  base: BASE,
  cleanUrls: true,
  // Cross-app links into the catalogue (/tools/*) look dead to VitePress.
  ignoreDeadLinks: [/\/tools\//],

  themeConfig: {
    nav: [
      { text: "Getting Started", link: "/getting-started" },
      { text: "CLI Reference", link: "/cli" },
      {
        text: "Concepts",
        link: `${DEPLOY_BASE.replace(/\/$/, "")}/tools/drift/concepts`,
      },
      { text: "Catalogue", link: DEPLOY_BASE },
    ],
    sidebar: [
      {
        text: "Drift Engine",
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting Started", link: "/getting-started" },
          { text: "CLI Reference", link: "/cli" },
          { text: "Self-Hosting", link: "/self-hosting" },
        ],
      },
      {
        text: "Reference",
        items: [
          {
            text: "Concepts (animated)",
            link: `${DEPLOY_BASE.replace(/\/$/, "")}/tools/drift/concepts`,
          },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/block/ghost" }],
    outline: { level: [2, 3] },
  },
});
