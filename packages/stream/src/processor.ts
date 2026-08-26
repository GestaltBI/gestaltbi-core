// @ts-ignore — olap-cube-js ships no types
import Cube from 'olap-cube-js';
import { BehaviorSubject, combineLatest, type Observable, of, Subject } from 'rxjs';
import { map, shareReplay, tap } from 'rxjs/operators';

import type { ColumnDirectory } from './column-directory.js';
import type { ExternalFetcher, OpContext } from './op.js';
import { OpRegistry } from './op-registry.js';
import { Aggregate } from './ops/aggregate.js';
import { Assert } from './ops/assert.js';
import { ClearEmpty } from './ops/clear-empty.js';
import { Cohort } from './ops/cohort.js';
import { Correlate } from './ops/correlate.js';
import { DiffCalc } from './ops/diff-calc.js';
import { Enhance } from './ops/enhance.js';
import { Format } from './ops/format.js';
import { Geocode } from './ops/geocode.js';
import { Geojsonify } from './ops/geojsonify.js';
import { GlobalFilter } from './ops/global-filter.js';
import { Heatmap } from './ops/heatmap.js';
import { Join } from './ops/join.js';
import { LocalFilter } from './ops/local-filter.js';
import { Pivot } from './ops/pivot.js';
import { Recognize } from './ops/recognize.js';
import { Regionify } from './ops/regionify.js';
import { Union } from './ops/union.js';

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

/**
 * Everything a {@link Processor} needs to run a graph.
 */
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
  r.register('pivot', Pivot);
  r.register('correlate', Correlate);
  r.register('join', Join);
  r.register('union', Union);
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

  /**
   * One observable per (identifier, process), so a node that several others
   * read is built once and run once.
   *
   * This is what makes the graph a graph. Without it, two processes requiring
   * the same upstream would each rebuild — and re-execute — everything above
   * them.
   */
  private streams = new Map<string, Observable<any>>();

  /**
   * The raw frame each identifier reads from, before any process touches it.
   *
   * Kept apart from `localFilterObs`, which holds what that identifier's
   * consumer subscribes to — the resolved leaf. Reading the root from there
   * would make the second process built for an identifier treat the first
   * one's output as the source.
   */
  private roots = new Map<string, Observable<any>>();

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
    this.work = this.start;
  }

  /**
   * Which streams are currently built, as `identifier::process`.
   *
   * The live shape of the graph rather than its declared shape — useful for a
   * debug view, and for an editor that wants to show what a given view actually
   * caused to run.
   */
  resolvedStreams(): string[] {
    return [...this.streams.keys()].map((k) => k.replace('\u0000', '::')).sort();
  }

  getProcesses(): string[] {
    return Object.keys(this.processes.process);
  }

  /**
   * Build (or reuse) the stream for one process, and leave it where this
   * identifier's consumer will find it.
   */
  process(name: string, identifier = 'default'): void {
    const obs = this.resolve(name, identifier, []);
    if (obs) this.localFilterObs.set(identifier, obs);
  }

  /**
   * The observable for one process, built from the processes it names.
   *
   * `require` is a dataflow edge: a process reads the output of what it
   * requires, and nothing else. Fan-out is free — a stage several others read
   * is memoised, so it is built once and, thanks to `shareReplay`, runs once
   * per emission however many consumers it has.
   *
   * `path` carries the chain currently being resolved so a cycle is reported
   * by name instead of overflowing the stack.
   */
  private resolve(name: string, identifier: string, path: string[]): Observable<any> | undefined {
    if (!name) return undefined;

    const key = `${identifier}\u0000${name}`;
    const memo = this.streams.get(key);
    if (memo) return memo;

    if (path.includes(name)) {
      throw new Error(`process graph has a cycle: ${[...path, name].join(' -> ')}`);
    }

    const spec = this.processes?.process[name];
    if (!spec) return undefined;

    // Options are handed to the op, so the identifier has to reach it — but
    // writing it onto the shared spec would leak one stream's identifier into
    // every other stream reading the same process.
    const processOpts = { ...(spec.options ?? {}), identifier };

    const inst = spec.op ? this.registry.instantiate(spec.op, processOpts, this.opContext()) : null;
    // No op — a `conf_*` settings carrier. It contributes nothing to the graph;
    // whatever required it reads straight through to what it required.
    if (!inst) return this.upstreams(spec, identifier, path, name)[0];

    const inputs = this.upstreams(spec, identifier, path, name);
    if (!inputs.length) return undefined;

    // Better to say so than to compute a branch and drop it on the floor.
    const accepts = inst.inputs ?? 1;
    if (inputs.length > accepts) {
      throw new Error(
        `process "${name}" wires ${inputs.length} inputs into op "${spec.op}", which reads ${accepts}`,
      );
    }

    const built = combineLatest([...inputs, inst.getExternal()]).pipe(
      map((values) => {
        const externals = values[values.length - 1];
        const frames = values.slice(0, -1);
        // `runAll` is how an op opts into more than one input. Everything else
        // keeps the original contract exactly: df[0] rows, df[1] externals.
        return inst.runAll ? inst.runAll(frames, externals) : inst.run([frames[0], externals]);
      }),
      // Without this a diamond re-runs its shared upstream once per branch.
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.streams.set(key, built);
    return built;
  }

  /** What a process reads: the processes it requires, or the raw frame. */
  private upstreams(
    spec: ProcessSpec,
    identifier: string,
    path: string[],
    name: string,
  ): Observable<any>[] {
    const required = spec.require ?? [];
    if (!required.length) {
      const root = this.roots.get(identifier);
      return root ? [root] : [];
    }
    return required
      .map((req) => this.resolve(req, identifier, [...path, name]))
      .filter((o): o is Observable<any> => !!o);
  }

  getProcessed(processed: string | null = null, identifier = 'default'): Observable<any> {
    let bs: Subject<any> = new Subject<any>();
    if (this.start) {
      bs = new BehaviorSubject<any>(this.start.data);
    }
    const root = bs.asObservable();
    this.localFilterSub.set(identifier, bs);
    this.roots.set(identifier, root);
    this.localFilterObs.set(identifier, root);
    this.localFilterSet.set(identifier, {});
    this.localFilterSet.set('default', {});
    // Everything memoised for this identifier was built on the previous root.
    this.invalidate(identifier);
    if (processed) this.process(processed, identifier);
    return this.localFilterObs.get(identifier)!;
  }

  /** Drop the memoised streams for one identifier. */
  private invalidate(identifier: string): void {
    const prefix = `${identifier}\u0000`;
    for (const key of [...this.streams.keys()]) {
      if (key.startsWith(prefix)) this.streams.delete(key);
    }
  }

  clearStreams(): void {
    this.localFilterSub.clear();
    this.localFilterObs.clear();
    this.localFilterSet.clear();
    this.roots.clear();
    this.streams.clear();
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
