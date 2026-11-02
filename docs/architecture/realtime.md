# Realtime design

## Rooms

- **OfficeRoom** — one per floor. Holds dynamic state: players, NPCs, seats, reactions. Static layout comes from REST/cache.
- **OrgRoom** — one per organization. Holds chat events, typing, reads, and org-level presence for users not in an office.

A user can be in one OfficeRoom and one OrgRoom. Reconnection uses a session token.

## State schema

```ts
Player {
  id: string; name: string; avatar: AvatarConfig;
  x: number; y: number; dir: Direction;
  zoneId: string; status: 'available'|'focus'|'away'|'meeting';
  seatId?: string; speaking: boolean; micMuted: boolean;
}
Npc { id, name, personaId, x, y, dir, zoneId }
Seat { id, playerId? }
```

Only dynamic state is synced. Furniture and walls are not in the schema; clients render the published layout.

## Tick and movement

- Server tick: 15 Hz.
- Client input: ≤10 Hz. `move` intent is a target point (click/tap) or a direction (WASD).
- Server validates: max speed, nav grid walkability, collision with furniture/walls, zone bounds.
- Server applies movement and broadcasts deltas.
- Client prediction for the local avatar; remote avatars interpolate over ~100 ms.
- Reconciliation: if the server position differs by > 0.25 m, snap/blend; otherwise ignore.

## Nav grid and pathfinding

- `packages/shared` builds a 0.5 m grid from the layout: walkable cells + furniture footprints + wall segments.
- A* on the grid for click-to-move; WASD uses direct steering with collision resolution.
- Doors and room thresholds are walkable cells.
- Server and client share the same generator so paths agree.
- Invalid target → nearest walkable cell; no path → cancel with a subtle UI cue.

## Zones and rooms

- Zones are polygons/rects with `audioMode: 'open' | 'private'`.
- Server computes the current zone from the avatar position; the client cannot claim a zone.
- Entering a private room: status becomes `meeting`, audio switches to the room's LiveKit room, chat auto-joins the room channel.
- Leaving: reverse; the floor's open channel is restored.
- Meeting-room occupancy is broadcast; the UI shows who is inside.

## Seats and workspaces

- Seats are anchors attached to furniture (desk chair, sofa, meeting chair).
- Interact → server checks the seat is free and reachable → locks position, plays sit/type, sets `seatId`.
- `workspaces` may be assigned to a user; "Go to my desk" pathfinds to the seat.
- Stand → unlock; brief cooldown to prevent seat spam.

## Presence and status

- `available`, `focus`, `away`, `meeting`; auto-away after idle; `meeting` set by private zone.
- Status is server-owned for zone/seat transitions; the user can override focus/away.
- Roster groups: online, away, offline; room grouping in the office view.

## Chat events

- `chat.send` → server validates membership, rate limit, sanitization → persist → broadcast.
- `chat.typing`, `chat.read`, `chat.reaction`, `chat.edit`, `chat.delete`.
- Client message id for optimistic send and dedupe.
- History/search is REST, not room state.

## Reconnection

- Client stores a session token (short-lived, refreshable).
- On disconnect, retry with backoff; server restores the player to the last valid position/seat.
- 30 s grace; after that, remove from the room and mark offline.
- UI: reconnecting banner; disable movement/chat until restored.

## Scale and interest management

- 50 players/floor target, 100 ceiling.
- Broadcast only to the floor room; OrgRoom only carries chat/presence.
- 15 Hz tick with delta compression.
- Redis presence/driver when >1 realtime instance; sticky sessions at Caddy.
- Backpressure: per-socket rate limits, max payload, drop malformed messages, heartbeat timeout.

## Anti-cheat / abuse

- Server-authoritative positions and zones.
- Speed/teleport checks; reject impossible deltas.
- Chat rate limits and length caps.
- Seat/room join rate limits.
- No client-provided `orgId`, `role`, or `zoneId` trusted.
