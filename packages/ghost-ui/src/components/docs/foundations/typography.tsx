export function TypographyDemos() {
  return (
    <div className="space-y-12">
      {/* Heading Hierarchy */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          Headings
        </h3>
        <div className="space-y-8 divide-y divide-border-default">
          <div className="pb-8">
            <p
              className="font-display font-black tracking-[-0.05em] leading-[0.88]"
              style={{ fontSize: "var(--heading-display-font-size)" }}
            >
              Display
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Display / 64–96px / Black (900) /-0.05em / 0.88 lh
            </p>
          </div>
          <div className="pb-8">
            <p
              className="font-display font-bold tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: "var(--heading-section-font-size)" }}
            >
              Section heading
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Section / 44–64px / Bold (700) /-0.035em / 0.95 lh
            </p>
          </div>
          <div className="pb-8">
            <p
              className="font-display font-bold tracking-[-0.02em] leading-[1.0]"
              style={{ fontSize: "var(--heading-sub-font-size)" }}
            >
              Subsection heading
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Sub / 28–40px / Bold (700) /-0.02em / 1.0 lh
            </p>
          </div>
          <div className="pb-8">
            <p
              className="font-display font-semibold tracking-[-0.01em] leading-[1.1]"
              style={{ fontSize: "var(--heading-card-font-size)" }}
            >
              Card heading
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              Card / 20–28px / Semibold (600) /-0.01em / 1.1 lh
            </p>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          Labels
        </h3>
        <div className="space-y-8 divide-y divide-border-default">
          <div className="pb-8 space-y-6">
            <div>
              <p
                className="font-display uppercase text-muted-foreground"
                style={{
                  fontSize: "var(--label-font-size)",
                  letterSpacing: "var(--label-letter-spacing)",
                  fontWeight: "var(--label-font-weight)",
                  lineHeight: "var(--label-line-height)",
                }}
              >
                Culture
              </p>
              <p
                className="font-display font-black tracking-[-0.05em] leading-[0.88] mt-3"
                style={{ fontSize: "var(--heading-display-font-size)" }}
              >
                The Future of Open Design
              </p>
            </div>
            <div>
              <p
                className="font-display uppercase text-muted-foreground"
                style={{
                  fontSize: "var(--label-font-size)",
                  letterSpacing: "var(--label-letter-spacing)",
                  fontWeight: "var(--label-font-weight)",
                  lineHeight: "var(--label-line-height)",
                }}
              >
                Design &middot; March 2026
              </p>
              <p
                className="font-display font-bold tracking-[-0.035em] leading-[0.95] mt-2"
                style={{ fontSize: "var(--heading-section-font-size)" }}
              >
                Systems That Scale
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              11px / Semibold (600) / uppercase / +0.12em tracking
            </p>
          </div>
        </div>
      </div>

      {/* Pull Quotes */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          Pull Quotes
        </h3>
        <div className="space-y-8 divide-y divide-border-default">
          <div className="pb-8">
            <blockquote
              className="font-light tracking-[-0.02em] leading-[1.3] text-text-alt border-l-2 border-border-strong pl-6"
              style={{ fontSize: "var(--pullquote-size)" }}
            >
              The magic that happens when you work in the open — co-creation,
              co-celebration.
            </blockquote>
            <p className="text-sm text-muted-foreground mt-3">
              Pull quote / 1.5–2.5rem / Light (300) / -0.02em / 1.3 lh
            </p>
          </div>
        </div>
      </div>

      {/* Type Scale */}
      <div className="space-y-4 py-8 md:py-12">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          Type Scale
        </h3>
        <div className="space-y-12 divide-y divide-border-default">
          <div className="pb-12">
            <p className="text-9xl font-light">
              Open source design: all for one, one for all.
            </p>
            <p className="text-sm text-muted-foreground mt-2">9XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-8xl font-light">
              AI will not replace your job. Humans that use AI will.
            </p>
            <p className="text-sm text-muted-foreground mt-2">8XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-7xl font-light">
              Leave it cleaner than you found it.
            </p>
            <p className="text-sm text-muted-foreground mt-2">7XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-6xl font-light">
              The magic that happens when you work in the open.
            </p>
            <p className="text-sm text-muted-foreground mt-2">6XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-5xl font-light">
              Actual open AI. Co-creation, co-celebration.
            </p>
            <p className="text-sm text-muted-foreground mt-2">5XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-4xl font-light">
              Work <s>hard</s> smarter, play <s>hard</s> in the grass.
            </p>
            <p className="text-sm text-muted-foreground mt-2">4XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-3xl font-light">
              The first rule of open source design is you talk about open source
              design
            </p>
            <p className="text-sm text-muted-foreground mt-2">3XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-2xl font-light">
              Open source design: all for one, one for all.
            </p>
            <p className="text-sm text-muted-foreground mt-2">2XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-xl font-light">
              The magic that happens when you work in the open.
            </p>
            <p className="text-sm text-muted-foreground mt-2">XL / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-lg font-light">
              Leave it cleaner than you found it.
            </p>
            <p className="text-sm text-muted-foreground mt-2">LG / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-base font-light">
              Work <s>hard</s> smarter, play <s>hard</s> in the grass.
            </p>
            <p className="text-sm text-muted-foreground mt-2">BASE / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-sm font-light">
              Actual open AI. Co-creation, co-celebration.
            </p>
            <p className="text-sm text-muted-foreground mt-2">SM / Light</p>
          </div>
          <div className="pb-12">
            <p className="text-xs font-light">
              AI will not replace your job. Humans that use AI will.
            </p>
            <p className="text-sm text-muted-foreground mt-2">XS / Light</p>
          </div>
        </div>
      </div>

      {/* Font Weights */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          Weights
        </h3>
        <div className="space-y-8 divide-y divide-border-default">
          <div className="pb-8">
            <p className="text-3xl font-light">The quick brown fox</p>
            <p className="text-sm text-muted-foreground mt-2">300 / Light</p>
          </div>
          <div className="pb-8">
            <p className="text-3xl font-normal">The quick brown fox</p>
            <p className="text-sm text-muted-foreground mt-2">400 / Regular</p>
          </div>
          <div className="pb-8">
            <p className="text-3xl font-medium">The quick brown fox</p>
            <p className="text-sm text-muted-foreground mt-2">500 / Medium</p>
          </div>
          <div className="pb-8">
            <p className="text-3xl font-semibold">The quick brown fox</p>
            <p className="text-sm text-muted-foreground mt-2">600 / Semibold</p>
          </div>
          <div className="pb-8">
            <p className="text-3xl font-bold">The quick brown fox</p>
            <p className="text-sm text-muted-foreground mt-2">700 / Bold</p>
          </div>
          <div className="pb-8">
            <p className="text-3xl font-black">The quick brown fox</p>
            <p className="text-sm text-muted-foreground mt-2">900 / Black</p>
          </div>
        </div>
      </div>

      {/* Font Families */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          Families
        </h3>
        <div className="space-y-8 divide-y divide-border-default">
          <div className="pb-8">
            <p className="text-3xl font-sans font-medium">
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="text-sm text-muted-foreground mt-2">font-sans</p>
          </div>
          <div className="pb-8">
            <p className="text-3xl font-display font-medium">
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="text-sm text-muted-foreground mt-2">font-display</p>
          </div>
          <div className="pb-8">
            <p className="text-3xl font-mono font-normal">
              Geist Mono — The quick brown fox
            </p>
            <p className="text-sm text-muted-foreground mt-2">font-mono</p>
          </div>
        </div>
      </div>
    </div>
  );
}
