import { useEffect, useMemo, useRef, useState } from "react";

const nodes = [
  { id: "brand", description: "the cover: the whole brand on one page" },
  { id: "voice", description: "how we talk; grab for anything with words" },
  { id: "motion", description: "when and how things move on screen" },
  {
    id: "email.transactional",
    description: "when money moved and the reader is checking",
  },
  {
    id: "layout.spacing",
    description: "spacing logic; grab before laying out a page",
  },
  { id: "never.ai-defaults", description: "the AI defaults we refuse" },
  {
    id: "logo.usage",
    description: "the mark, its clearspace, and where it may not appear",
  },
] as const;

const prompts = {
  "refund-email": {
    label: "write the refund confirmation email",
    picked: ["brand", "voice", "email.transactional"],
    command: "ghost pull voice email.transactional",
  },
  "failed-screen": {
    label: "build the failed-payment screen",
    picked: ["brand", "voice", "layout.spacing", "never.ai-defaults"],
    command: "ghost pull voice layout.spacing never.ai-defaults",
  },
  "empty-state": {
    label: "animate the empty-state illustration",
    picked: ["brand", "motion", "never.ai-defaults"],
    command: "ghost pull motion never.ai-defaults",
  },
} as const;

type PromptKey = keyof typeof prompts;

export function GatherDemo() {
  const [active, setActive] = useState<PromptKey | null>(null);
  const [revealed, setRevealed] = useState(0);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearInterval(timerRef.current);
    if (!active) {
      setRevealed(0);
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setRevealed(nodes.length);
      return;
    }

    setRevealed(0);
    timerRef.current = window.setInterval(() => {
      setRevealed((count) => {
        if (count >= nodes.length) {
          window.clearInterval(timerRef.current);
          return count;
        }
        return count + 1;
      });
    }, 220);

    return () => window.clearInterval(timerRef.current);
  }, [active]);

  const selection = active ? prompts[active] : null;
  const picked = useMemo<Set<string>>(
    () => new Set(selection?.picked ?? []),
    [selection],
  );

  return (
    <figure
      className="doc-figure rounded-squircle"
      aria-label="interactive gather example"
    >
      <figcaption className="doc-figure-caption">a gather</figcaption>
      <div
        className="flex flex-wrap gap-x-[1ch] gap-y-2 border-b p-4 px-[2ch]"
        role="group"
        aria-label="pick a task"
      >
        {(
          Object.entries(prompts) as [PromptKey, (typeof prompts)[PromptKey]][]
        ).map(([key, prompt]) => (
          <button
            className="doc-prompt rounded-squircle"
            key={key}
            type="button"
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            “{prompt.label}”
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {nodes.map((node, index) => {
          const visible = active ? index < revealed : true;
          const isPicked = Boolean(active && visible && picked.has(node.id));
          return (
            <div
              className="doc-figure-row"
              key={node.id}
              data-picked={isPicked || undefined}
              data-skipped={active && visible && !isPicked ? true : undefined}
            >
              <div className="font-bold">{node.id}</div>
              <div>
                {node.description}
                {node.id === "brand" ? (
                  <span className="text-[var(--doc-middle)]">
                    {" "}
                    · always in context
                  </span>
                ) : active && visible ? (
                  <span className="font-bold">
                    {isPicked ? " ← picked" : " · skipped"}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t p-4 px-[2ch]">
        <p className="font-bold">{selection?.command ?? "pick a task above"}</p>
        <p className="text-[var(--doc-middle)]">
          {selection
            ? "the cover stays first; selected nodes follow in a fixed reading order"
            : "the agent reads the full menu before deciding what applies"}
        </p>
      </div>
    </figure>
  );
}
