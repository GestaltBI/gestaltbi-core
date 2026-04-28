import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  type ColumnDirectory,
  type ExternalFetcher,
  type ProcessConfig,
  Processor,
} from '@gestaltbi/stream';
import { type Observable } from 'rxjs';
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

  fs: FilterService | undefined;
  ds: DataService | undefined;

  constructor(
    private http: HttpClient, //
    private dss: DatastructureService,
    private cs: ConfigSourceService,
  ) {
    const columnDirectory: ColumnDirectory = {
      getColumnsFor: (tag) => this.dss.getColumnsFor(tag),
      getDataStructureFor: (tag) => this.dss.getDataStructureFor(tag),
      getDimensionHierarchies: () => this.dss.getDimensionHierarchies(),
    };
    const fetcher: ExternalFetcher = (url) => this.http.get(url);

    this.proc = new Processor({
      columnDirectory,
      fetcher,
      processes: { process: {} },
    });

    // Re-fetch processing.json whenever the config source changes
    // (initial load, /gh/<org>/<repo> switch, etc).
    this.cs.source$
      .pipe(switchMap((base) => this.http.get<ProcessConfig>(base + 'processing.json')))
      .subscribe((data) => {
        this.proc.processes = data;
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

  process(name: string, identifier = 'default'): void {
    this.proc.process(name, identifier);
  }

  getProcessed(processed: string | null = null, identifier = 'default'): Observable<any> {
    return this.proc.getProcessed(processed, identifier);
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

  getProcessInfo(name: string): any {
    return this.proc.getProcessInfo(name);
  }
}
