# Workbits docs

The documentation is split by purpose. Keep it current; stale docs are worse than no docs.

## Start here

| Doc | What it answers |
|---|---|
| [`../README.md`](../README.md) | What is Workbits, current status, repo map |
| [`../AGENTS.md`](../AGENTS.md) | How to work in this repo |
| [`brief.md`](brief.md) | The user's original directives, distilled |
| [`../PLAN.md`](../PLAN.md) | Product, architecture, phases, risks |
| [`progress.md`](progress.md) | What is actually done, phase by phase |
| [`decisions.md`](decisions.md) | Accepted decisions (ADRs) |
| [`open-questions.md`](open-questions.md) | What still needs a decision |
| [`backlog.md`](backlog.md) | Deliberately deferred ideas |

## By area

### Product

- [`brief.md`](brief.md) — vision, must-haves, constraints, success criteria.
- [`../PLAN.md`](../PLAN.md) — scope, non-goals, phases, risks, definition of done.
- [`open-questions.md`](open-questions.md) — decisions needed from the user.
- [`backlog.md`](backlog.md) — later ideas and integrations.

### Art

- [`art/direction.md`](art/direction.md) — the approved style bible.
- [`art/references.md`](art/references.md) — analysis of the user's references and the generated concepts.
- [`art/team-cast.md`](art/team-cast.md) — the Workbits team cast, translated from the group reference + photos.
- [`../art/`](../art/) — the actual reference images.
- [`../seeds/team/`](../seeds/team/) — the optional, data-driven team demo pack.

### Architecture

- [`architecture/overview.md`](architecture/overview.md) — system diagram and trust boundaries.
- [`architecture/data-model.md`](architecture/data-model.md) — tables and tenant isolation.
- [`architecture/avatars.md`](architecture/avatars.md) — modular avatars, species, generator, seed packs.
- [`architecture/realtime.md`](architecture/realtime.md) — movement, rooms, zones, reconnection.
- [`architecture/voice.md`](architecture/voice.md) — LiveKit, proximity, privacy.
- [`architecture/chat.md`](architecture/chat.md) — channels, persistence, moderation.
- [`architecture/ai.md`](architecture/ai.md) — constrained generation, NPCs, guardrails.
- [`architecture/security.md`](architecture/security.md) — authz, tokens, uploads, audit.
- [`architecture/deployment.md`](architecture/deployment.md) — local, single-node, scale-out.

### Verification

- [`verification/harness.md`](verification/harness.md) — the CLI, dev routes, artifacts.
- [`verification/gates.md`](verification/gates.md) — per-phase acceptance criteria.

### Research

- [`research/technology.md`](research/technology.md) — stack evaluation and links.
- [`research/assets.md`](research/assets.md) — asset sources, licenses, pipeline.
- [`research/models.md`](research/models.md) — the model matrix, verified results, and pending seed references.
- [`research/pstack.md`](research/pstack.md) — what we borrow from pstack.

### Operations

- [`operations/model-routing.md`](operations/model-routing.md) — which model to use for what.
- [`operations/usage.md`](operations/usage.md) — how to read Claude/Codex/OpenCode usage.

### Templates

- [`templates/adr.md`](templates/adr.md)
- [`templates/phase.md`](templates/phase.md)

## Status snapshot

- **Phase 0:** planning complete; build not started.
- **Awaiting:** user's model/seed references and explicit **go**.
- **Art direction:** approved.
