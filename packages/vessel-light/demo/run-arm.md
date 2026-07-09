# Arm assembly (for the driving agent)

All arms: fresh context per run. Same model, same temperature. Write output to
out/<arm>/<ask-n>/run-<k>.html.

## Arm A — naked
1. Load ballast.md.
2. Give the ask. No fingerprint anywhere.

## Arm B — dump
1. Concatenate every node in packages/vessel-light/.ghost/*.md (bodies, in
   filename order) at the TOP of context — the naive system-prompt integration.
2. Load ballast.md after it.
3. Give the ask. Do not mention gather or selection.

## Arm B-clean (optional)
Same as B without ballast.

## Arm C — gather
1. Load ballast.md.
2. Run: ghost gather "<ask>" --package packages/vessel-light/.ghost
3. Let the agent select nodes against the ask, then:
   ghost pull <ids> --package packages/vessel-light/.ghost
4. Give the ask. Pulls sit near the ask, after ballast.

## Scoring
1. Stage each artifact in a scratch git repo containing the .ghost package;
   run ghost review --no-probes; record which checks fire and what a reviewing
   agent flags per artifact.
2. Screenshot every artifact (agent-browser). Assemble per-ask grids: A | B | C.
3. Report consistency across the 3–5 runs per cell, not single wins.
