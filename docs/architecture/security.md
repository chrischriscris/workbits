# Security and privacy

## Authentication

- better-auth: email/password + OAuth (Google/Microsoft), optional passkeys/2FA later.
- Secure, httpOnly, SameSite cookies; CSRF protection for state-changing requests.
- Session rotation on privilege change; revoke on password change.
- Invitations use single-use, hashed tokens with expiry.

## Authorization

- Roles: owner, admin, editor, member, guest.
- Checked server-side on every mutation and every read of private data.
- Resource checks: org membership, office access, channel membership, room presence, seat ownership.
- Never trust `orgId`, `role`, `zoneId`, or `userId` from the client body; derive from the session.
- Cross-tenant reads return 404 to avoid existence leaks.
- Tests: two orgs, two users, every route, assert denial.

## Realtime

- Colyseus join requires a valid access token; server validates org/office membership.
- Client messages are validated with Zod; unknown/invalid messages dropped.
- Rate limits per socket; max payload; heartbeat/timeout.
- Server-authoritative positions/zones; reject teleports, impossible speeds, invalid seats.
- No client-provided chat author identity.

## LiveKit

- API secret server-only.
- Short-lived JWTs (10 min), scoped to one room, `canPublish` only when allowed.
- Demo: each Colyseus session gets a private `voiceKey` in its own welcome; the token endpoint requires it, so another player's broadcast session id cannot mint a token. The key is not a substitute for real auth; production uses the authenticated user/session.
- Room names tenant-scoped; server checks access before minting.
- No recording by default; no E2EE in v1 (documented).
- Webhooks verified by signature.

## Uploads

- Presigned S3 uploads with content-type and size constraints.
- Validate extension, MIME, magic bytes, and image dimensions; strip EXIF.
- Store outside the web root; serve via signed/CDN URLs.
- Virus scan hook (optional); reject SVG or sanitize it.
- Per-user/org quotas.

## Web

- CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Sanitize markdown; no raw HTML; escape user content.
- No `dangerouslySetInnerHTML` without a sanitizer.
- Rate-limit auth, AI, chat, uploads, invites.
- Dependency audit in CI; lockfile committed.
- Secrets never in client bundles; only public config via `VITE_*`.

## Data

- TLS in transit; Postgres encryption at rest (provider or disk).
- Tenant-scoped queries; row-level security optional as defense-in-depth.
- PII minimization; delete/anonymize on request.
- Backups encrypted; restore tested.
- Audit log for admin actions and AI usage; retention policy.

## Abuse

- Spam/rate limits; report/block; admin moderation.
- Guest links: expiry, single-use or bounded uses, limited role, no admin.
- AI: moderation, budgets, prompt-injection isolation, kill switch.
- Voice: mute/ban, room locks, knock-to-enter (later).

## Known gaps for v1 (state clearly)

- No E2EE for DMs or voice.
- No SOC 2 / HIPAA.
- No SSO/SAML.
- No recording/transcription.
- No custom data residency.
