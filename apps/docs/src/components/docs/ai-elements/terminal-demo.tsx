"use client";

import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
  TerminalHeader,
  TerminalTitle,
} from "@ghost/ui";

const buildOutput = `\x1b[32m$\x1b[0m next build
\x1b[36minfo\x1b[0m  - Linting and checking validity of types...
\x1b[36minfo\x1b[0m  - Creating an optimized production build...
\x1b[36minfo\x1b[0m  - Compiled successfully
\x1b[36minfo\x1b[0m  - Collecting page data...
\x1b[36minfo\x1b[0m  - Generating static pages (8/8)
\x1b[36minfo\x1b[0m  - Finalizing page optimization...

Route (app)                              Size     First Load JS
\x1b[37m+\x1b[0m /                                    5.2 kB         89.3 kB
\x1b[37m+\x1b[0m /about                               1.8 kB         85.9 kB
\x1b[37m+\x1b[0m /dashboard                           12.4 kB        96.5 kB
\x1b[37m+\x1b[0m /api/health                          0 B            0 B

\x1b[32m\u2713\x1b[0m Build completed in 14.2s`;

const gitOutput = `\x1b[33mOn branch main\x1b[0m
Your branch is up to date with 'origin/main'.

Changes to be committed:
  \x1b[32mnew file:   src/components/avatar.tsx\x1b[0m
  \x1b[32mmodified:   src/lib/utils.ts\x1b[0m
  \x1b[31mdeleted:    src/old-component.tsx\x1b[0m

Untracked files:
  \x1b[31m.env.local\x1b[0m`;

export function TerminalDemo() {
  return (
    <div className="grid max-w-2xl gap-6">
      <Terminal output={buildOutput}>
        <TerminalHeader>
          <TerminalTitle>Build Output</TerminalTitle>
          <TerminalActions>
            <TerminalCopyButton />
          </TerminalActions>
        </TerminalHeader>
        <TerminalContent />
      </Terminal>

      <Terminal output={gitOutput}>
        <TerminalHeader>
          <TerminalTitle>git status</TerminalTitle>
          <TerminalActions>
            <TerminalCopyButton />
          </TerminalActions>
        </TerminalHeader>
        <TerminalContent />
      </Terminal>
    </div>
  );
}
