# Avatar system

## Goals

- A base avatar that feels like **you** without a character creator learning curve.
- Modular parts and palettes so the same rig supports many people and outfits.
- Human and creature species (frog, crab/mascot) as first-class options.
- AI-generated bases when a provider is available; a deterministic, no-key generator otherwise.
- Demo casts are **data packs**, not hardcoded characters.

## Species

| Species | Rig | Use |
|---|---|---|
| `human` | Humanoid, 1.55–1.7 m, 1/3-height head | Default |
| `frog` | Short frog-person, wide eyes, big hands/feet | Arlo / fun personas |
| `crab` | Small floating crab with wings | Mascot/pet (Claw'd) |

Creature rigs share the same animation state names (`idle`, `walk`, `sit`, `wave`, `sleep`, `fly`) so the scene does not special-case them.

## Config schema (draft)

```ts
type AvatarConfig = {
  species: 'human' | 'frog' | 'crab';
  body: string;                    // catalog key, e.g. male-average
  skin: string;                    // hex
  belly?: string;                  // frog
  hair?: { style: string; color: string };
  facialHair?: { style: string; color: string };
  eyes?: { style: string; color: string };
  glasses?: { style: string; color: string };
  headwear?: { style: string; color: string };
  outfit: {
    top: string; topColor: string;
    bottom: string; bottomColor: string;
    shoes: string; shoesColor: string;
  };
  accessories: string[];           // catalog keys: gold-chain, sleep-mask, earbud...
  palette: { primary: string; secondary: string; accent: string };
  wings?: { style: string; color: string };
  voice?: { pitch: number };
  portraitUrl?: string;            // optional derived portrait
};
```

All keys come from `packages/assets` catalogs. Zod validates the config before it reaches the renderer. No free-form mesh URLs from users.

## Parts catalog (initial)

- **Bodies:** male-slim, male-average, male-broad, female-slim, female-average, frog-average, crab-small.
- **Hair:** short-textured, wavy-medium, curly-medium, slick-short, medium-swept, bun, bob, bald.
- **Facial hair:** none, short-beard, full-beard, goatee, mustache-goatee.
- **Glasses:** none, rect, round, sunglasses.
- **Headwear:** none, cap, beanie, headphones.
- **Tops:** crew-tee, graphic-tee, hoodie, suit-jacket, blouse, sweater.
- **Bottoms:** chinos, jeans, cream-chinos, suit-pants, sleep-pants, skirt.
- **Shoes:** sneakers, dress-shoes, boots, none.
- **Accessories:** gold-chain, gold-watch, earbud, sleep-mask, black-bracelet, backpack, tie, white-shirt, laptop.
- **Palettes:** skin tones, hair colors, fabric colors, accent colors.

## Animation states

`idle`, `walk`, `sit`, `type`, `wave`, `sleep`, `fly` (crab). Crossfade 150–250 ms. The renderer hides glasses/held props when a state requires it (e.g., sleep mask while sleeping).

## Generation paths

### A. Deterministic no-key generator (ships first)

Input: display name, a short prompt ("pink cap, glasses, beard, chill"), optional photo.

1. Parse keywords into tags (colors, hair, glasses, headwear, facial hair, vibe).
2. Hash the name to a stable seed.
3. Pick body/hair/outfit from the catalog; apply palette rules.
4. If a photo is provided, sample dominant skin/hair/clothing colors **locally in the browser** (canvas) and suggest parts; never upload.
5. Produce 3 variants; the user picks and tweaks.
6. Return a schema-valid `AvatarConfig`.

This is the "AI integration" baseline: it works offline, is deterministic, and is honest about being a generator rather than a model.

### B. Provider-backed generator (when keys exist)

- Text provider → tags/config proposal, constrained to the catalog.
- Vision provider → photo → attributes (hair, glasses, facial hair, palette), with consent.
- Image provider → optional stylized portrait for the roster/profile.
- Always validate; always preview; never auto-apply.

## Seed packs

A seed pack is a JSON manifest + optional local media:

```
seeds/<pack>/
  manifest.json
  photos/        (gitignored, local only)
  portraits/     (gitignored, local only)
```

Loader (planned):

```bash
bun run seed --pack=team
```

- Validates the manifest against a Zod schema.
- Creates/updates the demo org, office, rooms, desks, users, avatars, statuses.
- Is idempotent; safe to rerun.
- Never imported by product components. A dev-only "Load team" button can call the same service.

The Workbits team pack is [`seeds/team/manifest.json`](../../seeds/team/manifest.json).

## Privacy

- Raw photos are personal data: local only, gitignored, never shipped, never uploaded without explicit consent.
- Local color sampling does not leave the browser.
- Derived portraits are optional and stored outside the public bundle.
- Public demos use stylized avatars, not photoreal likenesses.
- Team names/personas need consent for public marketing.

## IP

- Original frog-person, not Pepe the Frog.
- Original winged crab, not a copied mascot.
- No copied SoWork/WorkAdventure/WoW assets or UI.
- Every catalog asset has a license record.

## Acceptance criteria (Phase 5/6)

- [ ] The team pack loads with one command and populates the demo office.
- [ ] All 8 cast members render with the correct species, outfit, accessories, name tag, and status.
- [ ] Arlo's frog and Claw'd's crab animate without special-case scene code.
- [ ] Theo sleeps in the nap room with Zzz and `away` status.
- [ ] The no-key generator produces 3 valid variants from a name + prompt.
- [ ] Photo color sampling works locally; no network request.
- [ ] A provider-backed generator can be enabled by env without code changes.
- [ ] Raw photos are absent from the build and git.
- [ ] No Pepe/SoWork/WoW assets ship.
