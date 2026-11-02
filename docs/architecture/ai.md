# AI design

## Principles

1. **Constrained, not creative.** AI chooses from known catalogs and emits schema-valid data. It never invents asset keys, coordinates, or code.
2. **Optional.** Every AI feature has a deterministic mock/fixture fallback so the product works without keys.
3. **Metered.** Per-org token/image budgets and hard caps; usage events recorded.
4. **Safe.** Moderation, prompt-injection isolation, no secrets in prompts, audit log, kill switch.
5. **Clearly labeled.** AI-generated content and NPCs are marked; never impersonate real users.

## Provider abstraction

- Vercel AI SDK with adapters for OpenAI, Anthropic, Google, and Ollama.
- Server-side only. Keys in env; optional per-org BYO key on higher plans.
- Model selection per task: cheap/fast for classification, stronger for room programs, image model for portraits/decor.
- Timeouts, retries with jitter, fallback model, and a global off switch.

## Features

### 1. Room / office generator

Pipeline:

1. **Program** — LLM returns a Zod-validated brief: room list, sizes, adjacencies, style, desired furniture categories.
2. **Solve** — deterministic packer places rooms on the floor plate (shelf/treemap), adds doors/walls, assigns furniture anchors from the catalog.
3. **Decorate** — LLM picks from constrained furniture/palette options per room; deterministic placement rules.
4. **Validate** — catalog keys exist, no overlaps, doors reachable, nav grid connected, spawn walkable.
5. **Preview** — render in the editor; accept/regenerate; save as draft; publish.

This avoids the classic failure of LLM-generated coordinates.

### 2. Avatar generator

- Prompt → constrained config: body type, hair, outfit, accessories, palette (all from the catalog).
- Optional AI portrait for the profile/roster; stored in S3, moderated.
- No AI-generated 3D avatars in v1 (rigging/consistency risk).

### 3. Decor / textures

- Prompt → poster, rug, whiteboard, or wall art image.
- Cropped to the target aspect, palette-checked, stored in S3, applied to a known mesh.
- Optional image-to-3D for admin-created props behind a QA gate (Meshy/Tripo).

### 4. NPC teammates

- 1–2 per office, with persona, schedule, wander targets, and chat participation.
- Can answer questions about the office/team; cannot access private channels or impersonate users.
- Clearly labeled; cost-capped; can be disabled per org.

### 5. Chat assistant

- `/ai summarize` — last N messages in a channel the user can read.
- `/ai translate` — message/channel translation.
- `/ai draft` — draft a reply in the user's tone.
- `/ai standup` — daily digest of team activity (opt-in).
- Permission-checked; never sends private data to a provider without org consent.

## Guardrails

- Input/output moderation (provider moderation or a local policy).
- Prompt-injection isolation: user content is delimited data, never instructions; system prompt forbids tool use on user content.
- No PII/secrets in prompts; redact tokens/emails where possible.
- Schema validation before any world mutation.
- Per-org and per-user rate limits; token/image budgets; cost alerts.
- Audit log: actor, feature, model, tokens, cost, result status.
- Kill switch per org and globally.

## Costs

- Track `usage_events` for LLM tokens, image generations, and 3D jobs.
- Plans include credits; overage blocked or billed.
- Cache deterministic prompts (room program templates, avatar presets).
- Use small models for classification and summaries; reserve strong models for room generation.

## Testing

- Fixture responses for every AI endpoint; E2E runs with AI disabled.
- Schema/property tests: 100 generated programs → 100 valid layouts.
- Prompt-injection tests: malicious chat text must not change system behavior.
- Budget tests: caps enforced.
- Manual quality review of 10 room generations and 10 avatars per art gate.
