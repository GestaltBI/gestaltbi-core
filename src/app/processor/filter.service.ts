import { EventEmitter, Injectable } from '@angular/core';

import { ProcessorService } from './processor.service';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  public filterChanged: EventEmitter<any> = new EventEmitter<any>();

  constructor(private processor: ProcessorService) {}

  setFilter(filter: any, identifier?: string) {
    this.processor.setFilter(filter, identifier);
  }

  getFilter(identifier?: string) {
    return this.processor.getFilter(identifier);
  }
}
