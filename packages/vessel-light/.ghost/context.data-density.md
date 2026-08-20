---
for: Tables, dashboards, logs, monitoring, or other data-dense consoles.
materials:
  - materials/examples/composition.table.html
  - materials/primitives.css
---

Condition: this node applies to data-dense surfaces — tables, dashboards,
transaction logs, and admin consoles.

## Usage

Data density inverts the settings-page rhythm. Operators need scan speed
before they need breathing room.

Tight adjacency is meaning when rows compare against rows. A ragged amount
column is a broken instrument. Hierarchy is muted-first: data is the default
plane, labels are muted, and emphasis is rare enough to stay useful.

Generous whitespace is drift here. Wasted density makes operators scroll.

## Rules

- Use the two smallest gap steps (`--gap-xs`, `--gap-sm`) where forms use
  the medium step.
- Numerals are mono so columns align.
- Data is the default plane, labels are muted, and emphasis is rare enough
  to stay useful.
- Data surfaces take the small radius.
- Status is a text label with at most one functional color family per view.
- Charts inside a console follow the product carve-out from the palette
  signature: expression hues live inside the plot area only. Outside the
  plot, the one-status-hue cap holds.
- Hairline borders carry rows.
- Hover confirmation uses the fast duration. It should acknowledge
  targeting, not animate the table.

## Never

- Never give a table cell the surface radius — a surface-radius table cell
  is costume; the signature radius (see foundation.shape) belongs on cards,
  not cells — instead data surfaces take the small radius.
- Never let chart color leak into rows, badges, or headers — more status
  color turns monitoring into confetti; instead keep expression hues inside
  the plot area and hold the one-status-hue cap outside it.
- Never zebra stripe — instead let hairline borders carry rows with less
  noise and more trust.
- Never animate the table on hover — instead acknowledge targeting with the
  fast duration.
- Never spend generous whitespace here — it is drift, and wasted density
  makes operators scroll; instead use the two smallest gap steps.
