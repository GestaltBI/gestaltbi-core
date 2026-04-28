import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { DatastructureService } from './../datastructure/datastructure.service';
import { IAggregatorService } from './aggregator.interface';
import { ProcessorService } from './processor.service';

@Injectable({
  providedIn: 'root',
})
export class AggregatorService implements IAggregatorService {
  dimensions: any[];

  constructor(
    private ps: ProcessorService, //
    private ds: DatastructureService,
  ) {}

  initialize(data) {
    this.ps.initializeAggregator(data);
    this.prepareDimensions();
  }

  prepareDimensions(tag = 'uatu:dimension') {
    this.dimensions = this.ds.getColumnsFor(tag);
  }

  getDimensions(): any[] {
    return this.dimensions;
  }

  getDimensionMembers(dimension): any[] {
    return this.ps.getDimensionMembers(dimension);
  }
}
