import { BetaWarning } from "@/components/docs/beta-warning";
import { DocIndex, type DocIndexItem } from "@/components/docs/doc-index";
import { PageHeader } from "@/components/docs/page-header";
import { SectionWrapper } from "@/components/docs/wrappers";

const learn: DocIndexItem[] = [
  {
    name: "Getting started",
    href: "/docs/getting-started",
    description:
      "Record one repeated decision and give it to an agent before the next task.",
  },
  {
    name: "Authoring",
    href: "/docs/authoring",
    description:
      "Turn intent, shown material, and repeated decisions into guidance an agent can use.",
  },
  {
    name: "Checks and review",
    href: "/docs/checks-and-review",
    description:
      "Attach review assertions to brand guidance and inspect changed work after generation.",
  },
];

const reference: DocIndexItem[] = [
  {
    name: "CLI reference",
    href: "/docs/cli",
    description:
      "Exact commands, flags, outputs, and exit behavior for the ghost CLI.",
  },
  {
    name: "Troubleshooting",
    href: "/docs/troubleshooting",
    description:
      "Diagnose package discovery, validation, context gathering, review, and installation problems.",
  },
];

export default function DocsIndex() {
  return (
    <SectionWrapper>
      <PageHeader kicker="" title="documentation" description="" />
      <BetaWarning />

      <section className="mb-16 mt-12">
        <h2 className="mb-6 font-bold lowercase">learn</h2>
        <DocIndex items={learn} />
      </section>

      <section className="mb-20">
        <h2 className="mb-6 font-bold lowercase">reference</h2>
        <DocIndex items={reference} startAt={learn.length + 1} />
      </section>
    </SectionWrapper>
  );
}
