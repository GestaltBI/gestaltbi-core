# @gestaltbi/stream

Framework-agnostic streaming data-processing pipeline. Compose named ops over RxJS observables with JSON-defined process graphs.

This package powers the GestaltBI client and is intended for use behind a [rete.js](https://retejs.org/) visual editor for authoring `processing.json` graphs interactively.

## Install

```sh
npm install @gestaltbi/stream rxjs olap-cube-js moment
```

`rxjs`, `olap-cube-js` and `moment` are peer dependencies — bring your own versions.

## Concepts

- **Op** — a unit of computation, implementing `run(df)` and optionally `getExternal()` (for ops that need to load external resources before running). Eleven built-in ops cover the common cases: `clear`, `format`, `globalfilter`, `localfilter`, `enhance`, `geocode`, `geojsonify`, `diffcalc`, `heatmap`, `regionify`, `aggregate`.
- **OpRegistry** — maps op names to op classes for dynamic instantiation. Pre-populated with the eleven built-in ops; extend with your own.
- **Processor** — orchestrates streaming data through a graph of named ops. Holds the input dataframe, an OLAP cube derived from it, identifier-keyed filter state, and one Observable per active stream.
- **ColumnDirectory** — interface the host implements to expose column metadata (which columns are tagged "date", "currency", "geocodable", etc). The Angular adapter wraps a service that loads `assets/structure.json`.
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

## Status

Extracted from the GestaltBI client at v0.1.0. Behavior preserved verbatim, plus a couple of latent fixes (`Math.max([1,2])` → `Math.max(1,2)` in `aggregate`'s finalize). API will likely settle as the rete.js editor and the dbt-driven `structure.json` generator land.

## License

MIT
