# Workbits Team — demo seed pack

Optional demo cast for the Workbits crew. This is **data**, not product code: the app loads the manifest only when the demo pack is requested.

## Files

| Path | Purpose | Committed? |
|---|---|---|
| `manifest.json` | Cast, office template, rooms, desks, stylized avatar configs, personas | ✅ Yes |
| `photos/` | Raw reference photos used to design the avatars | ❌ No — local only, gitignored |
| `portraits/` | Optional derived/stylized portraits | ❌ No — local only, gitignored |

The group reference lives at [`../../art/team-reference.png`](../../art/team-reference.png). It is a design reference, not a shipping asset.

## How it loads (planned)

```bash
bun run seed --pack=team
```

or a dev-only **Load team** button on the demo onboarding screen. The loader:

1. Reads `manifest.json` and validates it against the seed-pack schema.
2. Creates/updates the demo org, office, rooms, desks, and users.
3. Assigns the avatar configs and room/status/pose.
4. Optionally seeds a few welcome messages.

No component imports the team names or avatars directly. The pack can be removed, swapped, or replaced by a customer's own seed without code changes.

## Cast

| Character | Role | Species | Default room | Signature |
|---|---|---|---|---|
| Jules | Founder | Human | Lounge | Navy tee, gold chain, money briefcase |
| Mira | Design | Human | Lounge | Black suit, sunglasses |
| Felix | Engineering | Human | Engineering | Black suit, sunglasses |
| Fern | Engineering | Human | Lounge | Curly hair, beard, glasses, black tee |
| Arlo | Engineering | Frog | Lounge | Original frog-person, blue tee, cat companion |
| Theo | Engineering | Human | Nap Room | Green hoodie, sleep mask, sleeping pose |
| Chus | Product | Human | Lounge | Black tee, cream chinos, sunglasses |
| Claw'd | Mascot | Crab | Lounge | Original winged crab, follows Chus |

## Design decisions

- **Group reference is the primary look.** It establishes the vibe, outfits, and props. The photos are likeness references for face, hair, skin, and body.
- **Mira** has two valid looks: the group-reference suit + sunglasses, and the photo's pink cap + jersey. The manifest defaults to the suit; the pink-cap outfit is an alternate.
- **Chus** has the group-reference black tee + cream chinos, with the photo's black suit as an alternate.
- **Felix** and **Claw'd** have no photos; they are based on the group reference.
- **Arlo** is an original frog-person, not a copy of Pepe the Frog. The cat companion is a nod to the photo.
- **Theo** has a sleeping pose and a nap-room bed; his status is `away`.
- **Claw'd** is a mascot/pet, not a human user; he follows Chus.

## Privacy and IP

- Raw photos are **personal data**. They are gitignored, never shipped, never sent to a provider without explicit consent, and not used in marketing.
- The demo uses stylized 3D avatars derived from the references, not photoreal likenesses.
- Do not ship the group reference image or its SoWork-like UI as a product asset.
- Do not ship a Pepe the Frog likeness. The frog-person is an original design.
- The team names/personas are for the internal demo with the team's consent; a public demo should use generic or approved names.

## Editing

- Keep `manifest.json` valid JSON; validate with the seed-pack schema once it exists.
- Add a character by appending to `characters`; keep IDs stable.
- If a photo is added, put it in `photos/` (ignored) and reference it in `sourcePhoto`.
- Never put raw photos or personal data in `manifest.json`.
