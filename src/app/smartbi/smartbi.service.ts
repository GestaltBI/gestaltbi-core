import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ConfigSourceService } from '../core/config-source.service';
import { ImporterService } from './../importer/importer.service';
import { AggregatorService } from './../processor/aggregator.service';
import { DataService } from './../processor/data.service';
import { FilterService } from './../processor/filter.service';
import { ProcessorService } from './../processor/processor.service';
import { RegistryService } from './../sbi-registry/registry.service';

@Injectable({
  providedIn: 'root',
})
export class SmartbiService {
  mode: string;
  view: string;

  /**
   * Path prefix used by changeMode/changeView when building routerLinks.
   * Default `['/data']` for the bundled config; flipped to
   * `['/gh', org, repo]` (or with a ref) by GhSourceGuard so that sidebar
   * navigation preserves the `/gh/...` URL structure.
   */
  prefix: any[] = ['/data'];

  toggleLeft: EventEmitter<void> = new EventEmitter<void>();
  toggleRight: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    private http: HttpClient, //
    private reg: RegistryService,
    private ps: ProcessorService,
    private ds: DataService,
    private fs: FilterService,
    private as: AggregatorService,
    private i: ImporterService,
    private cs: ConfigSourceService,
  ) {}

  getModes(): Observable<any> {
    return this.http.get(this.cs.url('modes.json'));
  }

  setMode(mode: string) {
    this.mode = mode;
    this.ps.setMode(mode);
  }

  setView(view: string) {
    this.view = view;
  }

  setPrefix(prefix: any[]) {
    this.prefix = prefix;
  }

  throwToggleLeft() {
    this.toggleLeft.emit();
  }

  throwToggleRight() {
    this.toggleRight.emit();
  }

  componentFor(mode, vis) {
    return this.reg.componentFor(mode, vis);
  }

  changeMode(mode: string) {
    return [...this.prefix, mode, this.view];
  }

  changeView(view: string) {
    return [...this.prefix, this.mode, view];
  }

  loadMock(file) {
    this.i.dataLoaded.subscribe((data) => {
      this.ps.workOn(data);
    });
    this.i.launchMock(file);
    this.as.prepareDimensions();
  }
}
