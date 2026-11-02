# Technology research

Research done on 2026-11-02, before implementation. The goal was to avoid the failed 2D-sprite path, keep hosting simple, and still support scale.

## Decision summary

| Area | Choice | Main alternative | Why |
|---|---|---|---|
| 3D rendering | React Three Fiber + three.js | Unity WebGL, Godot web, PixiJS | Web-native, React UI integration, orthographic camera, fast iteration, no engine export |
| Realtime | Colyseus | raw WebSocket, PartyKit, Photon | Authoritative rooms, schema delta sync, reconnection, TypeScript |
| API | Fastify + Zod | Hono, NestJS | Mature plugins, fast, familiar Node ops; AI streaming can be bridged |
| DB | Postgres + Drizzle | Prisma, Firebase, MongoDB | Relational multi-tenant data, SQL search, migrations, self-host |
| Auth | better-auth | Clerk, Auth.js | Orgs/invites/roles/OAuth/passkeys built in, no vendor lock |
| Voice | LiveKit | Daily, Agora, Jitsi, raw WebRTC | SFU + TURN + spatial-audio example + screen share + React SDK; self-host or cloud |
| AI | Vercel AI SDK | direct SDKs, LangChain | Provider-agnostic, streaming, tool calls, easy mock fallback |
| Package manager | Bun | npm, pnpm | Installed and fast; Node fallback for incompatible server deps |
| Assets | Procedural kit + CC0 packs | paid Synty, AI 2D sprites | Consistent, commercial-safe, customizable; paid upgrade path |
| Deploy | Docker Compose + Caddy | Vercel, Kubernetes | Stateful WebSocket server, simple single-node default |

## pstack (Lauren Tan / poteto)

- pstack is an engineering-workflow pack for coding agents: playbooks, principles, verification skills, and subagents. The central command `/poteto-mode` routes a request to a playbook, builds a task list, delegates, and demands runtime verification.
- Key ideas we adopt: **trust before parallelism**, **verification is evidence, not a passing build**, **control-app** (a purpose-built tool to drive and inspect the running app), **write less, higher quality**.
- Our `packages/harness` is the Workbits equivalent of `control-app`.
- Sources:
  - https://daily.dev/posts/a-deep-dive-into-pstack-evqbnto9j
  - https://github.com/ahmedbenaw/pstack (community port with docs)
  - https://x.com/poteto/status/2094457600259842065
  - https://flaviocopes.com/pstack

## LiveKit spatial audio

- Official demo: https://github.com/livekit-examples/spatial-audio
- Tutorial: https://livekit.com/blog/tutorial-using-webrtc-react-webaudio-to-create-spatial-audio
- Confirms: Web Audio `PannerNode`/`GainNode` per remote participant, distance model, stereo pan. LiveKit handles SFU/TURN; we control gain/pan from avatar positions.
- Also supports screen share, camera, Krisp noise filter, and room-scoped tokens.
- WorkAdventure's own stack uses LiveKit, which validates the choice for a virtual office.

## WorkAdventure (reference, not base)

- https://github.com/workadventure/workadventure
- Open-source 2D pixel virtual office with proximity chat, Tiled maps, self-hosting.
- Valuable lessons: zone-based audio bubbles, map editor, guest access, integrations.
- Not a base: AGPL v3 + Commons Clause, 2D pixel art, PHP/Laravel + Vue stack. We must not copy code or assets.

## React Three Fiber isometric

- Orthographic camera example: https://r3f.docs.pmnd.rs/api/canvas ( `orthographic` prop )
- Crossy Road-style orthographic setup: position `[300, -300, 300]`, `up: [0,0,1]`, zoom.
- Performance guidance: https://r3f.docs.pmnd.rs/advanced/scaling-performance
- Key rules: no per-frame React state; use `useFrame` + refs; instancing; DPR cap; demand rendering when idle where possible.

## Colyseus

- Authoritative room state, schema serialization, delta patches, matchmaking, reconnection.
- Redis presence/driver for multi-instance; sticky sessions required.
- Fits one room per floor; `OrgRoom` for chat/presence.

## Bun

- Bun 1.4.4 is installed. Use `bun install` / `bun run`.
- Risk: some Node-native server packages (Fastify plugins, `ws`, Colyseus transport) may not be fully compatible. Spike in Phase 0; fall back to Node 24 for the server process if needed. One lockfile.
- Vite and Playwright run fine; Playwright itself uses Node.

## AI 3D and image tools (for later)

- Meshy, Tripo, Rodin, Sloyd: text/image-to-3D. Paid plans generally grant commercial rights; **free tiers often use CC BY 4.0** (attribution) or restrict commercial use. Verify before shipping.
- Scenario, Retro Diffusion, PixelLab: game-art image generation, strong for 2D sprites/styles. Less relevant to our 3D core.
- TRELLIS/Hunyuan3D: open-source, but need a strong GPU; not viable on the current 8-core CPU box.
- Decision: AI for textures, posters, decor, and optional image-to-3D props; **not** core avatar geometry in v1.

## Hosting research

- Single Node process can mount Fastify and Colyseus on the same HTTP server, keeping deployment to one app container.
- LiveKit Cloud removes TURN/TLS/UDP operational pain; self-host is possible but not the default for a sellable beta.
- Caddy handles TLS and WebSocket reverse proxying with minimal config.
- Redis only needed for multi-instance presence; single-node uses in-memory.
