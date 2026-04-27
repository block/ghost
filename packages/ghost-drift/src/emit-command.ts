// Thin shim — the emit verb's implementation lives in `ghost-expression`.
// The follow-up "trim drift" commit replaces this file with a drift-only
// emit verb (skill bundle only) and migration messages for the moved kinds.
export { registerEmitCommand } from "ghost-expression/cli";
