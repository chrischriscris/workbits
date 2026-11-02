# apps/

Two deployable apps, one product.

## `apps/web`

React 19 + Vite + TypeScript.

```
src/
  app/            routing, providers, auth guard
  scene/          R3F canvas, camera, lights, office renderer
  scene/office/   floor, walls, rooms, furniture, nav debug
  scene/avatars/  modular character, animation, name tags
  scene/interactions/  click-to-move, seats, emotes
  ui/             roster, chat, editor, settings, controls
  lib/            API client, Colyseus client, LiveKit client, stores
  styles/         tokens, themes, global CSS
  dev/            gallery, scene, voice-lab, perf routes
```

## `apps/server`

Fastify API + Colyseus realtime, one process.

```
src/
  index.ts        boot: env, db, migrations, http, realtime
  auth/           better-auth config + session helpers
  routes/         offices, layouts, chat, uploads, livekit, ai, billing
  realtime/       OfficeRoom, OrgRoom, schemas, auth, tick
  services/       offices, layouts, chat, presence, ai, billing
  adapters/       db, redis (optional), storage (optional), livekit, ai
  jobs/           cleanup, retention, usage rollup
```

## Rules

- The server is authoritative for state and permissions.
- The web app never talks to the database or AI providers directly.
- Shared schemas live in `packages/shared`, not duplicated.
