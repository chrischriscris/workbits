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

To see the production shape (one process serving the built app, realtime, and token API):

```bash
bun run build
bun run start
# http://localhost:3101
```

Or the container stack: `docker compose -f infra/docker-compose.prod.yml up --build` → `http://localhost:3200`. Both paths were verified.

## Five-minute tour

1. **The office** — the team pack is live: Jules, Mira, Felix, Fern, Arlo (frog), Theo (asleep), Chus, and Claw'd the mascot.
2. **Walk** — click the floor or use WASD. Scroll to zoom, drag to pan.
3. **Second user** — click the user chip (top-right) → **Demo as Jules**, or open `http://localhost:3100/?character=jules` in another tab. You should see each other move.
4. **Chat** — click the bottom composer, send a message, then open the other tab. Both messages appear. Room chat follows the room you are standing in. History is persisted to `apps/server/data/chat.jsonl` (gitignored).
5. **Voice** — click the mic in the bottom-right control bar. Allow microphone access. The "Proximity" pill should say `live`, and walking away lowers the other person's volume. Walk into the glass meeting room and the pill becomes `Meeting room · private`; you leave the floor audio room and can only hear others inside the meeting room.
6. **Avatar Studio** — click the wand (bottom-right). Type a prompt, generate three bases, then **Tune** one: skin, hair style/color, top color, glasses, beard, cap, chain. Save and the avatar updates in-scene for everyone.
7. **Workspace Studio** — click the layout icon next to the wand. Generate three desk configurations and apply one; the engineering pod rebuilds for everyone. Persists in localStorage.
8. **Rooms** — click the office name (top-left) to open the room list; click a room to walk there.
9. **Invite** — click the share icon. The copied link opens a pick-your-seat screen (Jules, Mira, Felix, Fern, Arlo, Theo, Chus, Claw'd).
10. **Status + emotes** — open the user chip to set Available / Focus / Away. Use the smile button for a room-wide wave, clap, or heart.
11. **Assistant** — click the sparkles in the top bar. Ask “Where is everyone?”, “Which room is free?”, or “Who is in the meeting room?”. It answers from live presence and can walk you there. This is a local engine, not an LLM call.
12. **Mobile** — open the same URL at 390×844; the top bar and controls collapse.

## What is real

- R3F isometric office with procedural furniture and the 8-character seed pack.
- Server-authoritative movement bounds and presence messages.
- Shared realtime chat with server-side persistence; room chat only reaches people in that room, DMs are server-routed to sender + recipient only.
- LiveKit room token endpoint + mic publishing + distance-based volume + true separate LiveKit room for the meeting room.
- Deterministic local Avatar Studio + Workspace Studio (no API key); customized avatars and desk layouts sync to everyone in the office.
- Automatic reconnect with backoff: if the realtime server restarts, the tab rejoins, restores position and status, and rebinds voice.
- Local office assistant with live presence answers and walk-to actions.
- Rooms menu, invite picker, status menu, character switcher, and room-wide emotes.
- `bun run build` passes; `bun run verify` produces a report.
- Single-process production mode and the Docker image both serve the app and realtime correctly (`bun run prod-check`).

## What is mocked / incomplete

- **Auth, orgs, invites, billing, landing page** — not built. The app opens straight into the demo as Chus.
- **Full office editor** — not built. Avatar Studio and the engineering-pod Workspace Studio are the customization slices.
- **LLM room generation** — not built. Workspace Studio is the deterministic local slice.
- **LLM chat** — not built. The assistant is a local intent engine over live office data; the UI/contract is ready for a provider.
- **Chat authz** — Room chat is zone-scoped, DMs are server-routed; Office/Global are intentionally open, and group membership is not built.
- **Meeting-room privacy** — enforced by separate LiveKit rooms, with tokens derived from the server-authoritative zone. Identity is still a demo session, not an authenticated user, so production auth/orgs remain to be wired.
- **Two real microphones** — verified with two browser clients and fake devices, including cross-room isolation. A manual real-mic conversation is still worth doing.
- **React console warning** — `Attempted to synchronously unmount a root...` comes from the R3F HTML name-tag portal path. It does not break the scene, but should be cleaned up.
- **Scale** — single realtime instance; the Redis/horizontal path is designed but not exercised.
- **Reconnect** — client-side backoff is implemented and tested; a long network partition or server-side session recovery is not.

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

The next highest-leverage work: auth/orgs, a data-driven office editor, an LLM provider for the assistant and room generation, billing/landing, and multi-instance scale.
