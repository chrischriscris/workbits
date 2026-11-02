# Workbits — Isometric Virtual Office

> Project name: **Workbits** (working name; can change). Branding/assets will be original; the SoWork screenshots are directional references, not assets to copy.
>
> **Status:** Planning complete; art direction approved; product code paused until the user says **go**. See [`docs/progress.md`](docs/progress.md) and [`docs/decisions.md`](docs/decisions.md).

## 1. Product thesis

A browser-based isometric virtual office that feels like a **place**, not a call. Teammates see each other, walk over, talk by proximity, and get work done. Sold as a multi-tenant SaaS with customizable offices and AI-assisted world-building.

**Principles**

1. **Place first.** Presence and proximity are the product, not a feature bolted onto a chat app.
2. **Zero friction.** Join from a link in the browser. No download. Guest links for demos and clients.
3. **Beautiful by default.** One coherent art direction. Customization is constrained so users cannot make it ugly.
4. **AI that produces valid structures.** LLMs choose from a known catalog and emit schema-validated layouts, never free-form geometry.
5. **Multi-tenant and secure from day one.** Tenant isolation, roles, audit trail, rate limits.
6. **Verification-first.** Every phase ends with screenshots, video, metrics, and a written acceptance check. A passing build is not proof.

**Target experience**

- Login → lobby → office.
- Isometric diorama: cutaway walls, glass meeting rooms, soft shadows, pastel palette, crisp edges.
- Click/tap to walk or WASD; server-validated pathfinding around furniture.
- Proximity voice fades with distance; private rooms isolate audio; mute/deafen/PTT; screen share and camera in meeting rooms.
- Text chat: Global, Office, Room, Group, DM; threads, reactions, files, search, mentions, unread.
- Rooms: desks, meeting rooms, phone booths, lounge, kitchen, garden. Multiple offices and floors.
- Customize: furniture, floors, walls, themes, avatar, office name/logo. Assignable desks/workspaces.
- AI: generate a room/office from a prompt, generate decor and portraits, AI NPC teammates, chat assistant.
- Status: available, focus, away, in a meeting. "Go to my desk" and "knock" interactions.
- Desktop-first, responsive tablet/mobile browser.

---

## 2. Scope for the first sellable version

### In

- Multi-tenant orgs, invites, roles (owner/admin/editor/member), guest links.
- One polished default office template + editor + 2–3 templates.
- Multiple offices, floors, rooms, desks.
- Realtime presence/movement, 25–50 concurrent per office target.
- Proximity voice (LiveKit), text chat (all channel types).
- Avatar creator (modular parts + colors).
- AI room generator, AI decor/portrait generation, AI chat assistant, 1–2 NPCs.
- Landing page, pricing, onboarding, settings, admin basics.
- Stripe test-mode billing: plans, seats, checkout, customer portal, webhooks.
- Docker deploy, seed data, README, demo script, harness.

### Out (v1)

