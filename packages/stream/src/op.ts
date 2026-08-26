import { Observable, of } from 'rxjs';

import type { ColumnDirectory } from './column-directory.js';

/**
 * External resource fetcher. Ops that need to load files (e.g. geocoding
 * GeoJSON) request them through this. The Angular adapter wraps
 * `HttpClient`; in Node you'd pass a function backed by `fetch` or `axios`.
 */
export type ExternalFetcher = (url: string) => Observable<any>;

/**
 * Context handed to every op at construction. Held on `AbstractOp` so
 * subclasses can access the column directory, fetch external resources,
 * and ask the host pipeline for filter state.
 */
export interface OpContext {
  columnDirectory: ColumnDirectory;
  fetcher: ExternalFetcher;
  getFilter: (identifier?: string) => any;
}

/**
 * The contract an op implements: run over a frame, and say what it needs
 * loaded first.
 */
export interface Op {
  /** Run the op synchronously over `df`, where `df[0]` is upstream data and `df[1]+` are external resources. */
  run(df: any): any;

  /**
   * Run over every input, for an op that reads more than one process.
   *
   * Optional, and the reason the single-input contract never had to change:
   * an op that does not implement it is called through `run` with its first
   * input exactly as before. An op that does — a join, a union — receives the
   * frames in the order its `require` array named them.
   */
  runAll?(inputs: any[], externals: any): any;

  /**
   * How many processes this op reads. One unless it combines frames.
   *
   * Declared rather than inferred so it can be checked before anything runs —
   * a graph that wires two inputs into an op that reads one is a mistake worth
   * a message, not a silently discarded branch. A visual editor reads the same
   * number to know how many input sockets to draw.
   */
  readonly inputs?: number;

  /** Return any external resources the op needs combined with upstream data before `run`. */
  getExternal(): Observable<any>;

  /** Optional: replace runtime options (used by the registry on instantiation). */
  setOptions?(options: any): void;
}

/** Column directory that knows nothing — see {@link DETACHED_CONTEXT}. */
const NO_COLUMNS: ColumnDirectory = {
  getColumnsFor: () => [],
  getDataStructureFor: () => ({ columns: [] }),
  getDimensionHierarchies: () => ({ dimensionHierarchies: [] }),
};

/**
 * Context for an op constructed outside a process graph.
 *
 * `Deviation` and `GeoDeviation` take an optional context and build `Enhance` /
 * `Geojsonify` from it, so a host that has no context to give must still get an
 * op that runs rather than one that throws on first property access. Ops that
 * genuinely need a directory degrade to "no columns carry that tag", which the
 * resolvers already treat as "fall back to inspecting the rows".
 */
const DETACHED_CONTEXT: OpContext = {
  columnDirectory: NO_COLUMNS,
  fetcher: () => of({}),
  getFilter: () => ({}),
};

/**
 * Base class for every op.
 *
 * Holds the options and the context, and passes the frame straight through
 * until a subclass overrides `run`. Constructed without a context it falls
 * back to one that knows no columns, so an op built outside a process graph
 * runs rather than throwing on first access.
 */
export abstract class AbstractOp implements Op {
  /** See {@link Op.inputs}. Raised by ops that combine frames. */
  public readonly inputs: number = 1;

  protected options: any;
  protected ctx: OpContext;

  constructor(opts: any, ctx?: OpContext) {
    this.options = opts;
    this.ctx = ctx ?? DETACHED_CONTEXT;
  }

  /** Convenience accessor preserved for ops that referenced `this.dss`. */
  protected get columnDirectory(): ColumnDirectory {
    return this.ctx.columnDirectory;
  }

  public getExternal(): Observable<any> {
    return of({});
  }

  public setOptions(options: any) {
    this.options = options;
  }

  public run(df: any): any {
    return df[0];
  }

  /**
   * Default multi-input behaviour: read the first input, ignore the rest.
   *
   * Which is what an op written against the single-input contract means. An op
   * that genuinely combines inputs overrides this instead of `run`.
   */
  public runAll(inputs: any[], externals: any): any {
    return this.run([inputs[0], externals]);
  }
}
