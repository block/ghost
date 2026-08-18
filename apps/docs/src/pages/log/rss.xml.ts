import { getCollection } from "astro:content";
import rss from "@astrojs/rss";

export async function GET(context: { site?: URL }) {
  const entries = (await getCollection("log")).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  if (!context.site) {
    throw new Error("astro.config site is required for the log RSS feed");
  }

  return rss({
    title: "ghost log",
    description: "A development record for ghost.",
    site: new URL(`${base}/`, context.site),
    items: entries.map((entry) => ({
      title: entry.data.title,
      pubDate: entry.data.date,
      description: entry.data.summary,
      link: `${base}/log/${entry.id}/`,
    })),
  });
}
