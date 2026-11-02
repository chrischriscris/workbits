# Character pipeline research — how people actually build stylized game characters in 2026

Status: research note, 2026-11-02
Trigger: the primitive avatar benchmark hit its ceiling; the reference is a
sculpted, rigged character, not a better arrangement of React primitives.

## TL;DR

No current text/image-to-3D tool one-shots the reference cast. The reference is
an art-directed sculpt: smooth connected body, authored hair masses, readable
face, cloth folds, a humanoid rig, and animation. AI can generate a useful base
in minutes, but production quality still comes from a **base mesh + Blender
cleanup + auto-rig + animation retarget**, or from a purchased/commissioned
stylized character pack.

The realistic "vibecode" stack is:

```
reference image
  → generative base (Meshy / Tripo / Rodin) or a rigged base (Quaternius/Synty)
  → Blender MCP: retopo, merge, sculpt, hair, materials
  → auto-rig (Meshy/Tripo, Mixamo, AccuRIG) + animation library
  → GLB (Draco/KTX2) → three.js useGLTF + useAnimations
  → render-in-the-loop comparison against art/style-characters.png
```

## Tool landscape

| Tool | Best for | Rig / animation | Agent access | Price | Caveat |
|---|---|---|---|---|---|
| **Meshy 7.1** | All-round game character pipeline | Auto-rig humanoid/quadruped, 600+ clips, text-to-motion | Official MCP (24 tools), CLI, agent skill | ~$20/mo, ~33 textured models | Free tier is CC BY 4.0 and 10 downloads/mo; API assets expire |
| **Tripo P2** | Clean topology and cheap volume | 7 skeleton types, Mixamo/Unity/Unreal/VRM bone naming, animation retarget | Official MCP, CLI, Codex plugin | ~$20/mo, ~200 models | Free tier is public/non-commercial; fine face detail trails Meshy/Rodin |
| **Rodin Gen-2.5 (Hyper3D)** | Best raw geometry/topology, hero props | Rigging via new CLI, not the web app | Hosted MCP for Claude Code/Codex, CLI, Claude Code skills | ~$30/mo, ~60 models | Highest entry price; plan a separate rig step |
| **Ludo** | Cheapest rigged + animated character; full game asset list | 3 rig types, 7 bone conventions, 640+ clips, GLB with clips | MCP, CLI, API | ~$20/mo; ~$0.44 per rigged character | GLB only for rigged; triangles, not quads; 2K textures |
| **3D AI Studio** | Sampling Meshy/Tripo/Rodin/Hunyuan/Trellis from one bill | Auto-rig on the website, 12 clips | Official MCP | ~$19/mo | Aggregator: quality depends on the underlying engine |
| **Kaedim** | Studios that want human-checked assets | Not advertised | No public MCP | $400/mo | Expensive; vendor workflow |
| **Hunyuan3D-2.x** | Free/local image-to-3D | No rig | Local code/ComfyUI | Free + GPU | Needs a capable NVIDIA GPU; no animation |
| **TRELLIS 2** | Free/local high-quality mesh + PBR | No rig | Local code | Free + 24 GB GPU | No animation; research-grade setup |

