# Spaces: buildable, generated offices (proposal v2)

Status: **draft, decisions pending** (see the end). Supersedes ADR-014's fixed floor plan and reconciles `data-model.md`'s `Layout` once accepted.

v1 of this doc was reviewed adversarially by six models (Claude Opus 5.5, Sonnet 5.5, Haiku 5.5; GPT 6.1 Sol and GPT 6 Astra via Codex; DeepSeek v4.1 Flash via opencode). All six rejected it as an implementation plan for the same core reasons; this version is rebuilt around them. What changed is listed under "Review outcome".

## Goal

Teams build their own places instead of living in one hand-placed office: many offices per team, any mix of rooms, a parameter-driven generator as the starting point, then hand editing. Every office must still read as the warm diorama of `art/style-scene.png`, hold 60 fps at 1080p on integrated graphics and 30 fps on mobile, and keep tenant isolation and server-side authz (AGENTS.md).

Out of scope for now: multiple floors, non-rectangular rooms, collaborative editing, user-uploaded models, LLM-driven layout.

## What the code actually guarantees today

Checked against the code, not the docs:

- **Movement is client-trusted.** `move` accepts any finite x/z inside ±8.2 × ±6.2 with no speed or walkability check; `onJoin` restores client-sent positions inside ±12.2 × ±8.5; the client walks straight lines through geometry and clamps to its own `BOUNDS`. Three different bounds, none from the drawn walls.
- **Privacy is cosmetic.** The zone comes from that position, so walking (or teleporting) into the meeting room's coordinates mints its voice token. Only `meeting` gets its own LiveKit room; `nap` is flagged private but uses the floor. Proximity is client-side `setVolume` over every subscribed track.
- **No authz.** `onJoin` trusts `characterId` and `name`; any client can broadcast a `layout`; `/occupancy` and `/livekit/token` answer anyone (`allow-origin: *`), the token authenticated by a `voiceKey` in a GET query.
- **Everything is a singleton.** One presence map, module-constant voice room names, one `chat.jsonl` that every room instance reads (room history filtered by zone name only), one `workbits.office` localStorage key. `maxClients = 32`, not 50.
- **Rendering is per placement.** `baked()` merges the parts of one prop; each placed prop is its own draw call plus a shadow-pass draw; desks and meeting tables are several meshes plus nested props; avatars are ~80 unbaked meshes each. The shadow frustum (±17), `ContactShadows` (scale 34) and the camera fit (19.5 m wide, `zoom = width / 19.5`) are hard-coded to the 15 × 11 room. The bake caches never evict.
- **Seats, spawns and the cast are hard-coded** (`chairFor`, `placements`, `NAP_BED`, per-character spawns, `layout.id === "default"` special cases).

## Principles the reviews forced

1. **Privacy needs walls that physically work.** A nav grid, collision and server-side movement validation come before any generated or edited walls, because a room is only private if you can't walk through its wall.
2. **Isolation before multiplicity.** Auth, orgs and tenant-scoped joins, presence, history, occupancy and voice come before a second office exists. The generator can come earlier because it's client-only and has no server writes.
3. **Human scale is fixed; the camera moves.** The zoom stays at today's human scale (people ~14% of a 19.5 m frame, ADR-013/014). Offices larger than the frame pan: the camera follows the player, clamped to the floor. The whole-plan view exists only in the editor. Floors are capped at about 300 m².
4. **Composition is authored, then parameterized.** Start with curated plan templates and room kits with bounded parameters. A free partitioning generator (BSP/treemap) comes later, on top of the same kits, once templates prove the look.
5. **One compiler.** A single shared function turns a document into walls, openings, the nav grid, room membership and spawn points, and both server and client use it. No second copy of bounds or zones.
6. **Measured budgets.** Perf gates measure the whole scene with 50 avatars, shadows and glass on the reference iGPU, not furniture alone.

## Model

```
Org ─┬─ members (owner | admin | editor | member)
     └─ Office (space)   id, org_id, name, slug, revision
          └─ SpaceDoc    current document (+ draft once the editor exists)
```

