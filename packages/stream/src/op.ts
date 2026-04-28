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

export interface Op {
  /** Run the op synchronously over `df`, where `df[0]` is upstream data and `df[1]+` are external resources. */
  run(df: any): any;

  /** Return any external resources the op needs combined with upstream data before `run`. */
  getExternal(): Observable<any>;

  /** Optional: replace runtime options (used by the registry on instantiation). */
  setOptions?(options: any): void;
}

export abstract class AbstractOp implements Op {
  protected options: any;
  protected ctx: OpContext;

  constructor(opts: any, ctx: OpContext) {
    this.options = opts;
    this.ctx = ctx;
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
}
