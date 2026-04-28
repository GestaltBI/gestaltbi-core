import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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
  ) {}

  getModes(): Observable<any> {
    return this.http.get('assets/modes.json');
  }

  setMode(mode: string) {
    this.mode = mode;
    this.ps.setMode(mode);
  }

  setView(view: string) {
    this.view = view;
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
    return ['/data', mode, this.view];
  }

  changeView(view: string) {
    return ['/data', this.mode, view];
  }

  loadMock(file) {
    this.i.dataLoaded.subscribe((data) => {
      this.ps.workOn(data);
    });
    this.i.launchMock(file);
    this.as.prepareDimensions();
  }
}