- Native desktop/mobile apps.
- Calendar/email/Slack/Teams integrations (design for them, don't build).
- Voice/video recording, transcription, live streaming.
- Enterprise SSO/SAML, SCIM, custom domains.
- User-uploaded 3D models (admin/AI-generated only).
- Full video-conference grid; only meeting-room camera/screen share.
- Marketplace, public worlds, localization, mobile app store builds.
- SOC 2 / HIPAA. No compliance claims.

---

## Non-functional requirements (locked)

### Performance budget

- 60 fps at 1080p on a 3–4 year old laptop with integrated graphics; 30 fps floor on mobile.
- p95 frame time < 20 ms; draw calls < 400; JS heap < 500 MB in a 50-avatar office.
- Initial load < 3 s on a 20 Mbps connection; office switch < 1 s after assets are cached.
- No layout shift; graceful degradation: drop DPR, shadows, SSAO, and postprocessing before dropping frame rate.
- Techniques: orthographic camera, instancing for repeated furniture, LOD, Draco/KTX2, texture atlases, frustum culling, lazy room loading, mutable external store read in `useFrame` (never per-frame React state), throttled network updates, interpolation buffers.
- The harness enforces these as gates, not aspirations.

### Hosting simplicity

Default single-node deployment:

```
Caddy (TLS)
 ├─ static web
 ├─ /api      → one Node process (Fastify)
 ├─ /rt       → same Node process (Colyseus mounted on the same server)
 └─ /livekit  → LiveKit (self-hosted) or LiveKit Cloud
Postgres
```

- **One Node process** runs API + realtime. No microservices.
- **Redis is optional.** Single instance uses in-memory presence. Add Redis only when running more than one realtime instance.
- **S3 is optional.** Local disk in dev/single-node; S3/R2 for CDN-backed media.
- **No Kubernetes, no message queue, no GraphQL, no premature event bus.**
- `docker compose up` is the deployment. Migrations run on boot with an advisory lock; health checks and backups included.
- Every optional service sits behind an interface so the simple path stays the default.

### Scale path (no rewrite)

1. **Single node** — default. 50 concurrent per floor, multiple offices, in-memory presence, local media.
2. **CDN + object storage** — static assets and media move to R2/S3 + CDN; same app code.
3. **Horizontal realtime** — enable the Redis presence/driver adapter, run N Colyseus instances behind Caddy with sticky sessions, shared Postgres. Same room code.
4. **Media scale** — LiveKit Cloud or a multi-node LiveKit cluster; SFU handles audio/video fan-out independently of the app servers.
5. **Multi-region** — LiveKit regions, Postgres read replicas, regional object storage. Data model already tenant-scoped.

Targets: 50/floor, 100/floor ceiling, thousands of orgs per deployment. Scale is a deployment change, not a product rewrite.

---

## 3. Stack and why

| Layer | Choice | Why | Considered |
|---|---|---|---|
| Client | React 19 + Vite + TypeScript | Fast iteration, huge ecosystem, easy UI-heavy product | Next.js (SSR not needed for app; Vite simpler), Svelte (smaller ecosystem) |
| 3D | React Three Fiber + drei + three.js | Web-native, declarative, orthographic camera, postprocessing, easy React UI integration | Unity WebGL (heavy, poor mobile, slow iteration), Godot web export (UI/product integration harder), PixiJS (2D only) |
| Realtime | Colyseus + Redis | Authoritative rooms, schema delta sync, matchmaking, reconnection, TypeScript | Custom WS (reinventing), PartyKit (less authoritative), Photon (vendor lock) |
| API | Fastify + Zod | Mature plugins, fast, familiar Node ops | Hono (great, but fewer server plugins), NestJS (heavy) |
| DB | Postgres + Drizzle | Relational multi-tenant data, SQL search, migrations, type safety | Prisma (heavier), Firebase (poor relational/tenant queries/self-host) |
| Auth | better-auth | Orgs, members, invites, roles, OAuth, passkeys, 2FA | Clerk (vendor cost/lock), Auth.js (orgs less built-in) |
| Voice/video | LiveKit | SFU, TURN included, official spatial-audio example, screen share, Krisp noise filter, React SDK, self-host or cloud | Daily (cost/lock), Agora (cost), raw WebRTC mesh (doesn't scale), Jitsi (heavier) |
| Chat | Colyseus events + Postgres + REST history | One realtime connection, persistence, search, authz | Stream (vendor), Socket.io (extra service) |
| AI | Vercel AI SDK + provider adapters | Swap OpenAI/Anthropic/Google/Ollama, streaming, tool calls | Direct SDKs (lock-in), LangChain (overkill) |
| Assets | Blender + glTF; CC0 packs re-materialed | Commercial-safe, consistent, customizable; real animations | AI 2D sprites (the failed path), paid Synty (upgrade option) |
| Infra | Docker Compose + Caddy; LiveKit Cloud for prod | One-command local, TLS/WS handled, minimal ops | Kubernetes (overkill), Vercel-only (stateful WS/Colyseus) |
| Tests | Vitest + Playwright + axe + custom bots | Unit → E2E → visual → load | Manual QA only (not acceptable) |

### Why 3D instead of 2D sprites

The failure mode in the references is art consistency: pixel characters on smooth furniture, sprite directions that don't match the room, no clean way to customize. 3D gives:

- One material/lighting system for every object.
- Real skeletal animation (walk, sit, type, wave) from any angle.
- Modular avatars (body/hair/outfit/colors) instead of a combinatorial sprite sheet.
- Furniture can be moved/rotated/rescaled without redrawing.
- AI can generate **textures, posters, and props** without breaking the grid.
- Orthographic camera gives the exact isometric read of the target concept.

The target look is a **stylized diorama**: orthographic camera, flat/toon materials, soft shadows, SSAO, subtle color grading, cutaway walls. Not photoreal, not pixel art.

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser                                                             │
│  React 19 + Vite                                                    │
│  ├─ R3F canvas (office, avatars, furniture, camera)                 │
│  ├─ UI (chat, roster, editor, settings)                             │
│  ├─ LiveKit client (audio/video/screen)                             │
│  └─ Colyseus client (presence, movement, chat events)               │
└───────────────┬──────────────────────────────┬──────────────────────┘
                │ HTTPS / WSS                  │ WebRTC (SFU)
┌───────────────▼──────────────┐   ┌───────────▼──────────────────────┐
│ Caddy (TLS, reverse proxy)   │   │ LiveKit (Cloud in prod,           │
│  /        → web static       │   │  self-hosted in dev)              │
│  /api     → Fastify          │   │  rooms, TURN, spatial audio       │
│  /rt      → Colyseus         │   └───────────┬──────────────────────┘
└───────┬──────────────┬───────┘               │ webhooks
        │              │                       │
┌───────▼──────┐ ┌─────▼──────────┐            │
│ Fastify API  │ │ Colyseus        │◄───────────┘
│ auth, REST,  │ │ OfficeRoom      │
│ chat history │ │ OrgRoom         │
│ AI proxy,    │ │ movement, zones │
│ LiveKit token│ │ chat fan-out    │
│ uploads      │ └─────┬───────────┘
└───┬──────┬───┘       │
    │      │           │
┌───▼──┐ ┌─▼─────┐ ┌───▼─────┐   ┌──────────────┐
│ PG   │ │ Redis │ │ Postgres│   │ S3/R2/MinIO  │
│ auth │ │presence│ │ layouts │   │ avatars/media│
│ data │ │ pubsub│ │ chat    │   └──────────────┘
└──────┘ └───────┘ └─────────┘
                       │
                ┌──────▼───────┐
                │ AI providers │  LLM / image / image-to-3D
                └──────────────┘
```

**Trust boundaries**

- Server is authoritative for positions, collisions, zone membership, chat membership, and permissions.
- Client predicts movement and reconciles; clients never decide who receives a message or audio.
- LiveKit tokens are short-lived, scoped to one room, issued only after authz.
- All DB queries are tenant-scoped; tests assert cross-tenant denial.

**Deployment topology**

- Local: Vite + Fastify + Colyseus on the host; Postgres/Redis/LiveKit/MinIO in Docker.
- Prod: static web behind Caddy/CDN; one or more Node services; managed Postgres/Redis; LiveKit Cloud; S3-compatible storage. Sticky sessions for Colyseus or Redis presence + shared matchmaking.

---

## 5. Data model (core)

```
users            id, email, name, image, password_hash/oauth, created_at
organizations    id, name, slug, logo, plan, created_at
members          org_id, user_id, role, status
invitations      org_id, email, role, token, expires_at, invited_by
offices          id, org_id, name, slug, theme, is_default, created_at
floors           id, office_id, name, level, layout_version
rooms            id, floor_id, name, type (open|meeting|phone|lounge|kitchen|garden),
                 bounds (jsonb), is_private
zones            id, floor_id, name, polygon (jsonb), audio_mode
workspaces       id, room_id, label, seat_anchor, assigned_user_id
layouts          id, floor_id, version, data (jsonb), published_at, created_by
furniture_catalog id, key, name, category, glb_url, thumbnail, footprint,
                 height, tags, license, source
avatars          id, user_id, config (jsonb), portrait_url
channels         id, org_id, type (global|office|room|group|dm), scope_id,
                 name, is_private, created_by
channel_members  channel_id, user_id, role
messages         id, channel_id, author_id, body, attachments (jsonb),
                 reply_to_id, created_at, edited_at, deleted_at
reactions        message_id, user_id, emoji
reads            channel_id, user_id, last_read_message_id
presence         user_id, office_id, floor_id, x, y, zone_id, status, last_seen
subscriptions    org_id, stripe_customer_id, stripe_subscription_id, plan, seats
usage_events     org_id, kind (voice_minutes|ai_tokens|image), qty, meta, created_at
audit_log        org_id, actor_id, action, target, meta, created_at
```

Layout JSON is the source of truth for the client and the server nav grid. Versioned and publishable; drafts are private to editors.

---

## 6. Realtime design

- **OfficeRoom** per floor. State: players, NPCs, seat occupancy, reactions. Static layout is fetched over REST and cached; only dynamic state is synced.
- **Tick:** 15 Hz server simulation; clients send input intents (move target, seat, emote) at up to 10 Hz. Server validates speed, collision, and zone; broadcasts deltas.
- **Movement:** A* on a 0.5 m nav grid generated from the layout (furniture footprints + walls). Click-to-move and WASD. Client-side prediction with smooth interpolation (~100 ms buffer) and reconciliation on server correction.
- **Zones/rooms:** rectangles/polygons with names and audio mode. Entering a meeting room changes voice room and status. Zone changes are server events, not client claims.
- **Seats:** interaction anchors; sitting locks position, plays sit/type animation, exposes "at desk" status.
- **Reconnect:** session token + last position; server restores within 30 s; client shows reconnecting state.
- **Chat:** **OrgRoom** per organization for channel events, typing, reads, presence outside the office. Server checks channel membership before fan-out. History/search via REST.
- **Scale:** 50 players/floor target, 100 architecture ceiling. Broadcast at 10–15 Hz with delta compression; interest management by floor; Redis for multi-instance presence. Load-tested with bots.
- **Backpressure:** per-socket rate limits, max message size, malformed message drops, heartbeat/timeout.

---

## 7. Voice design

- **LiveKit** SFU. Dev: `livekit-server --dev` in Docker. Prod: LiveKit Cloud (or self-host later).
- **Token service:** Fastify issues a JWT with `identity=user:{id}`, `room=office:{officeId}:floor:{n}` or `office:{officeId}:room:{roomId}`, `canPublish=true`, TTL 10 min, renewed by the client.
- **Audio topology:** open floor = one LiveKit room. Entering a private meeting/phone room switches the user to that room's LiveKit room (unpublish from floor, publish to meeting). This gives real privacy, not client-side muting. Exiting switches back.
- **Proximity:** for each remote participant on the same floor, compute avatar distance; gain = smoothstep between `near` (1.5 m, full) and `far` (8 m, silent). Stereo pan from screen-space x. Route remote audio through Web Audio `GainNode` + `StereoPannerNode`; attach via LiveKit `RemoteAudioTrack`.
- **Controls:** open mic with VAD, push-to-talk (Space), mute, deafen, input/output device picker, mic level meter, speaking indicator, connection quality.
- **Meeting rooms:** camera + screen share enabled; floor audio off. "Knock" interaction (stretch): request to join a private room.
- **Privacy:** no recording by default. Voice never persisted. Tokens short-lived. Room names tenant-scoped. Server logs metadata only.
- **Failure modes:** permission denied, no device, device unplugged, network loss, autoplay blocked. Explicit UI for each; reconnect with backoff.

---

## 8. Chat design

- **Channels**
  - `global` — org-wide announcements; admins post, everyone reads.
  - `office` — everyone currently in the office (or org-wide office channel).
  - `room` — auto-created per physical room; joins/leaves reflect presence.
  - `group` — user-created private/public group.
  - `dm` — 1:1; group DMs are groups.
- **Features:** history pagination, full-text search, replies/threads, reactions, mentions, attachments (images/PDF, size/type limits), typing indicators, read receipts, unread badges, edit/delete, moderation (admin delete/ban), markdown with sanitization, link previews (stretch), emoji picker.
- **Realtime:** Colyseus OrgRoom events; REST for history/search/upload signatures. Optimistic send with server ack and dedupe.
- **UI:** left sidebar (Office / Rooms / Groups / DMs), overlay panel over the office, bottom composer, unread dots, mention highlights, notification toasts, browser notifications (opt-in).
- **AI commands:** `/ai summarize`, `/ai translate`, `/ai draft`, `/ai standup`; scoped to channel and permissions; responses labeled as AI.
- **Abuse:** rate limits, message length caps, report/block, admin audit.

---

## 9. AI design

**Provider abstraction.** Vercel AI SDK with adapters for OpenAI, Anthropic, Google, and Ollama. Config via env. If no key, deterministic fixtures keep the product fully demoable. Per-org model/keys (BYO key on higher plans), usage metering, hard caps.

**Features**

1. **Office/room generator**
   - Prompt → structured program (rooms, sizes, adjacencies, style) via Zod schema.
   - Deterministic layout solver packs rooms into the floor plate, places doors, desks, and furniture anchors from the catalog.
   - LLM only chooses from a constrained catalog and palette; it never invents asset keys or coordinates.
   - Validate: all rooms reachable, doors valid, no overlaps, nav grid connected. Preview in editor, then accept/regenerate.
2. **Avatar "generate me"**
   - Prompt → constrained modular config (body, hair, outfit, accessories, palette) + optional AI portrait for profile/roster.
   - No AI-generated 3D avatars in v1 (consistency + rigging risk).
3. **Decor generation**
   - Prompt → poster/rug/whiteboard texture applied to a known mesh. Images stored in S3, moderated.
   - Optional image-to-3D (Meshy/Tripo) for admin-created props behind a QA gate; not user-facing in v1.
4. **AI teammates (NPCs)**
   - 1–2 per office with persona, schedule, wander targets, and chat participation. Answer questions about the office/team, never impersonate real users. Clearly labeled. Cost-capped.
5. **Chat assistant**
   - Summarize missed messages, translate, draft replies, daily standup digest. Channel-scoped, permission-checked.

**Guardrails:** moderation on inputs/outputs, prompt-injection isolation (user content is data, not instructions), no secrets in prompts, per-org token budgets, audit log, kill switch. All AI output validated before it touches the world.

---

## 10. Art pipeline

**Style bible (v1)**

- **Camera:** orthographic, 45° azimuth, 30° elevation, fixed orientation; pan + zoom only. No free orbit in v1 (art consistency + performance).
- **Palette:**
  - Sand `#F4E9DC`, Warm White `#FBF7F1`, Oak `#D9B98C`, Terracotta `#D98E73`
  - Sage `#A8BFA3`, Olive `#6F8F6A`, Slate `#5C6B7A`, Ink `#2E3440`
  - Glass `#CFE8EF`, Accent `#6C8CFF`
  - Themes: Sand (default), Sage, Slate, Dusk.
- **Materials:** flat/toon with subtle roughness variance; no photoreal textures; no outlines; soft contact shadows.
- **Lighting:** warm directional key + cool ambient fill + SSAO; subtle bloom/vignette; no harsh specular.
- **Proportions:** chibi-ish 1.55–1.7 m characters with a 1/3-height head; rounded 0.1–0.2 m bevels on furniture; 2.8 m walls, cutaway or fade.
- **Characters:** modular body/hair/outfit, 8-color palettes, simple faces (eyes + brows, minimal mouth), animations: idle, walk, sit, type, wave, emote.
- **UI:** light glassmorphism, 12–16 px radii, Inter/Geist, soft shadows, bottom control bar; no fantasy chrome, no pixel fonts.
- **Never:** pixel art, photoreal textures, mixed asset packs without re-materialing, AI-generated core geometry, drop shadows that don't match the light.

**Reference frames (concept only, generated with Sol):**

- `art/style-scene.png` — room, camera, palette, lighting.
- `art/style-characters.png` — the character quality/consistency bar.
- `art/style-product.png` — sidebar, roster, chat composer, control bar.

These are slightly more rendered than the in-engine target. The build should keep their charm, layout, and palette while pushing flatter color blocking and less texture noise.

**Reference anchors:** the user's modern isometric concept (north star), Monument Valley (isometric cleanliness), Toca Life World (approachable chibi characters), Two Point Hospital (cutaway readability), Gather/SoWork (product UI patterns, not assets).

**Assets**

- Base: Kenney Furniture Kit, Quaternius furniture/characters/animation library, KayKit props — all CC0, commercial-safe.
- Re-material into a single palette + material set; consistent scale/pivot conventions.
- Characters: modular base + outfits/hair; humanoid rig; animation set (idle, walk, sit, type, wave, emote). Retarget via glTF.
- Demo cast: optional `seeds/team/manifest.json` data pack (not hardcoded) + `docs/architecture/avatars.md`. Supports human/frog/crab species and a no-key deterministic avatar generator.
- Procedural accents: rugs, plants, screens, posters, lights, floor patterns.
- Custom/AI decor only through the catalog QA gate.
- Export: glTF/GLB, Draco + KTX2, thumbnail renders, footprint/height metadata, license manifest.
- Upgrade path: paid Synty/KayKit packs or commissioned art can replace the base without code changes.

**Asset QA gates**

- `/dev/gallery` renders every asset and avatar combination on a neutral stage.
- Screenshot diff + poly/texture budget + missing-texture check.
- License manifest required for every catalog entry.
- No asset ships without a thumbnail and footprint.

---

## 11. Verification harness ("control-app")

A first-class CLI + dev routes, inspired by pstack's evidence-first loop.

```
pnpm harness up                 # docker infra + migrate + seed + dev servers
pnpm harness seed --reset       # demo org/users/office/chat
pnpm harness shot <route>       # deterministic screenshot (desktop/mobile)
pnpm harness gallery            # every asset/avatar/theme, screenshot grid
pnpm harness flow <name>        # scripted E2E with video + trace
pnpm harness bots --n 30        # headless Colyseus clients: move/chat/load
pnpm harness voice              # 2-context LiveKit test: join, mute, zone switch
pnpm harness perf               # FPS, frame p95, draw calls, triangles, memory
pnpm harness audit              # axe a11y + console errors + failed requests
pnpm harness visual-diff        # baseline comparison, diff % + images
pnpm harness report             # artifacts/<run>/report.md with evidence
```

**Dev routes**

- `/dev/gallery` — asset/avatar/theme contact sheet.
- `/dev/scene?layout=...` — render one layout without auth/realtime.
- `/dev/voice-lab` — fake participants at fixed coordinates; verify gain/pan.
- `/dev/perf` — stress scene with N avatars/furniture.

**Determinism**

- `?e2e=1`: freeze clock/animations, fixed RNG seed, fixture AI, hide cursor, disable particles.
- `window.__ATRIUM_READY__` signals canvas + assets loaded.
- Test auth bypass only in `NODE_ENV=test`, gated by env and never deployed.

**Gates per phase**

- Typecheck + lint + unit tests green.
- E2E scenario for the phase green.
- Screenshots/video attached to `artifacts/<run>/report.md`.
- Perf budget met (60 fps target, p95 frame < 20 ms at 1440×900, draw calls < 400).
- Adversarial review: cross-tenant/authz tests, empty/error/loading states, mobile viewport.
- Only then mark the phase done.

---

## 12. Phases and acceptance criteria

| Phase | Deliverable | Acceptance gate |
|---|---|---|
| **0. Foundation** | Monorepo, Docker infra, Postgres/Drizzle, better-auth, org/office CRUD, seed, harness skeleton, design tokens | `pnpm setup && pnpm dev` → login as seeded user → lobby; harness screenshot + auth flow pass |
| **1. The Room** | Polished single-floor office, 4 rooms, 12+ furniture types, 3 avatars, idle/walk/sit animations, camera pan/zoom, name tags, status | Screenshot matches style bible; gallery clean; 60 fps; no missing assets |
| **2. Presence** | Colyseus OfficeRoom, join/leave, click/WASD movement, pathfinding, collisions, zones, seats, reconnect | Two browsers see each other smoothly; 30 bots stable; server tick < 8 ms; no desync > 50 ms |
| **3. Voice** | LiveKit tokens, proximity gain/pan, zone switching, mute/deafen/PTT, device picker, speaking indicator, reconnect | Two-tab audio test; distance changes volume; meeting room isolates; voice-lab assertions pass |
| **4. Chat** | Global/office/room/group/DM, history, unread, replies, reactions, mentions, typing, attachments, search, moderation | Two-user E2E across all channel types; persists on reload; authz tests deny cross-tenant/DM access |
| **5. Customization** | Editor (place/rotate/delete/undo), floors/walls/themes, avatar creator, multiple offices/floors, templates, permissions, publish | Build a room in < 5 min; publish; second user sees it; invalid layouts blocked; undo/redo works |
| **6. AI** | Room generator, avatar generator, decor, chat assistant, 1–2 NPCs, provider abstraction + mock fallback, budgets | 5 prompts → valid reachable layouts; zero hallucinated assets; AI chat works; no-key mode works |
| **7. Product** | Landing, pricing, onboarding, invites, guest links, roles, settings, Stripe test billing, admin, legal pages | Signup → create office → invite → join → pay (test) flow; tenant isolation; responsive |
| **8. Ship** | Perf/a11y/security pass, sounds, empty/error states, mobile, CI, prod Docker, backups, docs, demo video | Lighthouse/a11y targets; E2E green; 50-bot load; fresh deploy from README; demo recorded |

**Order rule:** vertical slice first (Phase 1–2), then voice/chat, then customization, then AI, then product shell. No breadth before the room is beautiful and playable.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Art fidelity** — 3D can look "mobile game" rather than the clean concept | Lock a style bible; build the room first; art QA gallery; toon/flat materials + SSAO + soft shadows; iterate on screenshots; do not add features until the room looks right |
| **Scope** — sellable SaaS + game in one night | Tiered scope; core loop first; billing test mode; no native apps; explicit "out" list; ship a polished beta, not a fantasy |
| **Voice reliability** | LiveKit (battle-tested SFU); device permission UX; reconnect; VAD + PTT; test with real mics; zone isolation server-driven |
| **Performance with many avatars** | 50/floor target; delta sync; interpolation; LOD/instancing; DPR cap; stress bots; frame budget gate |
| **AI inconsistency/cost** | Constrained catalogs + Zod validation + deterministic solver; mock fallback; per-org caps; no AI 3D avatars |
| **Security/multi-tenancy** | Tenant-scoped queries; authz tests; short-lived tokens; rate limits; CSP; upload validation; audit log |
| **Deployment** | Docker Compose + Caddy locally; LiveKit Cloud + managed PG/Redis for prod; one-command deploy; health checks |
| **Trademark/copying** | Original name, UI, and assets; references used for direction only; license manifest for every asset |

---

## 14. What "done tonight" means

A running URL (local, or public if deploy credentials are provided) where the user can:

1. Sign up / log in, create an org, pick or generate an office.
2. Walk around a genuinely good-looking isometric office with teammates.
3. Talk by proximity, switch to a private room, mute/deafen/PTT, share screen.
4. Chat in Global, Office, Room, Group, and DM; see history and unread.
5. Customize the office and avatar; invite teammates; assign desks.
6. Generate a room from a prompt and accept it into the office.
7. See pricing, start a Stripe test checkout, and access an admin view.
8. Read a README, run the harness, and deploy with Docker.

Plus: repo, docs, tests, screenshots, a demo video, and a known-gaps list.

---

## 15. Decisions and open questions

### Already decided

1. **Art direction** — warm stylized 3D diorama, 80% flat color / 20% render polish. Approved 2026-11-02.
2. **Name** — **Workbits** (working name; visual identity still open).
3. **Package manager** — Bun 1.4.4 for installs/scripts; Node 24 for the server only if a dependency is incompatible.
4. **Hosting** — single-node default (one app process + Postgres + LiveKit + Caddy); Redis/S3 optional; horizontal path without a rewrite.
5. **Voice** — LiveKit, self-hosted in dev, Cloud for public production.

### Still open

1. **Models/seed references** — the user has references to send; record them in [`docs/research/models.md`](docs/research/models.md).
2. **Runtime AI key** — OpenAI / Anthropic / Google / none. Put keys in `.env.local`, don't paste them in chat. Without keys: mock/fixture fallbacks.
3. **Deploy target** — local/LAN (default) or a public URL; if public, domain/VPS access.
4. **Must-haves** — screen share, camera in meeting rooms, mobile browser, Stripe billing, guest links, AI NPCs. Defaults: all yes except native apps.
5. **Scale** — target concurrent users per office (default 25–50, ceiling 100).
6. **Budget** — CC0 + procedural (default, $0) or a small budget for paid packs/API credits (Synty/KayKit, image gen, 3D gen).
7. **Brand identity** — logo, wordmark, domain, final color accent.
8. **Pricing/plans** — needed for the landing page and Stripe test mode.
