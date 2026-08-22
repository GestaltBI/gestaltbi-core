# @gestaltbi/stream

Framework-agnostic streaming data-processing pipeline. Compose named ops over RxJS observables with JSON-defined process graphs.

This package powers the GestaltBI client and is intended for use behind a [rete.js](https://retejs.org/) visual editor for authoring `processing.json` graphs interactively.

## Install

Once published to npm:

```sh
npm install @gestaltbi/stream rxjs olap-cube-js moment
```

In the meantime — direct from git, pinned to a tag:

```sh
npm install GestaltBI/stream#v0.1.0 rxjs olap-cube-js moment
```

The package's `prepare` script runs `tsc` after install, so a fresh `dist/` is built on the consumer's machine.

`rxjs`, `olap-cube-js` and `moment` are peer dependencies — bring your own versions.

## Concepts

- **Op** — a unit of computation, implementing `run(df)` and optionally `getExternal()` (for ops that need to load external resources before running). The built-in ops:

  | op | what it does |
  |---|---|
  | `clear` | drop empty rows |
  | `format` | parse dates and numbers by tag |
  | `globalfilter` / `localfilter` | filter state, shared or per-stream |
  | `enhance` | derived columns from Polish-notation expressions, `cumsum` |
  | `geocode` / `geojsonify` / `regionify` / `heatmap` | spatial |
  | `aggregate` | OLAP roll-up — `sum`, `avg`, `min`, `max`, `median`, `first`, `last`, `concat`, `ratio` |
  | `diffcalc` | period-over-period deltas; a stock's first difference is its flow |
  | `recognize` | revenue recognition — spread an amount across the periods it serves |
  | `cohort` | cohort axis, plus the incomplete-window guard |
  | `assert` | run checks, return verdicts |

- **OpRegistry** — maps op names to op classes for dynamic instantiation. Pre-populated with the eleven built-in ops; extend with your own.
- **Processor** — orchestrates streaming data through a graph of named ops. Holds the input dataframe, an OLAP cube derived from it, identifier-keyed filter state, and one Observable per active stream.
- **ColumnDirectory** — interface the host implements to expose column metadata (which columns are tagged "date", "currency", "geocodable", etc). The Angular adapter wraps a service that loads `assets/structure.json`; `StructureDirectory` in this package is a dependency-free reference implementation over the same document, so the pipeline runs standalone.
- **Check** — a predicate over a processed frame that returns a `Verdict` (`pass` / `fail` / `warn` / `skip`) naming the periods that broke it. See [Validation](#validation).
- **ExternalFetcher** — `(url) => Observable<any>` to let ops like `geocode` load lookup data without depending on a specific HTTP client.

## Usage

```ts
import { Processor, type ColumnDirectory, type ProcessConfig } from '@gestaltbi/stream';
import { firstValueFrom } from 'rxjs';

const columnDirectory: ColumnDirectory = {
  getColumnsFor: (tag) => /* … */,
  getDataStructureFor: (tag) => /* … */,
  getDimensionHierarchies: () => /* … */,
};

const processes: ProcessConfig = JSON.parse(/* read processing.json */);

const proc = new Processor({ columnDirectory, processes });
proc.workOn({ data: rows });

const result$ = proc.getProcessed('clean_and_aggregate');
const rows = await firstValueFrom(result$);
```

## Tags

Ops never hard-code column names — they ask the directory for columns carrying a tag. Alongside the existing `uatu:dimension` / `uatu:measure` / `uatu:dimension:time` / `uatu:dimension:geo` / `uatu:aggregable` vocabulary:

| tag | meaning |
|---|---|
| `uatu:measure:flow` | produced by a period; sums across periods |
| `uatu:measure:stock` | a level measured at a point; summing it is meaningless |
| `uatu:measure:ratio` | carries `numerator` / `denominator` so it can be re-aggregated correctly |
| `uatu:measure:basis:cash` / `:accrual` | which accounting basis a money column is on |
| `uatu:measure:of:<code>` | links measures describing the same underlying quantity |
| `uatu:measure:unit:<unit>` | stops `covers` comparing terabytes against dollars |
| `uatu:dimension:cohort` | a cohort bucket |

All additive: untagged numeric columns keep behaving exactly as before.

## Validation

`assert` is normally a terminal node: it returns `Verdict[]` instead of rows, so a host can render pass/fail cards beside the charts and re-run them on every refresh.

```json
{ "op": "assert", "require": ["margins"], "options": { "orderBy": "month", "checks": [
  { "id": "gross-margin-positive", "type": "sign", "measure": "margin_accrual", "expect": ">0" },
  { "id": "storage-is-a-ratchet", "type": "monotonic", "measure": "s3_tib" }
] } }
```

| check | asks |
|---|---|
| `monotonic` | does this series ever go backwards? (`direction`, `strict`) |
| `sign` | is it positive/negative in `atLeast` N of M periods? |
| `covers` | is A ≥ B every period? (refuses mismatched units) |
| `divergence` | have two measures of one quantity drifted past `warn` / `fail`? |
| `window_complete` | is any cohort younger than its own measurement window? |
| `ratio_bounds` | does a rate leave `[min, max]`? |

`window_complete` measures from the **end** of the cohort bucket when you pass `span`: someone who signed up on 31 October has been observed for six days on 6 November, not thirty-six. Without that guard a half-observed cohort reports a perfect retention rate.

Checks are plain data — `runCheck` / `runChecks` are exported if you'd rather call them outside a graph.

## Process graph

`processing.json` describes a DAG of named processes:

```json
{
  "process": {
    "format": {
      "op": "format",
      "options": { "dateTag": "uatu:date", "dateFormat": "DD/MM/YYYY" }
    },
    "clean_dates": {
      "op": "clear",
      "require": ["format"]
    }
  }
}
```

`require` declares an upstream dependency. The processor walks the graph depth-first.

## The Everpix fixture

An end-to-end fixture built from [everpix/Everpix-Intelligence](https://github.com/everpix/Everpix-Intelligence), the dataset the Everpix team published when the company shut down in 2013. It is a good test subject because it publishes both sides of the recognition question: monthly cash sales *and* the accrual series derived from them.

```sh
EVERPIX_DIR=/path/to/Everpix-Intelligence npm run fixture:everpix
npm run demo:everpix
```

The dataset carries no explicit license grant, so it is read from your own checkout rather than vendored here; `fixtures/everpix/generated/` is gitignored and the Everpix tests skip when it is absent.

`recognize` reproduces Everpix's published accrual series from cash alone, straight-line over a twelve-month term, to floating-point precision — that check passing is what validates the op. The rest of the suite is *expected* to fail: it encodes what a healthy subscription business looks like, and Everpix was not one. Recognized revenue never covered AWS in any of the thirteen measured months, storage never once fell, and the cash and accrual bases disagree by 188% at their worst.

## Development

```sh
npm install          # peer deps double as the test toolchain
npm run build        # tsc -> dist/
npm test             # builds, then runs the node:test suite
```

Requires Node ≥ 20.19. Tests run against the built `dist/`, so `npm test` builds first.

## Status

Extracted from the [`gestaltbi-core`](https://github.com/GestaltBI/gestaltbi-core) client at v0.1.0 — this repo is now the canonical home and gestaltbi-core consumes it as a remote dependency. Behavior preserved verbatim from the in-tree predecessor, plus a couple of latent fixes (`Math.max([1,2])` → `Math.max(1,2)` in `aggregate`'s finalize). API will likely settle as the rete.js editor and the dbt-driven `structure.json` generator land.

Since v0.1.0, additive: the `recognize` / `cohort` / `assert` ops, a real `diffcalc` (it was an empty stub), `ratio` aggregation, the check library, `StructureDirectory`, and a test suite. Two latent bugs fixed:

- `aggregate`'s `median` took the middle of an unsorted, scan-order array.
- `Processor.initializeAggregator` let a malformed dimension hierarchy throw out of `workOn`, taking down graphs that never touch the cube. It now records `cubeError` and leaves `liveCube()` to raise.

Ops now resolve the time column through `resolveTimeColumn`, which accepts **both** tag vocabularies in circulation: config repos authored for `gestaltbi-core` (see [`GestaltBI/sample-config`](https://github.com/GestaltBI/sample-config)) rename the date column to the canonical code `uatu:date` via `mapping.json` and tag it `uatu:timedimension`, while `@gestaltbi/infer` emits `uatu:dimension` / `uatu:dimension:time`. `enhance`'s `cumsum` previously read the literal `'uatu:date'` key, which is correct for the former and silently a no-op for the latter; it now handles both, and falls back to the literal key when no structure is loaded. Reconciling the two vocabularies at the `infer` end is still open.

`enhance` also gained an opt-in `nullSafe` option. By default a missing operand still reads as the arithmetic identity, so `revenue - null` returns `revenue` — a missing cost looks like a healthy margin. `nullSafe: true` propagates `null` instead. The default is unchanged.

**Known issue, not fixed here:** `Processor.process()` never pushes to `this.done`, so the `if (this.done.indexOf(req) < 0)` guard is dead and required processes are re-applied on every path that reaches them. Linear chains are unaffected; a diamond-shaped graph will apply the shared ancestor twice, and since ops mutate rows in place that double-counts. The one-line fix changes evaluation semantics for existing `gestaltbi-core` graphs, so it wants a decision rather than a drive-by patch.

## License

MIT
