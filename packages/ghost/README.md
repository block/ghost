# @design-intelligence/ghost

ghost is a brand context router for agents. You record your brand's design
decisions and when they apply. Your agent selects the guidance for the task,
and ghost delivers it before work begins.

Keep the guidance as markdown files in your repo, alongside the code and
assets it refers to. You confirm the decisions and review the work your
agent makes with them.

ghost works with Claude Code, Codex, Cursor, OpenCode, and Goose. The CLI
calls no model and needs no API key.

[Project site](https://block.github.io/ghost/) ·
[Repo](https://github.com/block/ghost)

> [!NOTE]
> ghost is an early preview. The CLI, package format, and APIs can change
> without migration support, and breaking changes can ship in minor versions.
> Try it on a real repo and tell us what broke or confused you.

## Install

Requires Node 20.19+ or 22.12+.

```bash
npm install -D @design-intelligence/ghost
npx ghost skill install
```

The skill gives your agent instructions for setting up and using ghost.
If you use several agents, choose the destination with
`npx ghost skill install --agent goose`, for example.

With the skill installed, ask your agent to do the setup:

```text
Set up the ghost package for this repo.
```

Your agent runs `ghost init` to create a `.ghost/` folder with starter
guidance. Treat those starting answers as provisional until you accept or
replace them. Share existing brand docs, examples you like, or corrections
you keep making; your agent can help turn them into guidance for you to
confirm.

## Write down one decision

Give your agent one decision and the situation it applies to:

```text
Record this decision as ghost guidance: a payment-failure message states
the known fact and the recovery action. It never speculates about the cause.
```

Your agent drafts a file for you to confirm. Something like
`.ghost/payment-failure.md`:

```markdown
---
for: Writing an email, error message, or support reply about a failed payment.
---

State what we know and what the customer can do next. "Your card was
declined. Try another card or contact your bank." Do not guess at the
reason, and do not imply fault.
```

Check the wording before accepting the draft. The `for` line tells the
agent when to use it; the body gives the decision. Ask your agent to link
relevant code or assets if you have them. Review changes to the guidance
through Git, as you would any other file in your repo.

The same rule can apply to an email, an error message, or a support reply.
Each task may need different guidance alongside it, such as email structure
or the tone of a support response.

Now give your agent the actual work:

```text
Use the ghost guidance to write the email we send when a subscription
renewal is declined.
```

You don't need to run retrieval commands yourself. Under that request,
your agent runs something like:

```bash
npx ghost gather "email for a declined subscription renewal"
npx ghost pull payment-failure foundation.voice
```

`foundation.voice` comes from the starter; `payment-failure` is the file you
added. `gather` lists all valid, selectable guidance, without filtering or
ranking by the task. Your agent selects every applicable file and uses
`pull` to read it, along with the package's cover if it has one. A rule can
apply even if its words don't appear in your request.

When guidance points to source files, the CLI includes eligible local text
or provides pointers for your agent to inspect. It doesn't fetch external
references. `ghost stats` summarizes the local selection log so you can see
which guidance agents pull.

## What you still have to do

Review the email against the decision you recorded. Did it state the known
failure and give a recovery action without inventing a cause?

ghost doesn't learn your brand on its own or score the result. You confirm
the decisions; your agent interprets them. The local log records selections
and delivery counts, not proof that the model received or followed the
guidance. You can use the same guidance files with another agent or model.

## Review checks, if you want them

You can add review instructions in `.ghost/checks/` for your agent to assess
a change against your guidance. Ask it:

```text
Set up ghost review checks for our payment-failure guidance.
Review this diff against those checks.
```

The default starter has no checks. `ghost checks init` adds an example for
you to adapt. `ghost review` requires the checks directory and a diff; it
assembles the change, matched guidance, and checks for your agent to assess.
It doesn't grade the work. Checks stay out of gather and pull output.

## Reference

If you want to run the CLI yourself, use `npx ghost`:

```bash
npx ghost validate          # check guidance and review checks
npx ghost gather "<task>"   # list the guidance menu for your agent to select from
npx ghost pull <id>         # read selected guidance and the cover, if present
npx ghost review            # assemble a review packet for a diff
npx ghost stats             # summarize local usage
```

See the [package and CLI reference](https://github.com/block/ghost/blob/main/packages/ghost/src/skill-bundle/references/schema.md)
for formats and flags, or the [authoring guide](https://github.com/block/ghost/blob/main/packages/ghost/src/skill-bundle/references/authoring.md)
for creating and updating guidance.

## Alongside other tools

Keep repo-wide instructions in `AGENTS.md`. Use `.ghost/` for brand decisions
that apply to particular tasks, so email rules don't need to accompany a
dashboard request.

For a short guide, pasting the text into a prompt may be enough. With ghost,
you maintain the guidance in your repo and let your agent choose from the
menu for each task, rather than choosing passages to paste each time.

## Contributing and evaluations

See [Contributing](https://github.com/block/ghost/blob/main/CONTRIBUTING.md)
for development and release checks. To test your own guidance, use
[context-control](https://github.com/block/ghost/tree/main/packages/context-control)
to measure selection and
[steering-control](https://github.com/block/ghost/tree/main/packages/steering-control)
to compare outputs with and without a package.

## License

[Apache License 2.0](https://github.com/block/ghost/blob/main/LICENSE) ·
[Governance](https://github.com/block/ghost/blob/main/GOVERNANCE.md)
