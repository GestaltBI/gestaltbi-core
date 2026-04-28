import { ComponentType } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';

import { Filter } from './filter.interface';

@Injectable({
  providedIn: 'root',
})
export class FilterRegistryService {
  private reg: Map<string, ComponentType<Filter>> = new Map<string, ComponentType<Filter>>();

  constructor() {}

  private getKey(mode, view, scope) {
    return `${mode}::${view}::${scope}`;
  }

  register(mode: string, vis: string, scope: string, filter: ComponentType<Filter>) {
    this.reg.set(this.getKey(mode, vis, scope), filter);
  }

  for(mode: string, vis: string, scope = 'local'): ComponentType<Filter> {
    return this.reg.get(this.getKey(mode, vis, scope));
  }
}
