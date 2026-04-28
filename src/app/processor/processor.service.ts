import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Cube from 'olap-cube-js';
import { BehaviorSubject, Observable, ReplaySubject, Subject, combineLatest, forkJoin, interval } from 'rxjs';
import { of } from 'rxjs';
import { map, tap, timeout } from 'rxjs/operators';

import { DatastructureService } from './../datastructure/datastructure.service';
import { DataService } from './data.service';
import { FilterService } from './filter.service';
import { OpRegistryService } from './op.registry.service';

@Injectable({
  providedIn: 'root',
})
export class ProcessorService {
  processes: any;
  start: any;
  work: any;

  mode: string;

  cube: Cube;

  workObs: Observable<any>;

  done = [];
  private localFilterSet: Map<string, any> = new Map<string, any>();

  localFilterObs: Map<string, Observable<any>> = new Map<string, Observable<any>>();
  localFilterSub: Map<string, Subject<any>> = new Map<string, Subject<any>>();

  fs: FilterService;
  ds: DataService;

  constructor(
    private http: HttpClient, //
    private ops: OpRegistryService,
    private dss: DatastructureService,
  ) {
    this.http.get('assets/processing.json').subscribe((data) => {
      this.processes = data;
    });
  }

  get loaded() {
    return this.start !== undefined;
  }

  setFilterService(fs: FilterService) {
    this.fs = fs;
  }

  setDataService(ds: DataService) {
    this.ds = ds;
  }

  setMode(mode: string) {
    this.mode = mode;
  }

  initializeAggregator(data: any) {
    const h = this.dss.getDimensionHierarchies();
    console.log(h);
    console.log(data);
    this.cube = new Cube(h);
    this.cube.addFacts(data);
  }

  workOn(dataframe: any) {
    this.start = dataframe;
    this.work = dataframe;
    this.workObs = of(this.work.data);
    this.initializeAggregator(dataframe.data);
    this.done = [];
  }

  clear() {
    this.done = [];
    this.work = this.start;
  }

  getProcesses(): string[] {
    return Object.keys(this.processes.process);
  }

  process(name: string, identifier = 'default') {
    if (this.processes?.process[name]?.require) {
      this.processes.process[name].require.forEach(async (req) => {
        if (this.done.indexOf(req) < 0) {
          this.process(req, identifier);
        }
      });
    }
    this.localFilterObs.set(identifier, this.doProcess(name, identifier));
  }

  private doProcess(name: string, identifier = 'default'): Observable<any> | Subject<any> {
    if (name) {
      let processOpts = this.processes?.process[name]?.options;
      if (processOpts) {
        processOpts.identifier = identifier;
      } else {
        processOpts = {};
        if (identifier) {
          processOpts.identifier = identifier;
        }
      }
      const inst = this.ops.instantiate(this.processes?.process[name]?.op, processOpts);

      const obss = [];
      obss.push(this.localFilterObs.get(identifier));
      obss.push(inst.getExternal());

      return combineLatest(obss).pipe(
        tap((data) => {
          console.log('pre', name, data);
        }),
        map((data) => {
          return inst?.run(data);
        }),
        tap((data) => {
          console.log('post', name, data);
        }),
      );
    }
  }

  getProcessed(processed: string = null, identifier = 'default'): Observable<any> {
    let bs = new Subject();
    if (this.start) {
      bs = new BehaviorSubject(this.start.data);
    }
    this.localFilterSub.set(identifier, bs);
    this.localFilterObs.set(identifier, bs.asObservable());
    this.localFilterSet.set(identifier, {});
    this.localFilterSet.set('default', {});
    this.process(processed, identifier);
    return this.localFilterObs.get(identifier);
  }

  clearStreams() {
    this.localFilterSub.clear();
    this.localFilterObs.clear();
    this.localFilterSet.clear();
  }

  getDimensionMembers(dimension: string) {
    if (this.start) {
      return [
        ...new Set(
          this.start.data.map((x) => {
            return x[dimension];
          }),
        ),
      ];
    } else {
      return [];
    }
  }

  public liveCube() {
    return this.cube.dice().getCells();
  }

  setFilter(filter: any, identifier = 'default') {
    const ff = this.localFilterSet.get(identifier) || {};
    this.deepAssign(ff, filter);
    this.localFilterSet.set(identifier, ff);
    if (identifier !== 'default') {
      this.localFilterSub.get(identifier).next(this.start.data);
    } else {
      for (const k of this.localFilterSub.keys()) {
        this.localFilterSub.get(k).next(this.start.data);
      }
    }
  }

  getFilter(identifier = 'default') {
    return this.localFilterSet.get(identifier);
  }

  deepAssign(target, sources) {
    for (const k of Object.keys(sources)) {
      target[k] = sources[k];
    }
    return target;
  }

  getProcessInfo(process) {
    return this.processes?.process[process]?.options;
  }
}