`SpaceDoc` is versioned JSON, validated by one zod schema in `packages/shared` on both sides, with hard limits checked before any geometry work (size ≤ ~300 m², ≤ 24 rooms, ≤ 400 items, payload ≤ 256 KB).

```ts
type SpaceDoc = {
  schema: 1;
  catalogVersion: number;              // items resolve against this
  size: { w: number; d: number };      // metres, 0.5 m multiples, ≤ ~300 m²
  style: StyleKey;
  shell: { openings: ShellOpening[] }; // windows and exterior doors on the outer walls
  rooms: Room[];
  edges: Edge[];                       // interior partitions, one owner per segment
  items: Item[];
  spawns: Point[];
  provenance?: { template?: string; generator?: string; generatorVersion: number; params: unknown; seed: number };
};
type Room = {
  id: RoomId;                          // server-minted UUID, never reused
  name: string;
  type: RoomType;                      // meeting | kitchen | lounge | desks | nap | focus | open
  rect: Rect;                          // 0.5 m grid, axis-aligned
  privacy: "open" | "private";         // see Decision 1
  capacity?: number;
};
type Edge = {                          // a shared wall segment between two cells/rooms
  a: Point; b: Point;                  // axis-aligned, on the grid
  kind: "glass" | "sill" | "solid";    // interior "solid" renders low or fades; only the shell's far walls are full height
  openings: Array<{ at: number; width: number; kind: "door" | "gap" }>;
};
type Item = {
  id: string;
  key: CatalogKey;
  at: { x: number; z: number; y?: number };   // structural items snap to 0.5 m; decor may not
  rot: number;                                // quarter turns for structural items; free for decor
  attach?: { to: string; anchor: string };    // books on a credenza, art on a wall
  params?: CatalogParams[CatalogKey];         // bounded, per-key discriminated union
};
```

- **Catalog metadata lives in `packages/shared`**: footprint as a function of params, clearance, collision category (`solid | walkable | overhead | wall`), seat anchors, attach points, room-type affinity. **Renderers live in `apps/web`** (procedural from `props.tsx` or GLB per ADR-012, per key). Params are quantized so bake caches stay small; caches are owned per office and disposed on switch.
- **Rooms vs data-model.md.** Rooms are stable rows (`rooms` table, UUID) referenced by channels, desk assignments and presence; the doc stores their geometry. Deleting a room tombstones it; its chat is archived, never replayed into a new room. `floors` stays as a 1:1 row so multi-floor is data later.

## Runtime

- **One live room per office**, with a fixed Colyseus `roomId = officeId` (not `filterBy`, which opens a second instance when one is full), created only after `onAuth` resolves the user's membership server-side. Capacity is enforced; the 50 target is raised from 32 only after a measured run.
- **Movement is validated on the server:** speed limit plus a walkability check along the segment on the compiled nav grid; join and reconnect positions must be walkable or fall back to a spawn; the server sends corrections the client reconciles. Click-to-move uses A* on the same grid.
- **Room membership** is derived on the server from the compiled grid, with a small hysteresis at edges. Private rooms get their own LiveKit room; the token endpoint derives it from the server's view and requires the session, not a query key.
- **History and presence are keyed by `(orgId, officeId[, roomId])`.** `/occupancy` is per office and needs a session.
- **Publishing** (with the editor) is a revisioned, atomic swap: the server validates and stores the doc as revision N+1 (rejecting stale `expectedRevision`), recomputes every occupant's room and permissions, moves anyone now inside a wall or newly private room to the nearest walkable cell outside it, removes them from LiveKit rooms they no longer belong to through the RoomService API, and broadcasts `space_updated{revision}`. Clients drop input tagged with an older revision and rebuild.

## Rendering

