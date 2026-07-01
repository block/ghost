---
"@anarchitecture/ghost-fingerprint": minor
---

Rename the published package from `@anarchitecture/ghost` to
`@anarchitecture/ghost-fingerprint`. Ghost is now a family of packages —
`ghost-fingerprint` (the fingerprint and its CLI), `ghost-haunt` (the
code-anchored adherence bridge), and `ghost-vessel` (the reference body) —
and the package name now says which part it is. The `ghost` bin, all export
subpaths (`/fingerprint`, `/scan`, `/core`, `/cli`), and the `.ghost/`
on-disk format are unchanged; only the install name moves. Existing installs
keep working from the old name until it is deprecated on npm with a pointer
forward.
