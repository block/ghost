---
"@anarchitecture/ghost-fingerprint": minor
---

Add `ghost pull <id> [<id>…]`: emit the named nodes' full prose bodies and append each selection to `.ghost/.pulls`, a local gitignored history tape so a fingerprint author can see which truths an agent reached for while iterating on descriptions. Ghost never reads the tape back; `--no-history` skips the append. `ghost init` now seeds a `.gitignore` covering the tape, and the skill bundle teaches agents to pull instead of reading node files directly.
