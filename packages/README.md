# packages/

Shared code. No app-specific UI here except the design system.

| Package | Responsibility |
|---|---|
| `shared` | Zod schemas, protocol messages, layout types, nav-grid helpers, constants |
| `db` | Drizzle schema, migrations, seed, repository helpers |
| `ui` | Design tokens, accessible primitives, icons, shared components |
| `harness` | Verification CLI, Playwright flows, bots, perf/a11y/visual checks |
| `assets` | Furniture/avatar catalog manifests, footprints, thumbnails, license data |

## Rules

- `shared` has no Node-only or browser-only imports.
- `db` is server-only.
- `ui` is browser-only.
- `harness` may import `shared` and `db` (for seeding) but never app internals.
- Every package has its own `package.json`, `tsconfig.json`, and `src/index.ts`.
