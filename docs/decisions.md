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

## ADR-011 — Message-based presence for the MVP realtime layer

- **Status:** Accepted for the MVP; revisit before scale.
- **Date:** 2026-11-02
- **Context:** The Colyseus 0.16 schema/reflection path produced an empty `players` map on the client across multiple schema and version combinations. The room/message protocol worked reliably, and presence/chat are the critical path.
- **Decision:** For the first sellable demo, the `OfficeRoom` keeps an authoritative in-memory player map and broadcasts `welcome`, `player_added`, `player_moved`, `player_left`, and `chat` messages. Movement is validated and clamped server-side. The state schema is not used.
- **Consequences:**
  - Realtime presence and chat work now; the client has no schema decoder dependency.
  - Bandwidth is higher than schema delta sync; acceptable at 25–50 players.
  - Late joiners get a full `welcome` snapshot; no schema handshake.
  - Before horizontal scale/100-player offices, migrate to Colyseus Schema or a binary protocol and load-test.
  - The server is still authoritative for positions, chat identity, and bounds.

## ADR-010 — AI is constrained and optional

- **Status:** Accepted
- **Date:** 2026-11-02
- **Context:** The user wants AI for sprites, users, rooms, and chat, but consistency, cost, and safety matter.
- **Decision:** Use Vercel AI SDK behind a provider interface. AI outputs are schema-validated and constrained to known catalogs. Room generation uses an LLM program + deterministic layout solver. No AI-generated core 3D avatars/geometry in v1. Every AI feature has a deterministic mock fallback.
- **Consequences:**
  - Demo works without keys.
  - No hallucinated asset keys or coordinates.
  - Slightly less "magical" than free-form generation; much more reliable and sellable.

---

## ADR-012 — Model-based prop kit; procedural stays for architecture and layout

- **Status:** Accepted; lounge slice in progress.
- **Date:** 2026-11-02
- **Context:** The procedural primitive kit (`props.tsx`, `avatars.tsx`) reached its fidelity ceiling: furniture reads as assembled rounded boxes next to `art/style-scene.png`. `PLAN.md` and `docs/research/assets.md` already specified a glTF pipeline, but the repo shipped with zero GLB assets and `packages/assets` was empty. The user asked to iterate toward the concept using real models instead of geometric figures.
- **Decision:** Furniture, props, and avatars move to authored GLB assets, normalized to 1 unit = 1 m, Y up, +Z forward, origin at the floor center of the footprint. Materials are exported with Workbits slot names and replaced at runtime from the palette. Architecture (walls, plinth, glass, floor zones), desk/workspace layouts, room anchors, collision, and generators stay procedural. One kit at a time, re-materialed; no mixed packs. AI image-to-3D remains limited to decor behind a QA gate and never core architecture or avatars (ADR-010 still applies there).
- **Consequences:**
  - A real asset pipeline: Blender conversion, `packages/assets/manifest.json` with license/source fields, GLBs under `apps/web/public/assets/models/`.
  - Higher visual ceiling for upholstery, props, and eventually characters.
  - Draw calls rise from one merged mesh per procedural prop to one call per material slot; instance repeated props and keep the <400 budget.
  - Layout/customization features keep working because the shell and desk system remain parametric.
  - Source packs must be CC0 or commercially licensed; every shipped model needs a manifest entry.

---

## ADR-013 — Reference composition pass: lower camera, open plan, human scale

