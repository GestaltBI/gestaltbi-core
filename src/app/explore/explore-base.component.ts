import { Component, Injector, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { BaseComponent } from '../shared/base-component';

/**
 * Base for the views that read a frame across its dimensions rather than along
 * time.
 *
 * Unlike the period views, these run their op in the component: the whole point
 * is that the user changes the axes and sees the answer, and a process graph is
 * fixed at config time. The frame they work from is the filtered, enhanced —
 * but *not* yet aggregated — stream, because `pivot` and `correlate` do their
 * own grouping.
 */
@Component({ template: '' })
export abstract class ExploreBaseComponent extends BaseComponent implements OnInit {
  /** Rows the op last ran against. */
  protected source: any[] = [];

  /** True once the stream has delivered something. */
  loaded = false;

  private sub: Subscription | undefined;

  constructor(public injector: Injector) {
    super(injector);
  }

  /** Set when the graph does not define the process this view asked for. */
  sourceMissing = false;

  /** Process the view read from, or null when it fell back to the raw frame. */
  sourceProcessName: string | null = null;

  /** Stream identifier, so each view keeps its own filter state. */
  protected abstract get identifier(): string;

  /**
   * Process to read from. Defaults to whatever `conf_explore` names.
   *
   * A view that needs something more specific overrides this — the narrative
   * takes the process its story was written against.
   */
  protected sourceProcess(): string | undefined {
    const conf: any = this.ds.getProcessInfo('conf_explore') ?? {};
    return conf.source ?? 'exploresource';
  }

  /** Recompute whatever this view renders. Called on new data and on new options. */
  protected abstract recompute(): void;

  ngOnInit(): void {
    const wanted = this.sourceProcess();
    // An unknown process name silently yields the raw frame — unparsed numbers,
    // no derived columns — which looks like data and is not. Check first, and
    // let the view say so rather than quietly analysing strings.
    this.sourceMissing = !this.ps.hasProcess(wanted);
    this.sourceProcessName = this.sourceMissing ? null : (wanted as string);

    setTimeout(() => {
      this.sub = this.ds.getProcessed(this.sourceProcessName, this.identifier).subscribe((data) => {
        this.source = Array.isArray(data) ? data : [];
        this.loaded = true;
        this.recompute();
      });
    }, 1000);
  }

  override ngOnDestroy(): void {
    this.sub?.unsubscribe();
    super.ngOnDestroy();
  }
}
