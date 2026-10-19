# Preventive authoring fixture

This fixture documents desired workflow shape for host evaluation. Deterministic
tests read headings and markers only; they do not prove model behavior.

## Scenario: design assessment without silent override

### Approved decision

Primary actions should stay visually quiet in account-recovery flows so the page
feels calm.

### Risk

The approved decision can create a usability and accessibility concern if the
primary action loses contrast or becomes hard to find.

### Expected authoring move

The agent explains the concern, recommends preserving a clear action target, and
asks before changing the approved brand direction.

## Scenario: no addition is valid

### Approved decision

Use the existing `AlertRail` component for recoverable payment errors.

### Existing evidence

`materials` points to `src/components/AlertRail.tsx`, and current guidance
already says reach for it when the user's next step is recovery.

### Expected authoring move

The agent reports that no package addition is needed because the risk is already
resolved by approved prose plus an existing component locator.

## Scenario: useful near miss

### Weak guidance without example

Use a concise confirmation pattern.

### Improved guidance with small example

This example is normative for information order and action priority.
The merchant name is incidental.
Use this pattern only after a payment action succeeds.

```html
<section class="receipt-confirmation">
  <p>Payment sent to Ada's Books.</p>
  <a href="/receipt">View receipt</a>
</section>
```

Near miss: leading with a promotional offer before the receipt link is wrong in
this situation because it interrupts confirmation of the completed action.
Changing the merchant name, amount, or receipt URL is acceptable variation.

### Material locator

`materials` should point at `src/components/ReceiptConfirmation.tsx` rather than
copying its component API into the node.

## Scenario: consequence priorities

### Approved decision

Checkout should emphasize what remains safe before asking the buyer to retry.

### Gaps

1. Low-contrast recovery action risks accessibility and completion.
2. Legacy examples put reassurance after a marketing panel, weakening trust.
3. Button corner radius differs slightly across two old screenshots.

### Expected authoring move

The agent ranks the action contrast and trust-order gaps first, then defers the
minor radius difference unless the human says it is a central design choice.
