// @ts-ignore — olap-cube-js ships no types
import Cube from 'olap-cube-js';
import { BehaviorSubject, combineLatest, type Observable, of, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import type { ColumnDirectory } from './column-directory.js';
import type { ExternalFetcher, OpContext } from './op.js';
import { OpRegistry } from './op-registry.js';
import { Aggregate } from './ops/aggregate.js';
import { Assert } from './ops/assert.js';
import { ClearEmpty } from './ops/clear-empty.js';
import { Cohort } from './ops/cohort.js';
import { DiffCalc } from './ops/diff-calc.js';
import { Enhance } from './ops/enhance.js';
import { Format } from './ops/format.js';
import { Geocode } from './ops/geocode.js';
import { Geojsonify } from './ops/geojsonify.js';
import { GlobalFilter } from './ops/global-filter.js';
import { Heatmap } from './ops/heatmap.js';
import { LocalFilter } from './ops/local-filter.js';
import { Recognize } from './ops/recognize.js';
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
 * Build a registry pre-populated with the built-in ops under the canonical
 * names referenced in `processing.json`.
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
  r.register('recognize', Recognize);
  r.register('cohort', Cohort);
  r.register('assert', Assert);
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
  /** Set when {@link initializeAggregator} could not build a cube. */
  cubeError: Error | undefined;

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
    try {
      const h = this.columnDirectory.getDimensionHierarchies();
      this.cube = new Cube(h);
      this.cube.addFacts(data);
    } catch (err) {
      // A structure with no usable dimension hierarchy is a cube problem, not a
      // pipeline problem: ops that never call `liveCube()` still run.
      this.cube = undefined;
      this.cubeError = err as Error;
    }
  }

  workOn(dataframe: any): void {
    this.start = dataframe;
    this.work = dataframe;
    this.workObs = of(this.work.data);
    this.initializeAggregator(dataframe.data);
    this.done = [];
    // A consumer that called `getProcessed` before the data landed is holding a
    // plain Subject with nothing in it. Without this push it stays silent for
    // good and the view never renders. Re-importing a file has to reach the
    // views already on screen for the same reason.
    this.pushToStreams();
  }

  /** Re-push the current input frame through every live stream. */
  private pushToStreams(identifier?: string): void {
    if (!this.start) return;
    if (identifier !== undefined) {
      this.localFilterSub.get(identifier)?.next(this.start.data);
      return;
    }
    for (const sub of this.localFilterSub.values()) {
      sub.next(this.start.data);
    }
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
    if (!this.cube) throw this.cubeError ?? new Error('no OLAP cube: the structure declared no dimension hierarchy');
    return this.cube.dice().getCells();
  }

  setFilter(filter: any, identifier = 'default'): void {
    const ff = this.localFilterSet.get(identifier) || {};
    this.deepAssign(ff, filter);
    this.localFilterSet.set(identifier, ff);
    // The 'default' identifier is the global filter: it re-runs every stream.
    this.pushToStreams(identifier === 'default' ? undefined : identifier);
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

  /**
   * The context ops are constructed with. Exposed so a host can build an op —
   * or a `Deviation` / `GeoDeviation` — outside a process graph and still give
   * it the column directory and fetcher the graph-run ops get.
   */
  context(): OpContext {
    return this.opContext();
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
