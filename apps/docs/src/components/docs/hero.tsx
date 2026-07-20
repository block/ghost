import { DocSection } from "./docs-page-layout";

export function Hero() {
  return (
    <header className="pb-12" id="home">
      <div className="doc-frame px-[2ch] pt-[var(--doc-page-top)] sm:px-[4ch]">
        <h1 className="text-2xl font-normal leading-8 lowercase">ghost</h1>
        <p className="my-6 max-w-[54ch] rounded-squircle border border-[var(--doc-line)] px-[2ch] py-4 text-foreground">
          a model generates the likeliest thing. ghost makes your brand the
          likeliest thing.
        </p>
      </div>
      <div className="doc-frame relative mt-8 px-[2ch] sm:px-[4ch]">
        <DocSection
          title="thesis"
          marker={0}
          labelAs="h2"
          className="py-12 first:pt-12"
        >
          <p className="max-w-[54ch]">
            brand guidance is fractured across tools. the agent is now the
            maker. ghost gathers what applies and uses it to steer the work.
          </p>
        </DocSection>
      </div>
    </header>
  );
}
