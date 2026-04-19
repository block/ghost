export function ColorsDemos() {
  return (
    <div className="space-y-12">
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          constant
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-white border dark:border-none" />
            <p className="text-sm text-muted-foreground">white</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-black dark:border" />
            <p className="text-sm text-muted-foreground">black</p>
          </div>
        </div>
      </div>

      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          gray
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-50" />
            <p className="text-sm text-muted-foreground">gray 50</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-100" />
            <p className="text-sm text-muted-foreground">gray 100</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-200" />
            <p className="text-sm text-muted-foreground">gray 200</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-300" />
            <p className="text-sm text-muted-foreground">gray 300</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-400" />
            <p className="text-sm text-muted-foreground">gray 400</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-500" />
            <p className="text-sm text-muted-foreground">gray 500</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-600" />
            <p className="text-sm text-muted-foreground">gray 600</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-700" />
            <p className="text-sm text-muted-foreground">gray 700</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-800" />
            <p className="text-sm text-muted-foreground">gray 800</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-gray-900" />
            <p className="text-sm text-muted-foreground">gray 900</p>
          </div>
        </div>
      </div>

      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          red
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-red-100" />
            <p className="text-sm text-muted-foreground">red 100</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-red-200" />
            <p className="text-sm text-muted-foreground">red 200</p>
          </div>
        </div>
      </div>

      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          blue
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-blue-100" />
            <p className="text-sm text-muted-foreground">blue 100</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-blue-200" />
            <p className="text-sm text-muted-foreground">blue 200</p>
          </div>
        </div>
      </div>

      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          green
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-green-100" />
            <p className="text-sm text-muted-foreground">green 100</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-green-200" />
            <p className="text-sm text-muted-foreground">green 200</p>
          </div>
        </div>
      </div>

      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          yellow
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-yellow-100" />
            <p className="text-sm text-muted-foreground">yellow 100</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-yellow-200" />
            <p className="text-sm text-muted-foreground">yellow 200</p>
          </div>
        </div>
      </div>

      {/* Semantic Colors */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          background
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-background border dark:border-none" />
            <p className="text-sm text-muted-foreground">background default</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-background-alt" />
            <p className="text-sm text-muted-foreground">background alt</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-background-medium" />
            <p className="text-sm text-muted-foreground">background medium</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-muted" />
            <p className="text-sm text-muted-foreground">background muted</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-background-inverse border" />
            <p className="text-sm text-muted-foreground">background inverse</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-destructive" />
            <p className="text-sm text-muted-foreground">background danger</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-background-success" />
            <p className="text-sm text-muted-foreground">background success</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-primary" />
            <p className="text-sm text-muted-foreground">background accent</p>
          </div>
        </div>
      </div>

      {/* Border Colors */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          border
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border" />
            <p className="text-sm text-muted-foreground">border default</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border" />
            <p className="text-sm text-muted-foreground">border card</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-input" />
            <p className="text-sm text-muted-foreground">border input</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border-input-hover" />
            <p className="text-sm text-muted-foreground">border input hover</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border-strong" />
            <p className="text-sm text-muted-foreground">border strong</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border-danger" />
            <p className="text-sm text-muted-foreground">border danger</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border-success" />
            <p className="text-sm text-muted-foreground">border success</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border-warning" />
            <p className="text-sm text-muted-foreground">border warning</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border-info" />
            <p className="text-sm text-muted-foreground">border info</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg border-1 border-border-accent" />
            <p className="text-sm text-muted-foreground">border accent</p>
          </div>
        </div>
      </div>

      {/* Text Colors */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          text
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <p className="text-foreground text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text default</p>
          </div>
          <div className="space-y-2">
            <p className="text-text-alt text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text alt</p>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text muted</p>
          </div>
          <div className="space-y-2">
            <p className="text-primary-foreground text-lg bg-background-inverse p-2 rounded">
              hello world
            </p>
            <p className="text-sm text-muted-foreground">text inverse</p>
          </div>
          <div className="space-y-2">
            <p className="text-destructive text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text danger</p>
          </div>
          <div className="space-y-2">
            <p className="text-text-success text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text success</p>
          </div>
          <div className="space-y-2">
            <p className="text-text-warning text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text warning</p>
          </div>
          <div className="space-y-2">
            <p className="text-text-info text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text info</p>
          </div>
          <div className="space-y-2">
            <p className="text-primary text-lg py-2">hello world</p>
            <p className="text-sm text-muted-foreground">text accent</p>
          </div>
        </div>
      </div>

      {/* Dark Surfaces */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          dark surface
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-surface-dark flex items-center justify-center">
              <p className="text-surface-dark-text text-sm">surface dark</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-surface-dark flex items-center justify-center">
              <p className="text-surface-dark-muted text-sm">
                surface dark muted
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-surface-dark border border-surface-dark-border flex items-center justify-center">
              <p className="text-surface-dark-text text-sm">
                surface dark border
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Colors */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          chart
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-chart-1" />
            <p className="text-sm text-muted-foreground">chart 1</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-chart-2" />
            <p className="text-sm text-muted-foreground">chart 2</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-chart-3" />
            <p className="text-sm text-muted-foreground">chart 3</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-chart-4" />
            <p className="text-sm text-muted-foreground">chart 4</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-chart-5" />
            <p className="text-sm text-muted-foreground">chart 5</p>
          </div>
        </div>
      </div>

      {/* Shadows */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          shadow
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 rounded-card bg-background shadow-mini" />
            <p className="text-sm text-muted-foreground">shadow mini</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-card bg-background shadow-card" />
            <p className="text-sm text-muted-foreground">shadow card</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-card bg-background shadow-elevated" />
            <p className="text-sm text-muted-foreground">shadow elevated</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-card bg-background shadow-popover" />
            <p className="text-sm text-muted-foreground">shadow popover</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-card bg-background shadow-modal" />
            <p className="text-sm text-muted-foreground">shadow modal</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-card bg-background shadow-btn" />
            <p className="text-sm text-muted-foreground">shadow btn</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-card bg-background shadow-kbd" />
            <p className="text-sm text-muted-foreground">shadow kbd</p>
          </div>
        </div>
      </div>

      {/* Radii */}
      <div className="pb-8">
        <h3
          className="font-display font-semibold tracking-[-0.01em] leading-[1.1] mb-6"
          style={{ fontSize: "var(--heading-card-font-size)" }}
        >
          radius
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-pill" />
            <p className="text-sm text-muted-foreground">pill (999px)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-button" />
            <p className="text-sm text-muted-foreground">button (999px)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-input" />
            <p className="text-sm text-muted-foreground">input (999px)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-modal" />
            <p className="text-sm text-muted-foreground">modal (16px)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-card-lg" />
            <p className="text-sm text-muted-foreground">card lg (16px)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-card" />
            <p className="text-sm text-muted-foreground">card (12px)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-card-sm" />
            <p className="text-sm text-muted-foreground">card sm (10px)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 bg-muted rounded-dropdown" />
            <p className="text-sm text-muted-foreground">dropdown (10px)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