- **Status:** Accepted.
- **Date:** 2026-11-02
- **Context:** The three-way reference / before / after comparison showed the GLB seat swap barely moved the likeness. The gap was composition, character scale, and visual hierarchy, not the loader. A Sol critique (Codex CLI) and an Opus plan (Claude Code CLI) both said: lock the camera first, demote competing vignettes, make the engineering bench the foreground anchor.
- **Decision:** Lower the orthographic camera from `[20, 22, 20]` to `[20, 15, 20]`, refit the art frame to 25.4 units with a raised target, remove the second seating group and bistro stools, move the default bench from x 1.4 to 2.4 and widen desks to 2.8 m, add a coffee island in the opened band, extend the kitchen tile, group plants instead of scattering pots, tighten the lounge cluster, and scale humans up (1.5) while reducing the frog/crab mascots (1.25/1.3).
- **Consequences:**
  - The engineering anchor moves to `(2.4, 5.9)` in `packages/shared/src/zones.ts`, `apps/web/src/data/team.ts`, and the server spawns for Mira, Felix, and Fern.
  - The default bench constants live in `state/officeLayout.ts`; custom layouts center their rug/pendant on `POD` so they do not drift.
  - `zones.test.ts` covers the widened bench and coffee island.
  - The room now reads as one open plan; the next highest-value slice is a character benchmark (one human), not more lounge props.

## ADR-014 — Compact four-zone floor plan

- **Status:** Accepted.
- **Date:** 2026-11-02
- **Context:** Against `art/style-scene.png`, a person spanned ~8% of the room's screen width versus ~14% in the reference. The reference room holds four zones (lounge, glass meeting room, kitchen, one desk cluster); ours held seven in the same frame, so every person and prop read at half size. Scaling people alone couldn't close that without dwarfing the furniture.
- **Decision:** Shrink the room from 20 × 14 to 15 × 11 and lay it out like the reference: glass meeting room back-left, one kitchen run on the rear wall (communal table and coffee island removed), lounge front-left, the 2×2 bench in the centre, a bookcase and tree on the right edge, and the nap nook shrunk to the front-right corner so Theo keeps his bed. Remove the garden zone. Frame the whole room at 19.5 units in both art and app views.
- **Consequences:**
  - `ZoneId` drops `"garden"`; `zoneAt` boundaries and every anchor move (`packages/shared/src/zones.ts`). `roomAnchors` now derives from `zones`, so it can't drift again.
  - Default bench centre moves to `(1.3, 1.6)`; client and server spawns move; the server clamps positions to ±8.2 / ±6.2 and custom-layout desks to z ≤ 4.9.
  - The seed pack, room list and assistant drop the garden.
  - `scripts/reconnect-check.mjs` asserted a restored position at `x > 3.3`, stale since ADR-013 moved the meeting room; it now checks `zoneAt(...) === "meeting"`.

## ADR-015 — Buildable offices from a document (supersedes ADR-014's fixed plan)

- **Status:** Accepted.
- **Date:** 2026-11-02
- **Context:** Teams should build their own offices (many per team, any room mix, generated from parameters, then edited) instead of living in one hand-placed 15 × 11 room. Six adversarial reviews of the first proposal found that privacy, isolation and scale assumptions don't hold in today's code (client-trusted movement, global chat/presence, fixed camera fit). Design: `docs/architecture/spaces.md`.
- **Decision:**
  - An office is a versioned `SpaceDoc` (rooms, shared edges, shell openings, items, spawns) compiled by one shared function into walls, a nav grid, room membership and spawns, used by both server and client.
  - "Private" means voice and chat privacy only: anyone may walk in and then belongs to that room's voice and chat.
  - The camera keeps today's human-scale zoom and follows the player; whole-plan view only in the editor; floors up to ~300 m².
  - Generation starts from curated templates plus room kits with bounded parameters; a free partitioning generator comes later on the same kits.
  - Furniture stays the procedural `props.tsx` kit for now; GLB per catalog key is allowed later (ADR-012 still applies to new models).
  - Order: document + compiler + server-validated movement for today's office; templates/kits/camera follow/perf; auth and tenant scoping; many offices; editor; free generator.
- **Consequences:** `zoneAt` becomes a lookup in the compiled document; movement gets server speed and walkability checks and A* click-to-move; ADR-014's room becomes the `default-loft` document; multiple offices wait for auth.

