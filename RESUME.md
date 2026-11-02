# Resume — art overhaul checkpoint

Latest committed checkpoint: `405d2db` (`feat: diorama art overhaul checkpoint (scene, cast, zones, camera)`).

If the machine slept or the power dropped:

```bash
cd /home/chus/.t3/scratch/2026-11-02-need-u-to-work-all-5130e69d
bun install
bun run dev
```

- App: http://localhost:3100
- Realtime: :3101
- LiveKit: :7880
- Clean art screenshot: `bun run art:iterate` → `artifacts/art/<stamp>/current.png` + `compare.png`
- Target: `art/style-scene.png`; brief: `docs/art/overhaul-brief.md`; checklist: `docs/art/overhaul-checklist.md`

## State

- Compact 20×14 cutaway scene, new stone plinth, camera/lighting, recolored cast, enlarged bench, meeting room, kitchen, lounge, garden/nap nooks.
- Character pass by Sonnet; scene passes 1–2 by Opus; camera/light/scale by parent.
- Latest render before this note: `artifacts/art/20261102T121941Z/current.png` (plus normal UI `artifacts/shots/art-normal.png`).
- Opus pass 3 may be in flight when the machine stopped. Check `git status` and `artifacts/art/` newest; if pass 3 is incomplete, review/revert only the relevant scene files, or continue from the checkpoint.
- Do not run `bun run build`/screenshots while a scene agent is editing the same files.

## Next visual pass

1. Take the next art screenshot and compare to `art/style-scene.png`.
2. Biggest remaining gaps: right-center dead floor, meeting-room density, floor/wall warmth, softer light/shadows, plant fullness.
3. Use `bun run art:iterate`; keep camera `artMode` ~27.5 width and cast scale 1.35.
4. Run `bun run typecheck && bun test`, then commit. Keep the stack running.

Battery at note time: 73% (1.8 h), discharging.
