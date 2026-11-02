# Models and seeds

The user has model/seed references to send. Record them here, evaluate them, and decide exactly where each fits.

## Evaluation criteria

| Criterion | What we need |
|---|---|
| License | Commercial use, redistribution in a product, no attribution traps |
| Output type | Image, image-to-3D, 3D, texture, animation, video |
| Quality | Matches the Workbits art direction; clean silhouettes; no "AI weirdness" |
| Consistency | Can it hold a character/style across multiple generations? |
| Control | Image reference, seed, LoRA, negative prompt, style strength |
| API | Programmatic access, latency, async jobs, webhooks |
| Cost | Per-image/model, free tier, rate limits |
| Hosting | Cloud API vs self-host; data/privacy implications |
| Integration | Can it plug into the asset pipeline or runtime? |
| Fallback | What happens if it fails or is unavailable? |

## Model matrix — verified 2026-11-02

All nine models fired successfully through T3 Code as subagents with a one-line prompt. See [`../operations/model-routing.md`](../operations/model-routing.md) for routing and [`../operations/usage.md`](../operations/usage.md) for telemetry.

| Model | Provider | Best at | Routing |
|---|---|---|---|
| gpt-6-luna | Codex | Summaries, cheap bulk reads | Default for cheap bulk |
| gpt-6-astra | Codex | Hardest 1–2 calls, token-efficient | Rare; low effort |
| gpt-6.1-sol | Codex | Planning, critique | Plan reviews / second opinions |
| gpt-6.1-terra | Codex | Communication, text | Copy, docs, UX writing |
| claude-opus-5-5 | Claude Code | Hard reasoning, architecture | Architecture / risky diffs |
| claude-sonnet-5-5 | Claude Code | Workhorse execution | Bulk implementation |
| claude-haiku-5-5 | Claude Code | Bulk exploration | Search/summaries, <100k ctx |
| opencode-go/deepseek-v4.1-flash | OpenCode Go | Cheap real coding | Main thread / mechanical edits |
| opencode-go/kimi-k3.1-pro | OpenCode Go | Vision, 3D, design taste | Visual/art checks only |

### Pending

- The user's **seed/reference assets** (specific models, LoRAs, asset packs, prompts) are still to be sent. Add them here with license, quality, and integration verdicts.
- Runtime AI provider key for in-app generation is still open.

## Concept generation (design workflow)

- **Sol (GPT-6.1 Sol via T3 Code Codex provider)** — used to generate the three art-direction references in `art/`. Native image generation worked; no API key needed for this design step.
- **OpenCode default image model** (`opencode/gpt-image-2.5-sunburst`) — failed with "insufficient account funds".
- **OpenAI image model** (`openai/gpt-image-2`) — available in the catalog; may bill the OpenAI account.

These are **design-time** tools. The product's runtime AI needs its own provider/key.

## Runtime AI options

| Provider | Use | Notes |
|---|---|---|
| OpenAI | LLM + image | Broad; `gpt-image-1`/2 for portraits/posters |
| Anthropic | LLM | Strong reasoning/writing; no image generation |
| Google | LLM + image | Gemini/Imagen |
| Ollama | Local LLM | No key; slower; good fallback for dev |
| Meshy | Image/text-to-3D | Paid commercial rights; async jobs |
| Tripo | Image/text-to-3D | Game-optimized; paid commercial rights |

## Rules

1. Never let a model output an asset key, coordinate, or code that isn't schema-validated.
2. Never ship an AI asset without a license record and a QA pass.
3. Always have a deterministic mock fallback so the demo works without keys.
4. Keep prompts and outputs tenant-scoped; don't send private chat content to a model without explicit permission.
