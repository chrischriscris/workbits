# Reference analysis

The user supplied five references. They are direction, not assets. Nothing here may be copied into the product.

## User references

### 1. Failed pixel-art office

Path: `~/.t3/userdata/attachments/...da899a27...png`

- **Works:** the floor plan reads, rooms are distinguishable, presence labels are clear, the diorama framing is charming.
- **Fails:** pixel characters and pixel furniture do not match the smooth isometric shell; characters look pasted on; sprite direction/scale is inconsistent; the room feels like a mockup, not a place.
- **Lesson:** art consistency is the product. A unified material/lighting system matters more than asset count.

### 2. Failed pixel web app

Path: `~/.t3/userdata/attachments/...369691dd...png`

- **Works:** the product shell is legible — roster with online/away, room labels, chat composer, top-right account.
- **Fails:** the avatars are low-fidelity pixel art, the room is flat, and the UI feels generic. The art and UI don't share a language.
- **Lesson:** the UI must feel designed for the world, not a dashboard dropped on top.

### 3. WoW dark fantasy office

Path: `~/.t3/userdata/attachments/...59fdd2dc...png`

- **Works:** mood, lighting, depth, props, and the sense of a lived-in place. The meeting list and roster feel integrated.
- **Fails:** the fantasy chrome, ornate frames, and painterly style are not a modern team product. The art is illustration, not a real-time customizable system.
- **Lesson:** borrow the *place-making*, not the skin.

### 4. WoW alliance office

Path: `~/.t3/userdata/attachments/...fdc1d0fc...png`

- Same lessons as #3. The blue/gold palette and banners are beautiful but wrong for Workbits.
- **Lesson:** a strong palette can carry a world; ours is sand/sage/slate, not gold/crimson.

### 5. Modern isometric concept (north star)

Path: `~/.t3/userdata/attachments/...dfb0171a...png`

- **Works:** exactly the target — clean cutaway office, flat-vector look, pastel palette, crisp chibi characters, glass meeting room, product UI with roster and chat. The user called it "epic and too close to what we want."
- **Challenge:** that level of polish is hard with hand-made sprites. The 3D pipeline is how we get there consistently.
- **Lesson:** target this composition, palette, and character charm; push the render flatter than a typical 3D game.

## Generated concept frames (Sol)

- `art/style-scene.png` — room composition, camera, palette, lighting.
- `art/style-characters.png` — the character quality/consistency bar. Five distinct, charming, consistent chibi characters.
- `art/style-product.png` — product shell: glass sidebar, roster, composer, floating controls.

### Critique

- The scene is too textured/"Pixar"; the in-engine target is flatter and more graphic.
- The characters are slightly more adult-proportioned than the 1/3-head chibi target; the lineup is still the charm/consistency bar.
- The UI uses placeholder labels; real UI must be legible, accessible, and denser.

## Anti-references

- **SoWork** — the screenshots are from an existing product. Do not copy its name, logo, UI, copy, or assets.
- **WorkAdventure** — AGPL + Commons Clause; do not copy code or maps.
- **WoW** — copyrighted art/IP; do not copy assets, factions, or trade dress.
- **Generic "metaverse"** — no floating 3D avatars in a void, no VR headset framing, no crypto.
