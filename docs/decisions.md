# Decisions (ADR log)

Append-only. If a decision changes, add a new ADR that supersedes the old one; do not delete history.

---

## ADR-001 — 3D isometric diorama instead of 2D sprites

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** The user's two failed attempts used 2D pixel-art characters composited into isometric scenes. The art clashed, sprites read as "stuck on", and customization would require combinatorial sprite sheets. The target reference is a clean, flat-vector-looking isometric office.
- **Decision:** Build the world in 3D (three.js/R3F) with an orthographic camera and a stylized toon/flat material system. Use modular 3D characters and furniture. Render 2D only for UI, icons, and marketing.
- **Consequences:**
  - Consistent lighting/materials across all objects.
  - Real skeletal animation (walk, sit, type, wave) from any angle.
  - Modular avatar customization without redrawing.
  - Furniture can be moved/rotated/rescaled.
  - Higher engine complexity than a 2D tilemap; mitigated by R3F and a constrained asset kit.
  - AI generates textures/decor and image-to-3D props, not core geometry.

---

## ADR-002 — React Three Fiber over Unity, Godot, or PixiJS

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** The product is a web app with heavy UI (auth, chat, editor, billing) plus a 3D scene. Iteration speed matters.
- **Decision:** React 19 + Vite + React Three Fiber + drei. Orthographic camera, postprocessing, instancing as needed.
- **Consequences:**
  - Web-native, easy React UI integration, fast HMR.
  - Huge ecosystem; no engine export/build step.
  - Performance is sufficient for 50 avatars with disciplined React patterns.
  - Not a full game engine; physics/animation tooling is thinner. Acceptable for an office, not an action game.

---

## ADR-003 — Colyseus for realtime state

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** Need authoritative rooms, delta sync, matchmaking, reconnection, and TypeScript.
- **Decision:** Colyseus, one `OfficeRoom` per floor and one `OrgRoom` per organization. Optional Redis driver for horizontal scale.
- **Consequences:**
  - Schema-based delta sync and built-in reconnection.
  - Stateful server; deployment needs sticky sessions when scaled.
  - Single-node default uses in-memory presence; no Redis required.

---

## ADR-004 — LiveKit for voice/video

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** Proximity voice, private rooms, screen share, noise suppression, and scale are core. Raw WebRTC mesh does not scale; building an SFU is out of scope.
- **Decision:** LiveKit. Self-hosted in dev (`livekit-server --dev`), LiveKit Cloud for public production (or self-host later). Use server-issued room-scoped JWTs. One LiveKit room per open floor and per private meeting room.
- **Consequences:**
  - Official spatial-audio example and React SDK.
  - Real privacy: meeting rooms are separate rooms, not client-side mutes.
  - External dependency for media; tokens and webhooks must be handled.
  - Zone changes reconnect audio briefly; acceptable for an office.

---

## ADR-005 — Postgres + Drizzle + better-auth

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** Multi-tenant relational data (orgs, offices, rooms, channels, messages, subscriptions) with SQL search and migrations.
- **Decision:** Postgres, Drizzle ORM/migrations, better-auth with its organization plugin.
- **Consequences:**
  - Strong tenant scoping and relational integrity.
  - Self-hostable; no vendor lock-in.
  - Auth/org/invite flows are mostly built-in.
  - Requires migrations and backup discipline.

---

## ADR-006 — Single-node default, Redis optional

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** The user wants easy hosting without overengineering, but also scale.
- **Decision:** Default deployment is one Node process (Fastify + Colyseus), Postgres, LiveKit, Caddy. Redis, S3, and extra workers are optional and behind interfaces. Horizontal scale uses Redis presence/driver + N realtime instances + sticky sessions.
- **Consequences:**
  - `docker compose up` is the default deploy.
  - No Kubernetes, message queue, or microservices in v1.
  - Scale is a deployment change, not a rewrite.
  - Single-node presence is in-memory; a restart drops presence (reconnect restores).

---

## ADR-007 — Bun for installs/scripts; Node runtime where required

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** Bun 1.4.4 is available. The user prefers Bun if possible.
- **Decision:** Use Bun for dependency installation and scripts. Run the API/realtime server on Bun first; if a dependency is incompatible, run that process on Node 24 and document it. One lockfile only.
- **Consequences:**
  - Fast installs and script startup.
  - Compatibility risk with some Node-native packages; spike early in Phase 0.
  - CI must pin Bun and, if needed, Node.

---

## ADR-008 — Project name: Workbits

- **Status:** Accepted (working name)
- **Date:** 2026-11-02
- **Context:** The user named the project.
- **Decision:** Use **Workbits** in code, docs, and UI until the user changes it. Do not use SoWork or reference branding.
- **Consequences:** Package scope `@workbits/*`; domain/logo still open.

---

## ADR-009 — Art direction: warm stylized 3D diorama

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** Three Sol-generated concept frames were reviewed and the user said "I love the direction."
- **Decision:** Target a warm stylized 3D diorama: orthographic 45°, cutaway walls, 80% flat color / 20% render polish, pastel palette, chibi modular characters. The character sheet (`art/style-characters.png`) is the quality bar.
- **Consequences:**
  - The in-engine look will be flatter and less textured than the concept renders.
  - The first build priority is a real style frame, not more concept art.
  - Any asset that cannot be re-materialed into the palette is rejected.

---

## ADR-010 — AI is constrained and optional

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** The user wants AI for sprites, users, rooms, and chat, but consistency, cost, and safety matter.
- **Decision:** Use Vercel AI SDK behind a provider interface. AI outputs are schema-validated and constrained to known catalogs. Room generation uses an LLM program + deterministic layout solver. No AI-generated core 3D avatars/geometry in v1. Every AI feature has a deterministic mock fallback.
- **Consequences:**
  - Demo works without keys.
  - No hallucinated asset keys or coordinates.
  - Slightly less "magical" than free-form generation; much more reliable and sellable.
