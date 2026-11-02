# Data model

Postgres is the system of record. Drizzle owns the schema and migrations. Every tenant-owned row carries `org_id` (directly or via a parent) and every query is scoped.

## Core tables

```
users              id, email, name, image, email_verified, created_at
organizations      id, name, slug, logo, plan, created_at
members            id, org_id, user_id, role (owner|admin|editor|member), status
invitations        id, org_id, email, role, token_hash, expires_at, invited_by
offices            id, org_id, name, slug, theme, is_default, created_at
floors             id, office_id, name, level, layout_version
rooms              id, floor_id, name, type, bounds (jsonb), is_private
zones              id, floor_id, name, polygon (jsonb), audio_mode
workspaces         id, room_id, label, anchor (jsonb), assigned_user_id
layouts            id, floor_id, version, data (jsonb), published_at, created_by
furniture_catalog  id, key, name, category, glb_url, thumbnail, footprint,
                   height, tags, license, source, attribution
avatars            id, user_id, config (jsonb), portrait_url
channels           id, org_id, type, scope_id, name, is_private, created_by
channel_members    channel_id, user_id, role
messages           id, channel_id, author_id, body, attachments (jsonb),
                   reply_to_id, created_at, edited_at, deleted_at
reactions          message_id, user_id, emoji
reads              channel_id, user_id, last_read_message_id
presence           user_id, office_id, floor_id, x, y, zone_id, status, last_seen
subscriptions      org_id, stripe_customer_id, stripe_subscription_id, plan, seats
usage_events       org_id, kind, qty, meta (jsonb), created_at
audit_log          org_id, actor_id, action, target, meta (jsonb), created_at
```

## Key constraints

- `organizations.slug` unique; `offices` unique per `(org_id, slug)`.
- `members` unique `(org_id, user_id)`; one owner minimum enforced in service logic.
- `channels` unique `(org_id, type, scope_id)` for auto channels.
- `channel_members` unique `(channel_id, user_id)`.
- `messages` indexed `(channel_id, created_at desc)`; full-text index on `body`.
- `layouts` unique `(floor_id, version)`; only one published layout per floor (partial unique index).
- `presence` unique `(user_id, office_id)`.

## Layout JSON

The layout is the source of truth for rendering and the nav grid.

```ts
type Layout = {
  version: 1;
  floor: { width: number; depth: number; theme: ThemeKey };
  rooms: Array<{
    id: string; name: string; type: RoomType;
    bounds: { x: number; z: number; w: number; d: number };
    floor: FloorStyle; wall: WallStyle;
  }>;
  walls: Array<{ id: string; x: number; z: number; length: number; axis: 'x'|'z'; height: number; material: WallStyle; openings: Opening[] }>;
  furniture: Array<{ id: string; key: string; x: number; z: number; rotation: 0|90|180|270; color?: string; variant?: string }>;
  zones: Array<{ id: string; name: string; audioMode: 'open'|'private'; polygon: Point[] }>;
  seats: Array<{ id: string; furnitureId: string; anchor: Point; facing: Direction; workspaceId?: string }>;
  spawn: Point;
};
```

Validation: all furniture keys exist in the catalog, footprints fit inside the floor and don't overlap walls, doors are reachable, nav grid is connected, spawn is walkable.

## Tenant isolation

- All service functions take `orgId` from the authenticated session, never from the request body.
- Repository helpers require `orgId` and append it to the query.
- Cross-tenant tests create two orgs and assert 404/403 for every read/write path.
- Admin/editor roles are checked per resource, not globally.

## History and deletion

- Messages: soft delete (`deleted_at`) so replies stay coherent; admin hard-delete via a separate job.
- Offices/floors: soft delete; layouts retained for audit.
- Users: anonymize on deletion; keep aggregate usage.
- Audit log is append-only.

## Migrations

- Drizzle Kit generates SQL.
- On boot, the server runs migrations under a Postgres advisory lock (single-node safe; multi-instance safe).
- Seed is idempotent: demo org, 6 users, 1 office, 1 floor, chat history, channels.
