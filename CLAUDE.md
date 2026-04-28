# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack & commands

Angular 9.1 CLI app (TypeScript 3.8). Pinned to legacy toolchain — TSLint (not ESLint), Karma/Jasmine, Protractor.

- `npm start` / `ng serve` — dev server on `http://localhost:4200`
- `npm run build` — production build via `ng build` (output: `dist/smartbi-client`)
- `npm test` / `ng test` — Karma + Jasmine. Single test: `ng test --include='**/foo.component.spec.ts'`
- `npm run lint` / `ng lint` — TSLint over `tsconfig.app.json`, `tsconfig.spec.json`, `e2e/tsconfig.json`
- `npm run e2e` — Protractor end-to-end
- `npm run format` — Prettier across `src/**/*.{ts,html,scss,json}`. Husky pre-commit runs `pretty-quick --staged` then `ng lint`.

Prettier is set to `printWidth: 120`, `singleQuote: true`, `trailingComma: 'all'`. TSLint enforces component selector prefix `sbi` (kebab-case for components, camelCase for directives) and `member-ordering: static-field, instance-field, static-method, instance-method`.

Docker build: multi-stage `node:14.4.0-alpine3.10` → `nginx:1.19.0-alpine`, serving the built bundle from `/usr/share/nginx/html`.

## Architecture: mode × view dispatch

The product is a BI/visualization client with an Italian-first UI (`defaultLanguage: 'it'`, `MAT_DATE_LOCALE: 'it-IT'`). Top-level routes (`app-routing.module.ts`): `/auth`, `/data/:mode/:vis`, `/intro`, `/debug`. The interesting one is `/data/:mode/:vis`, which is the entire analysis surface.

The central pattern is a **two-axis registry** that decides what to render:

- **mode** (analysis kind): `long`, `longdiff`, `longchange`, `sync`, `syncdiff`, `syncchange`, `point`
- **vis** (visualization surface): `map`, `graph`, `table`

`MainComponent` (`smartbi/main/`) reads `:mode/:vis` from the route, asks `RegistryService` (`sbi-registry/registry.service.ts`) for the matching `ComponentType`, and instantiates it into a CDK `ComponentPortal`. If no component is registered for a `(mode, view)` pair, `EmptyComponent` is returned.

Each visualization feature module registers itself in its **module constructor**:

```ts
// e.g. map/map.module.ts, graph/graph.module.ts, table/table.module.ts
constructor(private reg: RegistryService) {
  this.reg.registerComponent('long', 'map', LongComponent);
  this.reg.registerComponent('sync', 'map', SyncComponent);
  // ...
}
```

Adding a new mode/view combination means: (1) create the component in the appropriate vis module's directory, (2) declare it in the module, (3) call `reg.registerComponent(mode, vis, Component)` in the module constructor, and (4) usually also register a filter component in `FilterModule`'s constructor (same `(mode, view, scope)` keying via `FilterRegistryService`).

## Architecture: data pipeline

Data flows through three cooperating services. The flow is asset-driven: column structure, processes, and column-name mapping are all loaded from JSON in `src/assets/` at runtime.

1. **`ImporterService`** (`importer/importer.service.ts`) — parses CSV via `ngx-papaparse`, applies a column rename mapping from `assets/mapping.json`, emits `dataLoaded`. On first load `MainComponent` falls back to `assets/mocks/data.csv`.

2. **`DatastructureService`** (`datastructure/datastructure.service.ts`) — loads `assets/structure.json` (column metadata + tags) and `assets/it.json` (translations). Columns are organized by **tags** (e.g. `uatu:dimension`, `uatu:dimension:geo`, `gcx:street`, `gcx:city`, `gcx:region`, `gcx:country`). `getColumnsFor(tag)` is the primary lookup. `getDimensionHierarchies()` builds the OLAP cube hierarchy (geo → address → city → postcode → region → country) consumed by `olap-cube-js`.

3. **`ProcessorService`** (`processor/processor.service.ts`) — runs named processes defined in `assets/processing.json`. Each process names an **op** key (registered in `ProcessorModule`'s constructor: `clear`, `format`, `globalfilter`, `localfilter`, `enhance`, `geocode`, `geojsonify`, `diffcalc`, `heatmap`, `regionify`, `aggregate`) and may declare `require` dependencies that run first. Ops implement the `Op` interface (`processor/op.ts`); `OpRegistryService` constructs them with options + injector. Each processed stream is keyed by an `identifier` string (default `'default'`) — multiple components on the page can each subscribe to their own pipeline by passing a unique identifier to `DataService.getProcessed(phase, identifier)`.

`ProcessorService.process()` builds an RxJS chain: `combineLatest([upstreamFilterObs, op.getExternal()]) → map(data => op.run(data))`. Results live in `localFilterObs` keyed by identifier. `setFilter(filter, identifier)` re-pushes raw data through that identifier's chain (or all chains if `identifier === 'default'`).

`ProcessorService` also maintains an `olap-cube-js` `Cube` built from the dimension hierarchy, exposed via `liveCube()`.

## Common base classes

Visualization components typically extend one of:

- `BaseComponent` (`shared/base-component.ts`) — pulls `DataService`, `ProcessorService`, `DatastructureService`, `LoggerService` from the injector. `ngOnDestroy` calls `ps.clearStreams()`, so child components never need to do it themselves.
- `BaseComponentWithLegend` (`legend/base-component-with-legend.ts`) — adds `selectedMeasure: Measure` for legend-enabled views.
- `GraphBaseComponent` (`graph/graph-base-component.ts`) — for ECharts views.
- `BaseMapComponent` (`timedmap/base-map/`) — for Mapbox-backed map views.

When adding a new visualization, prefer extending these rather than wiring services directly.

## Key third-party libraries

- **ECharts** via `ngx-echarts` — graphs (`graph/` module wires `NgxEchartsModule.forRoot({ echarts })`)
- **Mapbox GL** — maps; access token in `src/environments/environment.ts`
- **ag-Grid Community** — tables
- **olap-cube-js** — the OLAP cube backing aggregation
- **ngx-papaparse** — CSV import
- **@ngx-translate/core** — i18n, loading from `assets/i18n/{lang}.json`

## Conventions

- Component selectors use the `sbi-` prefix (e.g. `sbi-main`, `sbi-filter`).
- Imports are auto-sorted via `prettier-plugin-import-sort` using the `module` style (configured in `.importsortrc`).
- The repo's lazy-loaded feature modules each own their submodules (e.g. `SmartbiModule` imports `MapModule`, `GraphModule`, `TableModule`, `FilterModule`, `TimedmapModule`, `ImporterModule`, `ShellModule`).
- `ProcessorModule` and registry-style modules do their wiring in the **module constructor**, not in `providers`. When adding a new op, filter, or visualization, register it there.
