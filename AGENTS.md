# AGENTS.md — Working on Workbits

This file is the operating manual for any agent (or human) working in this repository. Read it before touching code.

## 1. Read order

1. `README.md` — what Workbits is and the current status.
2. `docs/brief.md` — the user's original directives.
3. `PLAN.md` — product, architecture, phases, risks.
4. `docs/decisions.md` — accepted decisions and their consequences.
5. `docs/open-questions.md` — what is still unresolved.
6. `docs/progress.md` — what has actually been done.
7. The task-relevant doc under `docs/architecture/`, `docs/art/`, or `docs/verification/`.

If a document conflicts with the user's latest message, **the user wins**. Update the docs and record the decision.

## 2. Current state

- Phase 0 (foundation) is **planning complete, build not started**.
- Do not scaffold the product or install app dependencies until the user says **go**.
- The art direction is approved: warm stylized 3D diorama, 80% flat color / 20% render polish, chibi modular characters.
- The project name is **Workbits** (working name).
- Runtime AI model access and the user's model/seed references are still pending.

## 3. Non-negotiables

1. **Place first.** The office, presence, and proximity are the product. Chat/voice are not enough.
2. **One art direction.** Warm stylized 3D diorama. No pixel art, no fantasy chrome, no mixed asset packs, no AI-generated core geometry.
3. **Evidence, not assertions.** A passing build is not proof. Run the app, capture screenshots/video/metrics, and attach them to the phase report.
4. **Simple deployment by default.** One Node process (API + realtime), Postgres, LiveKit, Caddy. Redis, S3, and extra workers are optional and behind interfaces.
5. **Tenant isolation and authz from day one.** Every query is scoped. Tokens are short-lived and room-scoped.
6. **No copying.** References (SoWork, WorkAdventure, WoW, etc.) are direction only. Do not copy assets, branding, UI, or AGPL code.
7. **No secrets in the repo.** Use `.env.local` / secret references.
8. **Do not add a dependency without a reason.** Prefer the platform and existing packages. Record meaningful choices as ADRs.

## 4. Workflow

Use a pstack-style loop:

1. **Clarify the outcome.** Restate the goal and the acceptance criteria. If the user is available, ask only the questions that change the build.
2. **Plan the smallest vertical slice.** Write it in the phase doc or task list. No breadth before the core loop works.
3. **Implement.** Keep changes consistent with the surrounding code. Update docs as you go.
4. **Verify in the running app.** Use the harness (screenshots, flows, bots, perf, a11y). Attach evidence.
5. **Self-review adversarially.** Check authz, empty/error/loading states, mobile, and regressions.
6. **Record.** Update `docs/progress.md`, `docs/decisions.md` if a decision changed, and `docs/backlog.md` for deferred work.

## 5. Verification requirements

- Every phase has a gate in `docs/verification/gates.md`.
- The harness CLI lives in `packages/harness` (to be built in Phase 0).
- Minimum evidence for a phase:
  - typecheck + lint + unit tests
  - the phase's E2E flow (two browser contexts where relevant)
  - screenshots at desktop and mobile widths
  - a short screen recording for interactions
  - performance numbers against the budget
  - accessibility audit (axe) with no critical issues
  - authz/tenant-isolation checks
- Artifacts go to `artifacts/<timestamp>/` and are summarized in a `report.md`.
- Never mark a phase done if the evidence is missing. Say what is unverified.

### Performance budget

- 60 fps at 1080p on a 3–4 year old laptop with integrated graphics.
- 30 fps floor on mobile.
- p95 frame time < 20 ms; draw calls < 400; JS heap < 500 MB at 50 avatars.
- Initial load < 3 s on 20 Mbps; office switch < 1 s after cache.
- Degrade DPR, shadows, SSAO, and postprocessing before frame rate.

## 6. Commands (once Phase 0 exists)

```bash
bun install
bun run dev            # web + server + infra
bun run harness up
bun run harness shot <route>
bun run harness flow <name>
bun run harness report
bun run typecheck
bun run test
bun run lint
```

Use **Bun** for installs and scripts. If a server dependency is incompatible with Bun's runtime, run that process on Node 24 and document the deviation. Do not commit two lockfiles.

## Model routing and usage

