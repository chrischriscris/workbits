# Usage tracking

## What we can see

| Provider | Remaining plan usage | Local token/cost data | How |
|---|---|---|---|
| **Claude Code** | ✅ Yes — session, weekly, weekly (Fable) windows | ✅ Session history | `codexbar usage --provider claude --format json` |
| **Codex / ChatGPT** | ✅ Yes — weekly window, reset time | ✅ Codex logs | `codexbar usage --provider codex --format json` |
| **OpenCode Go** | ⚠️ Not via this CLI. The 5-hour/monthly limits are on the OpenCode dashboard. | ✅ Tokens, steps, models, cost (0 on subscription) | `opencode stats --days N --json --cost` |

`codexbar` is the same tool already on the user's desktop (Hyprland/GTK widget). It reads the local Claude/Codex credentials and prints JSON. We can run it before and after a phase and diff the percentages.

For OpenCode, `opencode stats` reads the local `~/.local/share/opencode/opencode.db` and reports per-model token usage. We cannot see the exact 5-hour/monthly quota from it, but we can track relative spend and enforce budgets. If exact OpenCode quota becomes necessary, the `codexbar` source has an `opencode_zen` provider that expects an `OPENCODE_CONSOLE_COOKIE`; this build's CLI does not expose it, so the dashboard is the current source of truth.

## Command

```bash
bun run usage
```

or directly:

```bash
bash scripts/usage.sh
```

It writes a timestamped snapshot to `artifacts/usage/<timestamp>/` (gitignored):
- `codexbar.json` — Claude + Codex windows
- `opencode.json` — local OpenCode token/model stats
- `.err` files for failures

## Baseline — 2026-11-02 ~04:43 UTC

| Provider | Plan | Used | Left | Reset |
|---|---|---|---|---|
| Claude | Team | Weekly 45%, session 0% | 55% weekly | Weekly in ~14 h; session in ~1.5 h |
| Codex | Plus | Weekly 6% | 94% weekly | Wed 08:01 |
| OpenCode | Go | Local only | — | Dashboard |

Smoke-testing all 9 models did not move the Claude/Codex percentages at the displayed precision. OpenCode's Kimi smoke test used ~110 input / 22 output / 10 reasoning tokens plus ~3k cache read / ~10k cache write; DeepSeek used the bulk of the local tokens.

## Rules

1. **Snapshot before and after every phase.** Append the delta to `docs/progress.md`.
2. **Prefer Claude Code for heavy implementation.** It is employer-paid and has the most headroom; still watch the weekly window.
3. **Watch Codex usage, not call counts.** Sol/Terra/Luna are the sensible defaults. Astra only when a call cannot be settled otherwise; never `xhigh` unless the user asks.
4. **OpenCode Kimi is expensive.** Use it for vision/3D/design taste, not bulk coding. DeepSeek is the main-thread workhorse.
5. **No long prompts on scarce models.** Give them a tight brief and a small output.
6. **Record model + purpose** in the phase report when a non-default model is used.

## Caveats

- Claude/Codex percentages are plan-level and rounded; they may not move for small calls.
- OpenCode `cost` is 0 because the Go plan is a subscription; token counts are the real signal.
- The dashboard's request-count limits are not the same as token counts; use both when planning a long run.
- Never print credentials or cookies. The script only writes usage metadata.
