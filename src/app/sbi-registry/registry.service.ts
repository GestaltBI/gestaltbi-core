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

  /**
   * Views actually registered for a mode, in the canonical order the toolbar
   * shows them. A mode that has no map — nothing cross-dimensional does —
   * should not offer a button that leads to an empty surface.
   */
  viewsFor(mode: string): string[] {
    const order = ['map', 'graph', 'table'];
    const found = [...this.components.keys()]
      .filter((key) => key.startsWith(`${mode}::`))
      .map((key) => key.split('::')[1]);
    return order.filter((view) => found.includes(view));
  }

  componentFor(mode, view) {
    if (this.components.has(this.getKey(mode, view))) {
      return this.components.get(this.getKey(mode, view));
    } else {
      return EmptyComponent;
    }
  }
}