- The camera keeps a fixed human-scale zoom and follows the player (pan clamped to the floor); mobile keeps its own framing rule.
- Shell: the two far walls (north/west) are full height; the near walls are a low sill. Interior edges render by `kind`: glass, sill, or a solid wall that fades when it covers an avatar.
- Static geometry is merged per room chunk into vertex-coloured meshes (one draw per chunk) and repeated items are instanced; shadows are cast by large items only; dynamic point lights are capped at ~4 per office (the rest emissive).
- Shadow camera and contact shadows are fitted to the visible region, not hard-coded.

## Templates and generation

- **Phase A: templates.** 6–10 authored plan templates in two or three size classes (e.g. 15 × 11, 20 × 14, 24 × 12), each defining room rects, edges, shell openings and spawns. Parameters: template, headcount, which optional rooms are on, style, seed. Room kits furnish each room within bounded params (kitchen run along the longest wall, meeting table sized to capacity, desk pods by headcount, lounge set facing a wall, dressing for leftover floor).
- **Phase B: free generator.** Program (room types, capacities, minimum dimensions) → reserve circulation first → partition the rest → doors on canonical edges → kits → validate (nav reachability of every room, seat and spawn; clearances with avatar radius; collision categories so rugs can sit under furniture). Infeasible programs return a specific error after bounded retries. Integer PRNG only, so seeds reproduce across engines; the stored doc, not the seed, is the source of truth.
- Generation runs in the browser from `packages/shared`; the server only validates (with the limits above) and never trusts client geometry.
- **Look gate:** a fixed set of golden seeds per template is screenshotted by the harness and compared against `style-scene.png` at the ADR-014 scale metrics, desktop and mobile.

## Order of work

1. **Document + compiler, today's office.** Serialize the current office as a `SpaceDoc` (structural snapping vs free decor, attachments, shell openings), render it from the doc, compile walls/nav grid/rooms, replace `zoneAt`, unify bounds, add server movement validation and A* click-to-move, close the open `layout` message, fix the single bounds source. Gate: same look within the noted differences, walls block movement, `verify:full`.
2. **Templates + kits + camera follow + perf**, still one dev office and client-only. Gate: screenshot grid of templates, measured fps/frame p95/draw calls with 50 avatars on the iGPU.
3. **Auth, orgs, tenant-scoped everything** (better-auth, Postgres, history/presence/occupancy/voice keyed by org and office).
4. **Many offices + persistence + switcher**, publish protocol. Gate: two offices isolated (presence, chat, voice, history), switch under the target time.
5. **Editor.**
6. **Free generator** on top of the kits.

## Review outcome

Unanimous or near-unanimous (5–6 of 6):
- auth and tenant scoping before multiple offices; `filterBy` is routing, not authz; chat history, presence and occupancy are global today;
- nav grid, collision and server movement validation in phase 1, or private rooms are meaningless;
- framing the whole office breaks ADR-014's human scale; cap size and/or follow the player;
- the draw-call claim was wrong (per placement, not per type); avatars were left out of the budget; shadows/camera hard-coded; bake caches unbounded;
- derived walls need canonical shared edges; interior walls can't be full height under this camera;
- the v1 schema couldn't represent today's office (off-grid and rotated decor, attachments, windows, rugs under furniture);
- room ids need a lifecycle; publishing needs an atomic, revisioned protocol including voice removal;
- reconcile with `data-model.md`; bound validation work on the single Node process.

Cut or deferred: composition scoring, the LLM mapping, multiple styles at first, `size: "auto"`, uniform-grid room index, chunking/LOD before measurement, polygon rooms.

## Decisions pending

1. **What "private" means.** Acoustic and chat privacy only (anyone can walk in and is then in that room's voice and chat), or access control (members list, locked doors, knock to enter)?
2. **Large offices.** Fixed human-scale zoom with the camera following the player (recommended), or keep the whole office always in frame and cap floors at about 20 × 14?
3. **Templates first.** Curated templates + kits before the free generator (recommended by 5 of 6 reviewers), or straight to the free procedural generator?
4. **Catalog renderers.** Keep the procedural `props.tsx` kit for furniture (recommended for now: it's what passes the art bar today), or move to GLB per ADR-012 as the catalog grows?
