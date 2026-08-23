import { HttpClient } from '@angular/common/http';
import { Injectable, NgZone } from '@angular/core';
import {
  type ColumnDirectory,
  type ExternalFetcher,
  type OpContext,
  type ProcessConfig,
  Processor,
} from '@gestaltbi/stream';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ConfigSourceService } from '../core/config-source.service';
import { DatastructureService } from './../datastructure/datastructure.service';
import { DataService } from './data.service';
import { FilterService } from './filter.service';

/**
 * Angular adapter over `@gestaltbi/stream`'s Processor. Wires
 * DatastructureService as the ColumnDirectory and HttpClient as the
 * external resource fetcher; loads the process graph from
 * `assets/processing.json` at startup.
 */
@Injectable({
  providedIn: 'root',
})
export class ProcessorService {
  private proc: Processor;
  mode: string | undefined;

  /**
   * Resolves once the process graph has been fetched.
   *
   * Views read their configuration synchronously in field initializers
   * (`conf = ds.getProcessInfo('conf_longgraph')`), so they must not be built
   * before `processing.json` is in. ProcessorModule awaits this in an
   * APP_INITIALIZER.
   */
  readonly ready: Promise<void>;
  private markReady: () => void;

  fs: FilterService | undefined;
  ds: DataService | undefined;

  constructor(
    private http: HttpClient, //
    private dss: DatastructureService,
    private cs: ConfigSourceService,
    private zone: NgZone,
  ) {
    // DatastructureService implements ColumnDirectory directly.
    const columnDirectory: ColumnDirectory = this.dss;
    // Relative paths (e.g. "geo/it_p_c.geojson" from processing.json) resolve
    // against the active config source — `assets/` for the bundled config or
    // the jsDelivr base for /gh/<org>/<repo>. Absolute URLs pass through.
    const fetcher: ExternalFetcher = (url) => {
      const isAbsolute = /^(https?:|\/)/.test(url);
      return this.http.get(isAbsolute ? url : this.cs.url(url));
    };

    this.ready = new Promise<void>((resolve) => (this.markReady = resolve));

    this.proc = new Processor({
      columnDirectory,
      fetcher,
      processes: { process: {} },
    });

    // Re-fetch processing.json whenever the config source changes
    // (initial load, /gh/<org>/<repo> switch, etc).
    this.cs.source$
      .pipe(switchMap((base) => this.http.get<ProcessConfig>(base + 'processing.json')))
      .subscribe({
        next: (data) => {
          this.proc.processes = data;
          this.markReady();
        },
        // A missing or malformed processing.json must not wedge startup: the
        // app boots with an empty graph and the views render empty.
        error: () => this.markReady(),
      });
  }

  setFilterService(fs: FilterService) {
    this.fs = fs;
  }
  setDataService(ds: DataService) {
    this.ds = ds;
  }

  setMode(mode: string) {
    this.mode = mode;
    this.proc.setMode(mode);
  }

  get loaded(): boolean {
    return this.proc.loaded;
  }

  get work(): any {
    return this.proc.work;
  }

  get start(): any {
    return this.proc.start;
  }

  get done(): string[] {
    return this.proc.done;
  }

  initializeAggregator(data: any): void {
    this.proc.initializeAggregator(data);
  }

  workOn(dataframe: any): void {
    this.proc.workOn(dataframe);
  }

  clear(): void {
    this.proc.clear();
  }

  getProcesses(): string[] {
    return this.proc.getProcesses();
  }

  /** Whether the loaded graph defines a process by this name. */
  hasProcess(name: string | undefined | null): boolean {
    return !!name && this.getProcesses().indexOf(name) >= 0;
  }

  process(name: string, identifier = 'default'): void {
    this.proc.process(name, identifier);
  }

  getProcessed(processed: string | null = null, identifier = 'default'): Observable<any> {
    return this.inZone(this.proc.getProcessed(processed, identifier));
  }

  /**
   * Re-enter the Angular zone.
   *
   * `@gestaltbi/stream` is deliberately framework-agnostic, and its streams are
   * pumped from callbacks that have left the zone — papaparse's `complete`
   * fires outside it, so `workOn` and every emission it triggers land outside
   * too. A view that assigns such an emission to a field updates the field but
   * never gets a change-detection pass, so it renders its initial empty state
   * forever. Re-entering here, at the one seam between the package and Angular,
   * fixes every consumer at once.
   */
  private inZone<T>(source: Observable<T>): Observable<T> {
    return new Observable<T>((subscriber) =>
      source.subscribe({
        next: (v) => this.zone.run(() => subscriber.next(v)),
        error: (e) => this.zone.run(() => subscriber.error(e)),
        complete: () => this.zone.run(() => subscriber.complete()),
      }),
    );
  }

  clearStreams(): void {
    this.proc.clearStreams();
  }

  getDimensionMembers(dimension: string): any[] {
    return this.proc.getDimensionMembers(dimension);
  }

  liveCube(): any {
    return this.proc.liveCube();
  }

  setFilter(filter: any, identifier = 'default'): void {
    this.proc.setFilter(filter, identifier);
  }

  getFilter(identifier = 'default'): any {
    return this.proc.getFilter(identifier);
  }

  /** Options block of a named process. `{}` when the graph has no such entry. */
  getProcessInfo(name: string): any {
    return this.proc.getProcessInfo(name) ?? {};
  }

  /**
   * Context for ops built outside a process graph — `Deviation` and
   * `GeoDeviation` take one as their last argument.
   */
  opContext(): OpContext {
    return this.proc.context();
  }
}
