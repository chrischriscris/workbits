# Brief — what the user asked for

This is the durable record of the user's intent. It is not a plan; it is the source of truth the plan must satisfy. If the implementation drifts, fix the implementation.

## One sentence

Build a browser-based isometric virtual office where a remote team can see each other, walk over, talk by proximity, chat, and work — polished and complete enough to sell as a product, not just an internal tool.

## Product directives

- **Isometric view.** Office as a place, not a dashboard.
- **Office view.** Support multiple offices, rooms, workspaces.
- **Customizability.** The team can make the space theirs.
- **AI integration.** Generate sprites/assets, users/avatars, rooms, chat.
- **Proximity voice chat.**
- **Text chat:** Global, Room, Groups, DM.
- **Product-ready.** It should be sellable if it turns out well; not permanently an internal tool.
- **Performance.** Smooth on any modern browser and decent hardware.
- **Hosting.** As easy as possible without sacrificing functionality or completeness. Do not overengineer or overcomplicate.
- **Scale.** It must be able to scale; easy single-node default, horizontal path without a rewrite.
- **Name:** Workbits (for now).
- **Tooling:** Bun if possible, otherwise npm.

## Success criteria the user set

1. **Divide into tasks/stages/phases.**
2. **Be clear about objectives.**
3. **Plan a good architecture for maintainability, performance, and playability before proceeding.**
4. **Take time to research** technologies, skills, repos, libraries, blog posts, X posts, models, and assets. Compare and choose the best, not the first.
5. **Do not start by handcrafting SVGs or pixel art.** Use models/assets/libraries and improve quality with tooling.
6. **Build a verification framework as we go** — a CLI or similar with screenshots, interaction, and whatever is needed to iterate with evidence. The user cited pstack by Lauren Tan (poteto) on X.
7. **Work all night, nonstop**, once the user says go.

## References and what they teach

| Reference | Lesson |
|---|---|
| Failed pixel-art office | Layout and presence work; the pixel characters/furniture clash and read as "stuck on". This is the failure mode to avoid. |
| Failed pixel web app | The product shell (roster, chat, status) is right; the art is inconsistent and low-fidelity. |
| WoW dark fantasy office | Mood, lighting, and "place" are strong; the fantasy chrome is not productizable for a modern team. |
| WoW alliance office | Same: gorgeous illustration, wrong product direction. |
| Modern isometric concept | **North star.** Clean cutaway office, pastel palette, crisp characters, glass UI. The last image is the target. |

The user explicitly said the last concept is "epic and too close to what we want", but acknowledged that level of polish and the models/sprites are hard. The plan addresses that with a 3D pipeline, not hand-drawn sprites.

## Approved art direction

Warm stylized 3D diorama:

- Orthographic 45° camera, cutaway walls.
- 80% flat color / 20% render polish.
- Pastel palette: sand, oak, terracotta, sage, slate, accent blue.
- Chibi modular characters with large heads, simple faces, clean silhouettes.
- Clean glassmorphic product UI.
- No pixel art, no fantasy chrome, no photoreal textures, no AI-generated core geometry.

Reference frames: `art/style-scene.png`, `art/style-characters.png`, `art/style-product.png`.

## Non-goals for the first sellable version

Native apps, calendar/email/Slack integrations, recording/transcription, enterprise SSO/SAML, custom domains, user-uploaded 3D models, full video-conference grid, marketplace, localization, compliance certifications.

## Process constraint

The user wants to **keep planning and talking before the all-night build**. Do not start product code until they explicitly say go.
