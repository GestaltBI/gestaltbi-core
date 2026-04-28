// @ts-ignore — olap-cube-js ships no types
import Cube from 'olap-cube-js';
import { BehaviorSubject, combineLatest, type Observable, of, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import type { ColumnDirectory } from './column-directory.js';
import type { ExternalFetcher, OpContext } from './op.js';
import { OpRegistry } from './op-registry.js';
import { Aggregate } from './ops/aggregate.js';
import { ClearEmpty } from './ops/clear-empty.js';
import { DiffCalc } from './ops/diff-calc.js';
import { Enhance } from './ops/enhance.js';
import { Format } from './ops/format.js';
import { Geocode } from './ops/geocode.js';
import { Geojsonify } from './ops/geojsonify.js';
import { GlobalFilter } from './ops/global-filter.js';
import { Heatmap } from './ops/heatmap.js';
import { LocalFilter } from './ops/local-filter.js';
import { Regionify } from './ops/regionify.js';

/** A single named transformation step in a process graph. */
export interface ProcessSpec {
  /** Op key registered in the OpRegistry. */
  op?: string;
  /** Process names that must be wired upstream of this one. */
  require?: string[];
  /** Op-specific configuration; merged with `{identifier}` at runtime. */
  options?: any;
}

/** The shape of `processing.json`: a map of process names to specs. */
export interface ProcessConfig {
  process: Record<string, ProcessSpec>;
}

export interface ProcessorOptions {
  /** Column metadata source. */
  columnDirectory: ColumnDirectory;
  /** Process graph (e.g. parsed from `processing.json`). */
  processes: ProcessConfig;
  /** External resource fetcher (defaults to no-op so non-fetching ops still work). */
  fetcher?: ExternalFetcher;
  /** Pre-built op registry. If omitted, a default with the eleven built-in ops is used. */
  registry?: OpRegistry;
}

/**
 * Build a registry pre-populated with the eleven built-in ops under the
 * canonical names referenced in `processing.json`.
 */
export function buildDefaultRegistry(): OpRegistry {
  const r = new OpRegistry();
  r.register('clear', ClearEmpty);
  r.register('format', Format);
  r.register('globalfilter', GlobalFilter);
  r.register('localfilter', LocalFilter);
  r.register('enhance', Enhance);
  r.register('geocode', Geocode);
  r.register('geojsonify', Geojsonify);
  r.register('diffcalc', DiffCalc);
  r.register('heatmap', Heatmap);
  r.register('regionify', Regionify);
  r.register('aggregate', Aggregate);
  return r;
}

/**
 * Orchestrates streaming data through a graph of named ops.
 *
 * Held data:
 *   - `start`: the immutable input dataframe (after `workOn`)
 *   - `work`:  the current "live" dataframe (mutated in place by ops)
 *   - one OLAP `Cube` materialized from the dimension hierarchy
 *
 * Streams are keyed by an `identifier` string. Multiple consumers can
 * subscribe to independent processed streams concurrently.
 */
export class Processor {
  processes: ProcessConfig;
  start: any;
  work: any;
  mode: string | undefined;

  cube: any;

  workObs: Observable<any> | undefined;

  done: string[] = [];

  private localFilterSet = new Map<string, any>();
  localFilterObs = new Map<string, Observable<any>>();
  localFilterSub = new Map<string, Subject<any>>();

  private columnDirectory: ColumnDirectory;
  private fetcher: ExternalFetcher;
  private registry: OpRegistry;

  constructor(opts: ProcessorOptions) {
    this.columnDirectory = opts.columnDirectory;
    this.processes = opts.processes;
    this.fetcher = opts.fetcher ?? ((_url: string) => of(null));
    this.registry = opts.registry ?? buildDefaultRegistry();
  }

  get loaded(): boolean {
    return this.start !== undefined;
  }

  setMode(mode: string): void {
    this.mode = mode;
  }

  initializeAggregator(data: any): void {
    const h = this.columnDirectory.getDimensionHierarchies();
    this.cube = new Cube(h);
    this.cube.addFacts(data);
  }

  workOn(dataframe: any): void {
    this.start = dataframe;
    this.work = dataframe;
    this.workObs = of(this.work.data);
    this.initializeAggregator(dataframe.data);
    this.done = [];
  }

  clear(): void {
    this.done = [];
    this.work = this.start;
  }

  getProcesses(): string[] {
    return Object.keys(this.processes.process);
  }

  process(name: string, identifier = 'default'): void {
    const spec = this.processes?.process[name];
    if (spec?.require) {
      spec.require.forEach((req) => {
        if (this.done.indexOf(req) < 0) {
          this.process(req, identifier);
        }
      });
    }
    const obs = this.doProcess(name, identifier);
    if (obs) this.localFilterObs.set(identifier, obs);
  }

  private doProcess(name: string, identifier = 'default'): Observable<any> | undefined {
    if (!name) return undefined;

    const spec = this.processes?.process[name];
    if (!spec) return undefined;

    let processOpts = spec.options;
    if (processOpts) {
      processOpts.identifier = identifier;
    } else {
      processOpts = { identifier };
    }

    const inst = spec.op ? this.registry.instantiate(spec.op, processOpts, this.opContext()) : null;
    if (!inst) return undefined;

    const upstream = this.localFilterObs.get(identifier);
    if (!upstream) return undefined;

    return combineLatest([upstream, inst.getExternal()]).pipe(map((data) => inst.run(data)));
  }

  getProcessed(processed: string | null = null, identifier = 'default'): Observable<any> {
    let bs: Subject<any> = new Subject<any>();
    if (this.start) {
      bs = new BehaviorSubject<any>(this.start.data);
    }
    this.localFilterSub.set(identifier, bs);
    this.localFilterObs.set(identifier, bs.asObservable());
    this.localFilterSet.set(identifier, {});
    this.localFilterSet.set('default', {});
    if (processed) this.process(processed, identifier);
    return this.localFilterObs.get(identifier)!;
  }

  clearStreams(): void {
    this.localFilterSub.clear();
    this.localFilterObs.clear();
    this.localFilterSet.clear();
  }

  getDimensionMembers(dimension: string): any[] {
    if (!this.start) return [];
    return [...new Set(this.start.data.map((x: any) => x[dimension]))];
  }

  liveCube(): any {
    return this.cube.dice().getCells();
  }

  setFilter(filter: any, identifier = 'default'): void {
    const ff = this.localFilterSet.get(identifier) || {};
    this.deepAssign(ff, filter);
    this.localFilterSet.set(identifier, ff);
    if (identifier !== 'default') {
      this.localFilterSub.get(identifier)?.next(this.start.data);
    } else {
      for (const k of this.localFilterSub.keys()) {
        this.localFilterSub.get(k)?.next(this.start.data);
      }
    }
  }

  getFilter(identifier = 'default'): any {
    return this.localFilterSet.get(identifier);
  }

  private deepAssign(target: any, sources: any): any {
    for (const k of Object.keys(sources)) {
      target[k] = sources[k];
    }
    return target;
  }

  getProcessInfo(name: string): any {
    return this.processes?.process[name]?.options;
  }

  /** Construct the context handed to each op at instantiation time. */
  private opContext(): OpContext {
    return {
      columnDirectory: this.columnDirectory,
      fetcher: this.fetcher,
      getFilter: (id?: string) => this.getFilter(id),
    };
  }
}
