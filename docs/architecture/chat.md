# Chat design

## Channels

| Type | Scope | Behavior |
|---|---|---|
| `global` | Org | Announcements; admins post, everyone reads; one per org |
| `office` | Org/office | Everyone in the office; watercooler |
| `room` | Physical room | Auto-created per room; membership follows presence |
| `group` | Custom | Public or private; user-created; members invited |
| `dm` | Users | 1:1; group DMs are groups |

Auto channels are created with the office/room and reconciled on layout publish. Private channels require membership.

## Features

- History with cursor pagination; full-text search (Postgres `tsvector`).
- Replies/threads (one level), reactions, mentions, attachments, link previews (stretch).
- Typing indicators, read receipts, unread badges, notification toasts.
- Edit/delete (soft delete), admin moderation, report/block.
- Markdown with sanitization; emoji picker; code blocks.
- AI slash commands: summarize, translate, draft, standup.
- Browser notifications (opt-in), sound toggle.

## Data flow

1. Client sends `chat.send` to `OrgRoom` with `channelId`, `clientMessageId`, body, attachments.
2. Server:
   - authz: member of org and channel (or room presence for room channels).
   - rate limit per user/channel.
   - length/size caps; sanitize markdown; validate attachment ownership.
   - persist message; update `reads` for the author.
   - broadcast `chat.message` to channel subscribers.
3. Client renders optimistically, reconciles on ack; dedupes by `clientMessageId`.
4. History/search via REST: `GET /api/channels/:id/messages?cursor=...`, `GET /api/search?q=...`.

## Authorization

- Channel membership is checked server-side on send, edit, delete, react, read.
- `global`: read for all members; write for admins (configurable).
- `office`: read/write for members with access to the office.
- `room`: read/write only while present in the room (or recently present, for continuity).
- `group`/`dm`: explicit membership only.
- Cross-tenant access returns 404, not 403, to avoid leaking existence.

## Moderation

- Admins can delete messages, mute/ban members, and view an audit log.
- Report flow: user reports → admin queue (v1: simple table + email/notification).
- Rate limits and spam heuristics; link/attachment caps.
- AI moderation optional; never the only line of defense.

## UI

- Left sidebar sections: Office, Rooms, Groups, DMs; unread dots and mention badges.
- Overlay panel over the office, collapsible; keyboard shortcut to focus composer.
- Message list: avatar, name, time, body, reactions, reply count; own messages right-aligned? (No — keep a consistent chat log, not a messenger bubble style.)
- Composer: attachments, emoji, mention autocomplete, send; Enter to send, Shift+Enter newline.
- Channel header: name, members, search, settings.
- Unread divider and "jump to present".
- Empty states and error states designed, not default.

## Retention and privacy

- Messages retained until deleted; org admin can set retention later.
- DMs are private to members; admins cannot read content in v1 (document this).
- No E2EE in v1; transport is TLS, at-rest encryption is DB-level.
- Export/delete on org request (GDPR-style).

## Scale

- OrgRoom per org; fan-out to channel subscribers only.
- 15 Hz not needed for chat; events are immediate.
- Persist asynchronously but ack after write (or write-behind with a durable queue later). For v1, write first, then broadcast.
- Search index maintained by Postgres triggers or a periodic job.
