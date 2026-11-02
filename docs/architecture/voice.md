# Voice design

## Provider

LiveKit SFU. Dev uses `livekit-server --dev` in Docker; production uses LiveKit Cloud by default (or a self-hosted cluster later). Same client/server code.

## Token flow

1. Client asks `GET /api/livekit/token?officeId=...&zoneId=...`.
2. Server authenticates, checks org membership and zone access, then mints a JWT:
   - `identity = user:{userId}`
   - `room = office:{officeId}:floor:{floor}` or `office:{officeId}:room:{roomId}`
   - `canPublish = true`, `canSubscribe = true`
   - TTL 10 minutes; client refreshes before expiry.
3. API secret stays server-side.

## Audio topology

- **Open floor:** one LiveKit room per floor. Everyone on the floor publishes/subscribes.
- **Private room (meeting/phone):** the production design is one LiveKit room per private room. **Current demo:** one floor room plus a client-side zone gate (meeting room bounds) that sets non-matching participants to volume 0. This is a UX demo, not cryptographic privacy; the track is still delivered. Swap to room-per-zone before claiming privacy.
- **Zone switch:** unpublish from the old room, publish to the new one. Brief reconnect (~0.5–1 s); UI shows "connecting audio".
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
- Playwright two-context test with fake media devices: join, mute, move near/far, switch room, assert participant counts and track states.
- Manual checklist with real mics on Chrome/Safari/Firefox.
- Load: 50 published audio tracks in one LiveKit room (bots or manual).
