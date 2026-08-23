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

  /** Stream identifier, so each view keeps its own filter state. */
  protected abstract get identifier(): string;

  /** Recompute whatever this view renders. Called on new data and on new options. */
  protected abstract recompute(): void;

  ngOnInit(): void {
    const conf: any = this.ds.getProcessInfo('conf_explore') ?? {};
    // A frame that has been filtered and enhanced but not rolled up. Falling
    // back keeps this working against a config repo that never heard of it:
    // an unknown process name yields the raw frame rather than an error.
    const process: string = conf.source ?? 'exploresource';

    setTimeout(() => {
      this.sub = this.ds.getProcessed(process, this.identifier).subscribe((data) => {
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
