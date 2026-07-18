import { InlineIndex } from "./doc-index";

const links = [
  { label: "fracture", href: "/#fracture" },
  { label: "maker", href: "/#maker" },
  { label: "guidance", href: "/#guidance" },
  { label: "gather", href: "/#gather" },
  { label: "docs", href: "/docs" },
];

export function Hero() {
  return (
    <header
      className="doc-frame px-[2ch] pb-12 pt-16 sm:px-[4ch] sm:pt-20"
      id="home"
    >
      <h1 className="text-2xl font-normal leading-8 lowercase">ghost</h1>
      <p className="my-6 max-w-[54ch] rounded-squircle border border-[var(--doc-line)] px-[2ch] py-4 text-foreground">
        a model generates the likeliest thing. ghost makes your brand the
        likeliest thing.
      </p>
      <InlineIndex items={links} />
    </header>
  );
}
