# Voice design

## Provider

LiveKit SFU. Dev uses `livekit-server --dev` in Docker; production uses LiveKit Cloud by default (or a self-hosted cluster later). Same client/server code.

## Token flow

1. Client joins the Colyseus office. The server sends a private `voiceKey` in that client's `welcome` message (never broadcast to other players), then the client asks `GET /livekit/token?identity=<sessionId>&key=<voiceKey>&name=<name>`.
2. Server checks the per-session key, looks up that session in its authoritative presence registry, and derives the room from the player's current zone:
   - `identity = <Colyseus sessionId>` for the demo; production becomes `user:{userId}` after auth.
   - open floor → `office:workbits-loft`
   - meeting room → `office:workbits-loft:meeting`
   - A client-supplied `room` query parameter is ignored. An identity without the matching key, or one that has not joined the office, gets `403`, so knowing a broadcast session id is not enough to mint a token for it.
   - `canPublish = true`, `canSubscribe = true`; TTL 10 minutes.
3. API secret stays server-side. Tokens are scoped to one room.

**Production gap:** identity is still the demo session, not an authenticated user, and the presence registry is in-process. Auth/org membership plus a shared presence store (Redis) are required before multi-instance or public deployment.

## Audio topology

- **Open floor:** one LiveKit room per floor. Everyone on the floor publishes/subscribes.
- **Private room (meeting):** a separate LiveKit room, `office:workbits-loft:meeting`. Outsiders never receive the track. This is implemented and verified with two browser clients.
- **Nap room:** still shares floor audio; it is a quiet zone, not a voice-isolated one. Add a private room if needed.
- **Zone switch:** the client watches its own authoritative zone, waits 450 ms for the move message to reach the server, leaves the old room, requests a fresh token, joins the new room, and restores the mic state. Brief reconnect; the control bar shows `Meeting room · private`.
- **Meeting rooms:** camera + screen share enabled; floor audio is off.
- **Knock (later):** request to join a locked room; owner admits.

## Proximity audio

For each remote participant on the same floor:

```
d = distance(localAvatar, remoteAvatar)
gain = smoothstep(far, near, d)   // near = 1.5 m, far = 8 m
pan  = clamp((remoteScreenX - localScreenX) / halfWidth, -1, 1) * 0.8
```

- Route remote audio through Web Audio: `MediaStreamAudioSourceNode → GainNode → StereoPannerNode → destination`.
- Use LiveKit `RemoteAudioTrack.attach()` to get the stream; do not rely on `setVolume` alone if we want pan.
- Fade smoothly (per-frame lerp) to avoid zipper noise.
- Mute remote audio below gain threshold to save CPU; keep the graph alive.
- Optional low-pass filter for distant voices (subtle, avoid muffled meetings).

## Controls

- Open mic with VAD, or push-to-talk (Space) as a setting.
- Mute / deafen; deafen also mutes output.
- Input/output device picker; mic level meter; test tone.
- Speaking indicator on the avatar and roster.
- Connection quality indicator; reconnect state.
- Keyboard shortcuts; accessible labels.

## Privacy and security

- No recording by default. Voice is never persisted.
- Tokens are room-scoped and short-lived.
- Private rooms are separate LiveKit rooms; no audio is delivered to outsiders.
- Server logs room joins/leaves metadata, not content.
- E2EE is not in v1; document that clearly.

## Failure modes

| Failure | UX |
|---|---|
| Mic permission denied | Clear prompt + link to browser settings; join muted |
| No input device | Device picker + "join muted" |
| Device unplugged | Auto-switch or prompt; keep call alive |
| Autoplay blocked | "Click to enable audio" overlay |
| Network loss | Reconnect with backoff; keep text chat |
| LiveKit unavailable | Text/office still works; banner |
| Token expired | Silent refresh; if fails, re-auth prompt |

## Testing

- Unit test the gain/pan function (distance → gain, screen-space pan).
- `/dev/voice-lab` with fake participants at fixed coordinates; assert gain values.
- Playwright two-context test with fake media devices: join, mute, move near/far, switch room, assert participant counts and track states (`scripts/voice-two.mjs`, `scripts/voice-room-check.mjs`).
- Token authorization test: no key, wrong key, and outsiders get 403; a client-requested room cannot override the authoritative zone (`scripts/token-check.mjs`).
- Manual checklist with real mics on Chrome/Safari/Firefox.
- Load: 50 published audio tracks in one LiveKit room (bots or manual).
