import { Injectable } from '@angular/core';

import { DatastructureService } from './../datastructure/datastructure.service';
import { ProcessorService } from './processor.service';

@Injectable({
  providedIn: 'root',
})
export class AggregatorService {
  dimensions: any[] = [];

  constructor(
    private ps: ProcessorService, //
    private ds: DatastructureService,
  ) {}

  initialize(data: any) {
    this.ps.initializeAggregator(data);
    this.prepareDimensions();
  }

  prepareDimensions(tag = 'uatu:dimension') {
    this.dimensions = this.ds.getColumnsFor(tag);
  }

  getDimensions(): any[] {
    return this.dimensions;
  }

  getDimensionMembers(dimension: string): any[] {
    return this.ps.getDimensionMembers(dimension);
  }
}
