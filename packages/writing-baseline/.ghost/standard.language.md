---
for: Writing or editing copy a person will read, from interface labels and errors to email, marketing, and documentation.
materials:
  - locator: https://www.w3.org/TR/WCAG22/
    note: WCAG 2.2; success criteria are cited by number in the rules below
  - locator: https://www.iso.org/standard/78907.html
    note: ISO 24495-1:2023, plain language governing principles and guidelines
  - locator: https://www.deceptive.design/types
    note: Deceptive pattern types behind the honesty rules
  - locator: https://cldr.unicode.org/index/cldr-spec/plural-rules
    note: Unicode CLDR plural categories behind the whole-strings rule
---

Shared language obligations: what any brand's copy owes its reader. Every
rule below is an **Obligation**: honesty, accessibility, or functional
integrity that brand preference cannot waive. The brand controls how each one
sounds, not whether it holds. A playful brand and a formal one both name the
destructive act; they use different words to do it.

Voice belongs to the brand's voice foundation. Generic phrasing belongs to the
package's shared defaults (`standard.copy-defaults` or
`standard.model-defaults`). When a rule here seems to collide with the
brand's voice, keep the rule and rewrite the words. Adapt the wording of a
rule to your brand freely; keep its heading so paired checks still resolve.

Each rule names its public source: a WCAG 2.2 success criterion (SC), a
deceptive pattern type, ISO 24495-1 plain language, or CLDR plural rules.

## Honesty

### Invented evidence
Use only facts the task or its materials supply: statistics, customer counts,
quotes, testimonials, ratings, awards, customer logos, dates, and prices.
Reject a plausible invention ("Trusted by 10,000+ teams") → a visible
placeholder such as `[customer quote]`, or no evidence at all. (Deceptive
pattern: fake social proof.)

### Pressure
Reject invented urgency or scarcity (fake deadlines, stock counts, countdowns)
→ the real reason to act now when the task supplies one, or none. (Deceptive
patterns: fake urgency, fake scarcity.)

### Decline options
Reject confirmshaming ("No thanks, I don't like saving money") → a neutral
decline such as "No thanks" or "Not now", as easy to find as the accept.
(Deceptive pattern: confirmshaming.)

### Cost before commitment
Price, recurring charges, renewal terms, and data the person is sharing appear
before or on the action that commits them, never only after it or behind a
link. (Deceptive patterns: hidden costs, hidden subscription, sneaking.)

### Failure
Failure copy states what is known and what the person can do next. Reject
guessing at the cause or implying the person is at fault → the known fact
and the recovery action.

## Clarity

### Self-describing actions
Link and button text names its destination or outcome and makes sense read
alone, the way a screen reader lists it. Reject "Click here" and a bare
"Learn more" → "Read the refund policy", "Compare plans". (SC 2.4.4, 2.4.6)

### Errors that recover
An error says what happened and how to fix it, in words, next to the thing to
fix. Reject "Invalid input" or a color or icon alone → "Enter a date after
today". (SC 3.3.1, 3.3.3)

### Sensory instructions
Reject instructions that depend on color, shape, position, or sound alone
("Click the green button", "the box on the right") → the control's name.
(SC 1.3.3)

### Image text
Alt text says what the image shows or does in this context; a decorative
image gets empty alt text. Reject "Image of…", filenames, and keyword lists →
the content or function in a short phrase. (SC 1.1.1)

### Plain words where it counts
Copy about money, safety, health, privacy, legal terms, or account access uses
everyday words and short sentences, even where the brand's voice otherwise
welcomes jargon. Define any term the person must understand to decide.
(ISO 24495-1: readers can find, understand, and use what they need.)

## Integrity

### Labels name outcomes
A button says what happens when it is pressed. Reject "OK" / "Cancel" on a
consequential choice → buttons that answer the dialog's question, such as
"Delete project" / "Keep project". (SC 3.3.2)

### Destructive acts
Before a destructive or irreversible action, say what will be lost and whether
it can be undone. Reject a softened verb ("Remove" for a permanent delete) →
the verb that matches what happens. (SC 3.3.4)

### One name per thing
A feature, object, or action keeps one name across a surface and its flow.
Reject synonyms for variety ("project", "workspace", "space") → the product's
name for it, repeated. (SC 3.2.4)

### Whole strings
Write each message as a complete phrase with its plural forms, not assembled
from fragments, so word order and grammar survive translation. Reject
"{n} file(s) deleted" or a sentence glued from variables → "1 file deleted"
and "{n} files deleted" as separate strings. (CLDR plural rules: languages
need different plural forms; "(s)" fits none of them.)

### Assumed identity
Do not assume the reader's gender, age, ability, family, or circumstance when
the task has not established it. Reject "he or she" and gendered defaults →
"you", "they", or the person's role.
