import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FilterStateService {
  private filterState: Map<string, any> = new Map<string, any>();

  constructor() {}

  setFilter(filter: any, identifier: string = 'default') {
    this.filterState.set(identifier, filter);
  }

  getFilter(identifier: string = 'default') {
    return this.filterState.get(identifier);
  }
}
