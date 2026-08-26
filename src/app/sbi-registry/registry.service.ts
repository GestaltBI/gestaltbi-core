import { ComponentType } from '@angular/cdk/portal';
import { Injectable } from '@angular/core';

import { EmptyComponent } from './empty/empty.component';

/** How a dataset-independent tool presents itself in the menu. */
export interface ToolEntry {
  id: string;
  labelKey: string;
  icon: string;
}

@Injectable({
  providedIn: 'root',
})
export class RegistryService {
  components: Map<string, ComponentType<any>> = new Map<string, ComponentType<any>>();

  private readonly toolModes = new Map<string, ToolEntry>();

  constructor() {}

  /**
   * A mode that works on any dataset, so it does not wait to be listed.
   *
   * `modes.json` is a config repo's curation of the analyses that suit its data,
   * and that curation is right: a synchronic comparison is useless without a
   * dimension to compare across. But a tool with no such prerequisite — the
   * advisor profiles whatever is loaded — should not be invisible just because
   * the config was written before it existed. Every existing config repo is in
   * that position, and none of them can be expected to come back and edit.
   */
  registerTool(entry: ToolEntry): void {
    this.toolModes.set(entry.id, entry);
  }

  /** Tools that can actually be rendered, in registration order. */
  get tools(): ToolEntry[] {
    return [...this.toolModes.values()].filter((t) => this.viewsFor(t.id).length > 0);
  }

  /**
   * Views a configuration has ruled out, either everywhere or for one mode.
   *
   * A registered component is what the *build* can render; this is what the
   * *data* is worth rendering. A dataset with no geography has nothing to put
   * on a map, and a map button that opens an empty Italy is worse than no
   * button — so a config can say so rather than every reader discovering it.
   */
  private globalExclusions = new Set<string>();
  private modeExclusions = new Map<string, Set<string>>();

  setExcludedViews(global: string[], byMode: Map<string, string[]>): void {
    this.globalExclusions = new Set(global);
    this.modeExclusions = new Map([...byMode].map(([mode, views]) => [mode, new Set(views)]));
  }

  private getKey(mode, view) {
    return `${mode}::${view}`;
  }

  registerComponent(mode, view, component: ComponentType<any>) {
    this.components.set(this.getKey(mode, view), component);
  }

  /**
   * Views a mode can actually offer, in the canonical order the toolbar shows
   * them: registered for that mode, and not ruled out by the configuration.
   *
   * A mode that has no map — nothing cross-dimensional does — should not offer
   * a button that leads to an empty surface, and neither should a mode whose
   * map has nothing to plot on this particular dataset.
   */
  viewsFor(mode: string): string[] {
    const order = ['map', 'graph', 'table', 'story', 'advice', 'flow'];
    const found = [...this.components.keys()]
      .filter((key) => key.startsWith(`${mode}::`))
      .map((key) => key.split('::')[1]);
    const excluded = this.modeExclusions.get(mode);
    return order.filter(
      (view) => found.includes(view) && !this.globalExclusions.has(view) && !excluded?.has(view),
    );
  }

  componentFor(mode, view) {
    if (this.components.has(this.getKey(mode, view))) {
      return this.components.get(this.getKey(mode, view));
    } else {
      return EmptyComponent;
    }
  }
}
