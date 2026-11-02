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
7. **Workspace Studio** — click the layout icon next to the wand. Generate three desk configurations and apply one; the engineering pod rebuilds. Persists in localStorage.
8. **Rooms** — click the office name (top-left) to open the room list; click a room to walk there.
9. **Invite** — click the share icon. The copied link opens a pick-your-seat screen (Jules, Mira, Felix, Fern, Arlo, Theo, Chus, Claw'd).
10. **Status + emotes** — open the user chip to set Available / Focus / Away. Use the smile button for a room-wide wave, clap, or heart.
11. **Mobile** — open the same URL at 390×844; the top bar and controls collapse.

## What is real

- R3F isometric office with procedural furniture and the 8-character seed pack.
- Server-authoritative movement bounds and presence messages.
- Shared realtime chat with server-side persistence; DMs are server-routed to sender + recipient only.
- LiveKit room token endpoint + mic publishing + distance-based volume.
- Deterministic local Avatar Studio + Workspace Studio (no API key).
- Rooms menu, invite picker, status menu, character switcher, and room-wide emotes.
- `bun run build` passes; `bun run verify` produces a report.

## What is mocked / incomplete

- **Auth, orgs, invites, billing, landing page** — not built. The app opens straight into the demo as Chus.
- **Full office editor** — not built. Avatar Studio and the engineering-pod Workspace Studio are the customization slices.
- **LLM room generation** — not built. Workspace Studio is the deterministic local slice.
- **Chat authz** — Global/Office/Room still broadcast to the room; DMs are server-routed and history-filtered, but group/room membership is not enforced.
- **Meeting-room privacy** — client-side volume gate, not a separate LiveKit room.
- **Two real microphones** — verified with two browser clients and fake devices, both publishing and reading the same proximity gain. A manual real-mic conversation is still worth doing.
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
