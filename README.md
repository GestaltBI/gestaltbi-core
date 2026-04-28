# gestaltbi-core

Angular 21 client for the GestaltBI analysis suite — a mode × view dispatch shell that runs CSV-imported data through a configurable processor pipeline and renders maps (MapLibre), charts (ECharts) and tables (ag-Grid).

## Development

Requires Node ≥ 20.19. The host filesystem is shared with the build container — the easiest way to develop is in Docker:

```sh
docker run --rm -it -v "$PWD":/app -w /app -p 4200:4200 node:20-bookworm-slim sh -c "npm install && npx ng serve --host 0.0.0.0"
```

Or directly with a local Node 20+:

| Command | What it does |
|---|---|
| `npm start` | Dev server on `http://localhost:4200` |
| `npm run build` | Production bundle into `dist/gestaltbi-core/browser/` |
| `npm run watch` | Development build with file watching |
| `npm test` | Karma + Jasmine |
| `npm run lint` | ESLint (flat config in `eslint.config.js`) |
| `npm run format` | Prettier |

## Deployment

`master` is auto-deployed to GitHub Pages via `.github/workflows/deploy.yml`.

## Architecture

See `CLAUDE.md` for a quick tour of the mode × view registry, the data pipeline, and the common base classes.
