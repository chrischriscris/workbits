# Workbits — overnight handoff

## Open it

The local stack should already be running:

- Web: **http://localhost:3100**
- Realtime API: `http://localhost:3101`
- LiveKit: `ws://localhost:7880`

If you need to restart everything:

```bash
bun install
bun run dev
```

`bun run dev` starts the LiveKit Docker container, the Node/Colyseus server, and Vite. Docker must be running.

## Five-minute tour

1. **The office** — the team pack is live: Jules, Mira, Felix, Fern, Arlo (frog), Theo (asleep), Chus, and Claw'd the mascot.
2. **Walk** — click the floor or use WASD. Scroll to zoom, drag to pan.
3. **Second user** — click the user chip (top-right) → **Demo as Jules**, or open `http://localhost:3100/?character=jules` in another tab. You should see each other move.
4. **Chat** — click the bottom composer, send a message, then open the other tab. Both messages appear. History is persisted to `apps/server/data/chat.jsonl` (gitignored).
5. **Voice** — click the mic in the bottom-right control bar. Allow microphone access. The "Proximity" pill should say `live`. Walking away lowers the other person's volume; deafen mutes output. Meeting-room isolation is currently a client-side zone gate.
6. **Avatar Studio** — click the wand (bottom-right). Type a prompt, generate three bases, apply one. The avatar updates in-scene and persists in localStorage.
7. **Rooms** — click the office name (top-left) to open the room list; click a room to walk there.
8. **Mobile** — open the same URL at 390×844; the top bar and controls collapse.

## What is real

- R3F isometric office with procedural furniture and the 8-character seed pack.
- Server-authoritative movement bounds and presence messages.
- Shared realtime chat with server-side persistence.
- LiveKit room token endpoint + mic publishing + distance-based volume.
- Deterministic local Avatar Studio (no API key).
- Rooms menu and character switcher.
- `bun run build` passes; `bun run verify` produces a report.

## What is mocked / incomplete

- **Auth, orgs, invites, billing, landing page** — not built. The app opens straight into the demo as Chus.
- **Office editor** — not built. Avatar Studio is the customization slice.
- **AI room generation** — not built. Avatar Studio is the local AI slice.
- **Chat authz** — Global/Office/Room/DM are UI channels; the server currently broadcasts to the room. DMs are not private yet.
- **Meeting-room privacy** — client-side volume gate, not a separate LiveKit room.
- **Two real microphones** — the voice path is verified with a fake device and one published track; a manual two-person audio test is still needed.
- **React console warning** — `Attempted to synchronously unmount a root...` comes from the R3F HTML name-tag portal path. It does not break the scene, but should be cleaned up.
- **Scale** — single realtime instance; the Redis/horizontal path is designed but not exercised.

## Verification

```bash
bun run verify
```

Latest run is under `artifacts/verify/<timestamp>/report.md`. It covers typecheck, proximity math, desktop screenshot, realtime bot + chat, LiveKit publish, and Avatar Studio.

## Where to continue

- `PLAN.md` — full product/architecture plan.
- `docs/decisions.md` — ADRs, including the message-based realtime MVP deviation.
- `docs/progress.md` — what is done and what is next.
- `docs/open-questions.md` — decisions still needed.
- `docs/architecture/` — data model, realtime, voice, chat, AI, security, deployment.

The next highest-leverage work: auth/orgs, a data-driven office editor, AI room generation, real per-room LiveKit voices, and chat channel authorization.