- **Default main thread:** DeepSeek V4.1 Flash (OpenCode Go) — near-free, good for mechanical work.
- **Bulk implementation:** Claude Sonnet 5.5 (employer-paid, plentiful).
- **Architecture / risky diffs / security:** Claude Opus 5.5.
- **Bulk exploration:** Claude Haiku 5.5, under ~100k context.
- **Planning / critique:** Codex Sol 6.1. **Text/copy:** Terra 6.1. **Cheap bulk reads:** Luna 6.
- **Astra 6:** only 1–2 irreversible calls per phase, low effort, short prompt. Never `xhigh` unless the user asks.
- **Kimi K3.1 Pro:** vision/3D/design taste only; too costly for bulk code.
- Snapshot usage at phase boundaries with `bun run usage`; record deltas in `docs/progress.md`.
- See [`docs/operations/model-routing.md`](docs/operations/model-routing.md) and [`docs/operations/usage.md`](docs/operations/usage.md).

## 7. Code conventions

- TypeScript strict everywhere. No `any` unless isolated and justified.
- Zod schemas are the boundary between the client, server, and AI output. Infer types from schemas.
- Server is authoritative for movement, zones, chat membership, and permissions.
- Client state: zustand for UI/app state; mutable refs/external stores for per-frame 3D data. Never set React state every frame.
- Database: Drizzle migrations, tenant-scoped queries, soft deletes where history matters.
- UI: accessible primitives, keyboard support, focus states, reduced motion.
- Naming: `kebab-case` files, `PascalCase` components, `camelCase` functions/variables.
- Commits: conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Keep the diff focused. Do not reformat unrelated files.

## 8. Docs discipline

- `PLAN.md` is the master plan. Keep it current.
- `docs/brief.md` is the user's intent. Do not rewrite it to fit the implementation.
- `docs/decisions.md` is append-only ADRs. Supersede, don't delete.
- `docs/progress.md` is the source of truth for what is done. Update it at the end of every work session.
- `docs/open-questions.md` is for real blockers, not ideas. Ideas go to `docs/backlog.md`.
- `docs/research/models.md` is where the user's model/seed references and our evaluation live.

## 9. Subagents

Subagents pay a **handoff tax**: they start without the parent's context, can lose nuance, and multiply cost. Use them deliberately.

**Use a subagent when:**

- The work is independent and can run in parallel.
- It is bulk investigation, review, or consulting where a fresh context is cheaper than loading the parent's.
- You need a different model's strength (Opus for architecture, Sol for critique, Kimi for vision).
- You need blind/adversarial review — a child that did not see the parent's reasoning is good at catching assumptions.
- A self-contained task would otherwise block the main thread.

**Do not use one when:**

- The task is small or sequential; the parent can do it faster.
- The child would need most of the parent's context (the handoff tax exceeds the benefit).
- Two children would edit the same files.
- You are delegating to avoid thinking. Judgment on art quality, security, and product scope stays with the parent.
- A cheap local check (test, grep, screenshot) answers the question.

**Brief requirements:**

- Goal, files, constraints, acceptance criteria, and output path.
- The smallest model that can do the job.
- Read-only if possible; one child, one scope.
- The child verifies its own work and reports evidence, not just "done".
- The parent reviews the diff and reruns the gate. A child's claim is not proof.

**Cost rules:** cap concurrency at 3–4, keep prompts tight, avoid long Astra calls, and snapshot usage before/after a delegation-heavy phase.

## 10. Security and privacy

- AuthN via better-auth; AuthZ checked server-side on every mutation.
- All tenant data queries include `org_id`; tests must prove cross-tenant denial.
- LiveKit tokens are short-lived and scoped to one room; never expose the API secret.
- Rate-limit auth, chat, AI, uploads, and room joins.
- Validate uploads by MIME, extension, size, and magic bytes; store outside the web root.
- Sanitize markdown; escape user content; CSP; no `dangerouslySetInnerHTML` without sanitization.
- No voice/video recording by default. Log metadata, not content.
- Audit admin actions and AI usage.

## 11. Definition of done

A task is done only when:

- The behavior works in the running app.
- The relevant gate passes.
- Evidence is attached.
- Docs/progress are updated.
- No known security, tenant-isolation, or performance regression is left unstated.

## 12. Directory map

```
apps/web          React + Vite + R3F client
apps/server       Fastify API + Colyseus realtime
packages/shared   Zod schemas, protocol types, constants
packages/db       Drizzle schema, migrations, seed
packages/ui       Design system
packages/harness  Verification CLI and Playwright flows
packages/assets   Asset catalog manifests and pipeline
infra             Docker Compose, Caddy, LiveKit, deploy scripts
art               Concept references, style frames, exports
docs              Product, architecture, research, verification
```
