---
for: "Creating or reviewing operational screens, entity lists, configuration pages, search, filters, or status messages."
requires: [baseline.fundamentals.core, baseline.fundamentals.composition, baseline.fundamentals.typesetting, baseline.fundamentals.accessibility, baseline.fundamentals.content-integrity, baseline.fundamentals.craft]
---

## Usage

Product defaults help a person locate a record, understand its current state, and act. Keep operational content prominent rather than treating the screen as a campaign.

## Rules

- Keep same-level buttons consistent in height, horizontal padding, and type style; let their labels determine their widths.
- Keep essential mobile actions in the same position with the same label as density increases.
- Where dismissal is allowed, let an interruptive overlay close with Escape or an explicit close action.
- Explain why a disabled action is unavailable when the reason matters to completing the task.
- Give each destination one navigation home; use contextual links for additional routes.
- Keep top-level navigation categories mutually exclusive, with noun or noun-phrase labels in the user’s language.
- Show the current location, available next destinations, and a way back.
- Give long lists search and filtering; use search rather than a filter for a field unique to each row.
- Give the identifying table column the most width, keep status and metadata columns narrow, and right-align numeric columns; shorten content or remove a column rather than clipping primary text, wrapping status labels, or colliding columns.
- Keep row heights consistent and touch-safe according to the documented table anatomy.
- On small screens, preserve row identity, status, and one action in a compact list.
- In an empty list, explain what will appear and offer the action that creates the first record.
- Put a data summary’s context, date range, comparison period, primary metric or health status, and meaningful change near the top; keep each summary to a label, number, and at most one line of context.
- Show one current configuration state; summarize other states compactly or, when every state is requested, provide separate labeled page-sized variants.
- Give a configuration object its name, current status, and one action; expand details rather than enlarging the default row.
- Let filter controls match the data: checkboxes for multiple choices, radios or a segmented control for one choice, a select for a long list, and a text field or slider paired with a text field for an exact numeric range.
- Keep applied filters visible together and removable without reopening their controls.
- Combine values within a filter category as OR and categories as AND; explain the combination in words when the results do not make it clear.
- Keep sorting separate from filtering, using sortable headers for tables or a separate sort control for other collections.
- Place a status message beside the element it concerns, or at the top for a whole-screen problem; say what happened, why it matters, and what to do.
- Give an event or state one status message in one place; after a transient confirmation disappears, leave its resulting state visible permanently.
- Keep messages requiring action or reporting time-sensitive problems visible until resolved rather than using a disappearing toast.

## Never

- Never shrink table type below the documented ramp or allow columns to overflow to make a table fit — instead shorten content or remove a column.
- Never stack full page-sections vertically to show a flow — instead use a compact stepper or distinct labeled page-sized variants.

- Never show every possible configuration state as simultaneous current truth — instead show the current state, with alternatives summarized or separated into labeled variants.
- Never make fixed numeric buckets the only range control — instead allow an exact value in a text field.
