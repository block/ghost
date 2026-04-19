"use client";

import { Source, Sources, SourcesContent, SourcesTrigger } from "@ghost/ui";

export function SourcesDemo() {
  return (
    <Sources>
      <SourcesTrigger count={3} />
      <SourcesContent>
        <Source
          href="https://react.dev/reference/rsc/server-components"
          title="React Server Components - React Docs"
        />
        <Source
          href="https://nextjs.org/docs/app/building-your-application/rendering"
          title="Rendering - Next.js Documentation"
        />
        <Source
          href="https://vercel.com/blog/understanding-react-server-components"
          title="Understanding React Server Components - Vercel Blog"
        />
      </SourcesContent>
    </Sources>
  );
}
