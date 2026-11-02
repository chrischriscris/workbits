# CLAUDE.md

Read [`AGENTS.md`](AGENTS.md) first. It is the operating manual for this repo and applies to every agent, including Claude.

The short version:

- **Project:** Workbits, a browser-based isometric virtual office. Planning + art direction approved; product code not started until the user says **go**.
- **Art:** warm stylized 3D diorama, 80% flat color / 20% render polish, chibi modular characters. No pixel art, no fantasy chrome, no AI core geometry. The character sheet in `art/style-characters.png` is the bar.
- **Stack:** React 19 + Vite + R3F, Colyseus, Fastify, Postgres/Drizzle, better-auth, LiveKit, Vercel AI SDK, Bun for installs/scripts.
- **Hosting:** one Node process + Postgres + LiveKit + Caddy by default. Redis/S3 optional. No Kubernetes.
- **Performance:** 60 fps at 1080p on integrated graphics, 30 fps mobile, 50 avatars/floor.
- **Process:** pstack-style evidence-first. Every phase needs screenshots/video/metrics and a written gate. A passing build is not proof.
- **Security:** tenant isolation and server-side authz from day one. No secrets in the repo. No copying reference assets/branding/code.
- **Docs:** update `docs/progress.md` and, for decisions, `docs/decisions.md`.

Do not start the marathon build until the user explicitly says go.
