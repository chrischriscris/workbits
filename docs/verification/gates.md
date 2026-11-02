# Phase gates

A phase is done only when every box is checked and evidence is linked in `artifacts/`. If something is unverified, say so explicitly.

## Global gates (every phase)

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] No console errors or failed requests in the E2E flow
- [ ] Desktop (1440×900) and mobile (390×844) screenshots captured
- [ ] axe: no critical/serious accessibility issues
- [ ] Authz: cross-tenant and role denial tests pass
- [ ] Empty, loading, and error states reviewed
- [ ] `docs/progress.md` updated
- [ ] Known gaps listed in the report

## Performance budget

| Metric | Target | Hard fail |
|---|---|---|
| FPS (1080p, integrated GPU) | 60 | < 45 |
| Frame p95 | < 20 ms | > 28 ms |
| Draw calls | < 400 | > 600 |
| JS heap (50 avatars) | < 500 MB | > 800 MB |
| Initial load (20 Mbps) | < 3 s | > 5 s |
| Office switch (cached) | < 1 s | > 2 s |
| Mobile FPS | 30 | < 24 |

## Phase 0 — Foundation

- [ ] `bun install && bun run dev` works from a clean clone
- [ ] Docker infra starts on isolated ports (3100/3101/5433/6380/7880)
- [ ] Migrations run; seed is idempotent
- [ ] Login with seeded user; org + office created
- [ ] `/api/health` green for DB, LiveKit, storage
- [ ] Harness `shot` + `flow auth` pass
- [ ] Bun runtime spike documented; Node fallback if needed

## Phase 1 — The Room

- [ ] One office, ≥4 rooms, ≥12 furniture types, 3 avatars
- [ ] Idle/walk/sit animations; camera pan/zoom
- [ ] Name tags, status dots, voice rings
- [ ] Style frame side-by-side with `art/style-scene.png` approved
- [ ] `/dev/gallery` clean (no missing textures, consistent palette)
- [ ] 60 fps at 1080p; draw calls < 400
- [ ] Desktop + mobile screenshots

## Phase 2 — Presence

- [ ] Colyseus join/leave, two browsers see each other
- [ ] Click-to-move + WASD; pathfinding; collisions; zones; seats
- [ ] Reconnect within 30 s restores position
- [ ] 30 bots stable for 60 s; server tick < 8 ms; no desync > 50 ms
- [ ] Authz: cannot join another org's office
- [ ] Video/screenshot of two users moving

## Phase 3 — Voice

- [ ] Token endpoint scoped + short-lived
- [ ] Proximity gain/pan changes with distance
- [ ] Private room isolates audio (separate LiveKit room)
- [ ] Mute/deafen/PTT/device picker/speaking indicator
- [ ] Reconnect and permission-denied states
- [ ] `harness voice` passes; manual real-mic test
- [ ] No recording; privacy note verified

## Phase 4 — Chat

- [ ] Global/Office/Room/Group/DM all work with two users
- [ ] History persists on reload; unread/read state correct
- [ ] Replies, reactions, mentions, typing, attachments, search
- [ ] Authz: cannot read another org/DM; rate limits
- [ ] Moderation: admin delete/ban works
- [ ] E2E across all channel types; screenshots

## Phase 5 — Customization

- [ ] Editor: place/rotate/delete/undo/redo; snap to grid
- [ ] Floors/walls/themes; avatar creator; multiple offices/floors
- [ ] Templates; publish/draft; permissions
- [ ] Build a room in < 5 min; second user sees published layout
- [ ] Invalid layouts blocked (overlap, unreachable, missing assets)
- [ ] Editor E2E + screenshots

## Phase 6 — AI

- [ ] Provider abstraction; mock fallback works with no keys
- [ ] 5 prompts → 5 valid, reachable layouts
- [ ] Avatar generator constrained; portrait generation optional
- [ ] Decor generation + moderation
- [ ] 1–2 NPCs; AI chat commands
- [ ] Budget caps + audit log
- [ ] Prompt-injection tests pass
- [ ] Quality review of 10 generations

## Phase 7 — Product

- [ ] Landing + pricing + onboarding
- [ ] Org creation, invites, roles, guest links
- [ ] Stripe test checkout + customer portal + webhook
- [ ] Settings, admin, legal pages
- [ ] Signup → office → invite → join → pay flow
- [ ] Tenant isolation across billing/admin
- [ ] Responsive; mobile screenshots

## Phase 8 — Ship

- [ ] Lighthouse/a11y targets met
- [ ] 50-bot load test; perf budget met
- [ ] Security pass (CSP, rate limits, uploads, secrets)
- [ ] Backup/restore tested
- [ ] Fresh deploy from README
- [ ] Demo video + screenshots
- [ ] Known gaps documented

## Release checklist

- [ ] No secrets in repo or client bundle
- [ ] Migrations reversible or backed up
- [ ] Error tracking + health checks live
- [ ] Terms/privacy pages reviewed
- [ ] Support/contact path
- [ ] Rollback plan
