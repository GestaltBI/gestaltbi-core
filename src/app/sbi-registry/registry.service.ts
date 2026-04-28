import { ComponentType } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';

import { EmptyComponent } from './empty/empty.component';

@Injectable({
  providedIn: 'root',
})
export class RegistryService {
  components: Map<string, ComponentType<any>> = new Map<string, ComponentType<any>>();

  constructor() {}

  private getKey(mode, view) {
    return `${mode}::${view}`;
  }

  registerComponent(mode, view, component: ComponentType<any>) {
    this.components.set(this.getKey(mode, view), component);
  }

  componentFor(mode, view) {
    if (this.components.has(this.getKey(mode, view))) {
      return this.components.get(this.getKey(mode, view));
    } else {
      return EmptyComponent;
    }
  }
}
