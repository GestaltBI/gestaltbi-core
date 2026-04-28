import { Component, Injector, OnDestroy, OnInit, Type } from '@angular/core';

import { LoggerService } from './../core/logger.service';
import { DataService } from './../processor/data.service';
import { ProcessorService } from './../processor/processor.service';
import { DatastructureService } from '../datastructure/datastructure.service';

@Component({ template: '' })
export class BaseComponent implements OnInit, OnDestroy {
  protected ds: DataService;
  protected ps: ProcessorService;
  protected dataStructureService: DatastructureService;
  protected logger: LoggerService;

  constructor(public injector: Injector) {
    this.ds = injector.get<DataService>(DataService as Type<DataService>);
    this.ps = injector.get<ProcessorService>(ProcessorService as Type<ProcessorService>);
    this.dataStructureService = injector.get<DatastructureService>(DatastructureService as Type<DatastructureService>);
    this.logger = injector.get(LoggerService);
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.ps.clearStreams();
  }
}
