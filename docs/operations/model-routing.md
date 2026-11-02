# Model routing

The user's model map, and how Workbits uses it. The goal is quality per dollar, not using the biggest model for everything.

## Available models

| Model | Provider | Cost posture | Best at | Use for |
|---|---|---|---|---|
| **DeepSeek V4.1 Flash** | OpenCode Go | Cheapest real coder; near-free cache reads | Mechanical edits, search, implementation, orchestration | Main thread; bulk code; refactors; file edits |
| **Claude Sonnet 5.5** | Claude Code | Employer-paid; plenty of headroom | Workhorse execution | Bulk feature implementation, tests, UI wiring |
| **Claude Opus 5.5** | Claude Code | Employer-paid; scarcer | Hard reasoning, architecture, risky diffs | Architecture decisions, security review, tricky bugs |
| **Claude Haiku 5.5** | Claude Code | Employer-paid; cheap exploration | Bulk exploration | Repo search, file summaries; keep under 100k context |
| **Codex Sol 6.1** | ChatGPT/Codex | Cheaper than Astra; sensible | Planning, critique | Plan reviews, design critique, second opinions |
| **Codex Terra 6.1** | ChatGPT/Codex | Sensible | Communication, text | Copy, docs, UX writing, explanations |
| **Codex Luna 6** | ChatGPT/Codex | Cheap bulk | Summarizing, cheap reads | Log summaries, bulk classification, long-context skims |
| **Codex Astra 6** | ChatGPT/Codex | Extremely costly, token-efficient | Hardest 1–2 calls | Irreversible architecture/security decisions only; low effort unless asked |
| **Kimi K3.1 Pro** | OpenCode Go | Too costly for default rotation | Vision, 3D, modeling, design taste | Visual/art direction checks, 3D/asset reasoning, occasional design review |

## Routing rules

1. **Default:** stay on DeepSeek V4.1 Flash in the main thread. It is almost free and good enough for most edits.
2. **Implementation:** delegate well-scoped coding tasks to Claude Sonnet. Use Opus only when the task is ambiguous, risky, or architectural.
3. **Exploration:** Claude Haiku, kept under ~100k context. Do not let it wander.
4. **Planning/critique:** Codex Sol. Use Terra for text/copy. Use Luna for cheap bulk reads/summaries.
5. **Astra:** at most 1–2 calls in a phase, low reasoning effort, short prompt, specific question. Never `xhigh` unless the user explicitly asks. A single careless Astra xhigh prompt can consume the week.
6. **Kimi:** only for vision/3D/design taste or when its multimodal ability is the point. Tiny prompts; no bulk code.
7. **Claude Code is the workhorse** because it is employer-paid and plentiful. Still snapshot the weekly window before a long run.
8. **Do not use a scarce model to verify something a cheap model can verify.** Use the harness, not tokens.

## Subagent policy

- One child, one scope, self-contained brief.
- Give the child the smallest model that can do the job.
- Tiny smoke tests: low effort, one-line output.
- Parent reviews and reruns the gate; a child's "done" is not evidence.
- For parallel work, cap concurrency (3–4) to avoid rate-limit thrash.

## Smoke-test results — 2026-11-02

All nine models fired successfully through T3 Code:

| Model | Provider | Result |
|---|---|---|
| gpt-6-luna | Codex | ✅ `OK luna` |
| gpt-6-astra | Codex | ✅ `OK astra` |
| gpt-6.1-sol | Codex | ✅ `OK sol` |
| gpt-6.1-terra | Codex | ✅ `OK terra` |
| claude-opus-5-5 | Claude Code | ✅ `OK opus-5.5` |
| claude-sonnet-5-5 | Claude Code | ✅ `OK sonnet-5.5` |
| claude-haiku-5-5 | Claude Code | ✅ `OK haiku-5.5` |
| opencode-go/deepseek-v4.1-flash | OpenCode Go | ✅ `OK deepseek-v4.1-flash` |
| opencode-go/kimi-k3.1-pro | OpenCode Go | ✅ `OK kimi-k3.1-pro` |

No provider failed. Usage deltas were below the Claude/Codex display precision; OpenCode local stats recorded the calls.

## Budget guardrails for the all-night run

- Snapshot usage at phase boundaries (`bun run usage`).
- Prefer Claude Sonnet for the bulk of the build; reserve Opus for architecture/security and Astra for one critical decision.
- Keep Codex prompts short; use Sol/Terra/Luna by default.
- Use Kimi only for visual/3D judgment; do not let it write the codebase.
- If a provider is near its limit, switch to Claude (workhorse) or DeepSeek (near-free), not Astra.
- Log any expensive call and why it was worth it in the phase report.