Official links: [Meshy MCP](https://www.meshy.ai/mcp),
[Tripo MCP](https://github.com/Tripo-Developer/tripo-mcp),
[Rodin](https://hyper3d.ai/), [Ludo comparison](https://ludo.ai/compare/best-ai-3d-model-generators),
[3D AI Studio guide](https://www.3daistudio.com/blog/best-ai-3d-character-and-avatar-generators-2026),
[Hunyuan3D](https://github.com/Tencent-Hunyuan/Hunyuan3D-2),
[TRELLIS](https://github.com/microsoft/TRELLIS).

## The agent layer ("skills")

This is the part that makes "vibecoding" models practical:

- **Blender MCP** — the big one. The open-source server has ~29k GitHub stars;
  Blender itself now publishes an official MCP server. Claude/Codex can inspect
  the scene, run `bpy`, add/merge/sculpt meshes, set materials, frame cameras,
  and render previews. This is the feedback loop that primitive-in-code lacks.
  [blendermcp.org](https://blendermcp.org/),
  [Blender Lab MCP](https://www.blender.org/lab/mcp-server/).
- **Meshy MCP** — 24 tools for generation, retexture, auto-rig, animation, and
  downloads, installed locally in Claude Code/Codex. [meshy.ai/mcp](https://www.meshy.ai/mcp).
- **Tripo MCP / CLI** — generate and import into Blender; a Codex plugin and a
  CLI built for coding agents. [tripo3d.ai/blog/ai-mcp](https://www.tripo3d.ai/blog/ai-mcp).
- **Rodin MCP / Claude Code skills** — hosted MCP plus CLI and Claude Code
  skills on paid plans. [hyper3d.ai](https://hyper3d.ai/).
- **Ludo MCP/CLI** — rigged, animated GLB plus the rest of the game asset list.

The practical loop: agent reads the reference and the current render, generates
or edits a base in Blender, renders a turntable, compares it to
`art/style-characters.png`, and iterates. The agent is good at scripting and
batch work; it is not good at inventing believable anatomy from nothing, which
is why the base mesh matters.

## Rigged bases and packs

If the goal is a coherent eight-person cast, a shared base is better than eight
independent generations.

- **Quaternius Universal Base Characters** — CC0, 6 game-ready models, 20
  hairstyles, humanoid rig, ~13k triangles, FBX/glTF, compatible with the
  Universal Animation Library. Best free starting point for this project.
  [quaternius.com](https://quaternius.com/packs/universalbasecharacters.html)
- **Synty POLYGON** — paid stylized character/environment packs, consistent
  look, lots of animation; re-material into the Workbits palette.
  [syntystore.com](https://syntystore.com/)
- **KayKit / Kenney / Quaternius** — CC0 low-poly packs; good for props and
  background NPCs, weaker for the plush reference look.
- **VRoid Studio / VRM** — free parametric anime avatars with a humanoid rig,
  exported as VRM (glTF extension). Good if the cast goes anime, not for the
  Pixar-ish reference. Runtime via
  [`@pixiv/three-vrm`](https://github.com/pixiv/three-vrm).
- **Ready Player Me** — cross-app stylized avatars with a built-in rig; less
  unique, but consistent and fast.
- **Character Creator 4/5 (Reallusion)** — desktop character system, morphs,
  rigs, clothing; semi-real/stylized, paid.
- **Mixamo / AccuRIG / Rigify** — free auto-rig and animation retarget. Mixamo
  is still the fastest way to get idle/walk/sit/type/wave onto a humanoid.

## What "good" costs

- **AI path:** $20–30/mo, minutes per base, then Blender cleanup and rig time.
  Expect 70–85% of the way to the reference before hand work.
- **Base + Blender path:** free (Quaternius) or $50–200 (Synty), but more agent
  and artist time. Best consistency and control.
- **Commissioned artist:** the only reliable way to match the reference exactly;
  budget days per character, not minutes.
- **Current primitive path:** zero asset cost, but it cannot reach the
  reference; it is a placeholder system.

## Free CC0 benchmark result (2026-11-02)

Grab3D turned out to be the free win:

- **Casual Man / Casual Woman** — CC0 1.0, stylized high-detail characters,
  54-bone Mixamo-compatible rig, walk/run clips, 244k triangles source.
  Decimated to 30k and 1K textures, each is 2.2 MB. One (Casual Man) is now
  integrated in the scene as a Jules benchmark.
- The style is dramatically closer to the reference: soft hair, readable face,
  connected body, clothing folds, hands, shoes.
- Remaining issues: adult proportions (reference is more chibi), the primitive
  cast is oversized next to it, and the models only ship walk/run (no idle,
  sit, or type).
- **Grab3D Character Mixer** — free CC0, modular parts in Cozy/Blocky/Low Poly
  styles, 19-bone rig, idle/walk/run/wave/jump, <20k triangles, GLB or VRM.
  More chibi and consistent than the high-detail models, but less detailed.

This gives two free cast strategies:

1. **Fidelity:** Grab3D high-detail models, decimated, recolored, with Mixamo
   idle/sit/type retargeted onto the 54-bone rig.
2. **Consistency/customization:** Character Mixer characters, all on the same
   19-bone rig and animation set, built part-by-part for the eight-person cast.

## Recommendation for Workbits

Freeze the primitive avatars as placeholders. Run a **one-character bake-off**
against `art/style-characters.png` before touching the rest of the cast:

1. **Free/control:** Quaternius Universal Base Characters + Blender MCP.
   Subdivide/smooth the body, merge seams, author hair as a few masses, keep
   the humanoid rig, retarget idle/walk/sit from Mixamo or the Universal
   Animation Library. Export GLB.
2. **Paid/fast:** Meshy 7.1 image-to-3D from a single full-body character crop,
   auto-rig, pick idle/walk/sit, export GLB.
3. **Paid/consistent:** one Synty stylized character re-materialed to the
   palette, as a quality/consistency control.

Acceptance for the bake-off:

- At the default camera, the face, hair silhouette, hands, and feet read.
- The body is one connected silhouette; no floating limbs.
- One humanoid rig; idle, walk, sit, type, wave clips.
- 15–25k triangles, GLB + Draco, under 5 draw calls per character.
- The character can be recolored via material slots without new textures.
- The winner replaces the primitive human mesh, not layers on top of it.

## Runtime notes

- `useGLTF` + `useAnimations` from drei; `SkeletonUtils.clone` for skinned
  instances; one shared rig per character.
- Keep the palette-slot system from the furniture pipeline (`fabric`, `skin`,
  `hair`, `shoe`, ...) so customization survives.
- Export GLB + Draco/KTX2; test the first load and the 50-avatar budget.
- If the cast goes VRM, use `@pixiv/three-vrm` and the VRM humanoid bone map.

## Sources

- Grab3D Casual Man: https://grab3d.com/models/characters/man/
- Grab3D Casual Woman: https://grab3d.com/models/characters/woman/
- Grab3D Character Mixer: https://grab3d.com/tools/character-mixer/
- Ludo, "The Best AI 3D Model Generators for Game Assets" (Nov 2026):
  https://ludo.ai/compare/best-ai-3d-model-generators
- 3D AI Studio, "Best AI 3D Character and Avatar Generators in 2026":
  https://www.3daistudio.com/blog/best-ai-3d-character-and-avatar-generators-2026
- Meshy MCP: https://www.meshy.ai/mcp
- Tripo MCP: https://github.com/Tripo-Developer/tripo-mcp
- Blender MCP: https://blendermcp.org/ and https://www.blender.org/lab/mcp-server/
- Quaternius Universal Base Characters:
  https://quaternius.com/packs/universalbasecharacters.html
- Synty Store: https://syntystore.com/
- Hunyuan3D: https://github.com/Tencent-Hunyuan/Hunyuan3D-2
- TRELLIS: https://github.com/microsoft/TRELLIS
- three-vrm: https://github.com/pixiv/three-vrm
