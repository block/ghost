---
for: Transactional email only.
materials:
  - materials/examples/email.html
---

Condition: this node applies only to email. In any other medium, everything
below is a violation.

## Usage

Email clients do not honor the web contract. Custom properties, external
stylesheets, flex layout, and webfonts are unreliable materials here.

Email inverts the material contract deliberately. Transcribe token values by
hand instead of referencing tokens — every hex below is a transcription of
`materials/tokens.css`, which stays the single source; if a token changes,
re-transcribe. Hardcoding hex here is fidelity, not drift. The check
exemption is the condition itself.

Email fidelity is made from boring structure. The soul survives the body
swap: monochrome spine, quiet factual copy, one primary action, no
celebration. A receipt is allowed one degree of warmth; it is not allowed a
palette.

## Rules

- Use `#1a1a1a` (`--color-gray-900`, foreground) for text, `#999999`
  (`--color-gray-500`, muted) for muted text, and `#e8e8e8`
  (`--color-gray-200`, border) for borders when the email needs the Vessel
  palette.
- Keep the surface radius on cards and the control radius on buttons (see
  foundation.shape). The values survive even when the token names cannot
  travel.
- Build with table layout, a 600px wrapper, predictable cells, and
  bulletproof buttons.
- HK Grotesk falls back to the system stack. The voice must survive without
  the font file.
- Email gets exactly one expressive moment: a header band or the figure that
  matters, in one expression hue, transcribed by hand like every value
  here — amber is `#f6b44a` (`--expression-1`). One moment, one hue.

## Never

- Never reference tokens directly in email — custom properties are
  unreliable materials here; instead transcribe token values by hand from
  `materials/tokens.css`, and re-transcribe if a token changes.
- Never add further color to compensate for email constraints — constraint
  is not permission to perform; instead hold to the one expressive moment in
  one hue.
- Never apply anything in this node outside email — in any other medium it
  is a violation; instead use the token-referencing contract the other
  contexts require.
