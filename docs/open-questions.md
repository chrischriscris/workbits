# Open questions

Only real decisions that change the build. Defaults are what we will use if the user says "go with defaults".

| # | Question | Why it matters | Default | Status |
|---|---|---|---|---|
| 1 | **Model/seed references** the user mentioned | Could change the asset/AI pipeline (image-to-3D, textures, concept quality) | Evaluate whatever is sent; keep procedural + CC0 base | Waiting on user |
| 2 | **Runtime AI provider/key** (OpenAI, Anthropic, Google, none) | In-app room/avatar/decor/NPC generation needs a runtime API; concept generation used Sol | Mock/fixture fallback; add real provider when key provided | Open |
| 3 | **Deploy target** | Local/LAN demo vs public URL changes TLS, LiveKit, domain, secrets | Local Docker first; public deploy scripts included | Open |
| 4 | **Must-have scope** for the sellable beta | Screen share, meeting-room camera, mobile browser, Stripe billing, guest links, AI NPCs | All yes except native apps; billing in Stripe test mode | Open |
| 5 | **Brand identity** | Logo, colors, domain, marketing copy | Workbits wordmark + palette from art direction | Open |
| 6 | **Paid asset budget** | Paid packs (Synty/KayKit) or commissioned art can raise quality | $0: procedural + CC0; propose upgrades after style frame | Open |
| 7 | **Pricing/plans** | Landing page, Stripe products, seat limits | Free (10 seats) / Pro ($8–10/seat) / Business (custom) | Open |
| 8 | **Transactional email** | Invites, password resets, guest links | Resend or Postmark; console logger in dev | Open |
| 9 | **Stripe account** | Billing test mode needs products/prices | Test mode with env keys; no live charges | Open |
| 10 | **Recording/privacy** | Voice/video recording is a major privacy decision | No recording; metadata only | Open |
| 11 | **Integrations** | Calendar/Slack/Teams are common asks but out of v1 | Design hooks, don't build | Deferred |
| 12 | **Concurrent users per office** | Load targets and room sharding | 25–50 target, 100 ceiling | Confirm |
| 13 | **Mobile** | Responsive web vs PWA vs native | Responsive + touch controls; PWA later | Confirm |
| 14 | **Domain** | Public demo and email sending | Use a temporary/tunnel URL until provided | Open |

## Blocking the all-night build?

Nothing. The build can start with defaults and absorb the model references when they arrive.

## Blocking a public, sellable launch?

- Domain + deployment target
- Stripe account (test mode is enough for the demo)
- Runtime AI key (if AI features must be live)
- Transactional email provider
- Brand/logo finalization
