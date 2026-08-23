import { Component, inject, Input, OnDestroy, OnInit, forwardRef } from '@angular/core';
import { resolveTimeColumn } from '@gestaltbi/stream';
import moment from 'moment';
import { Subscription } from 'rxjs';

import { ImporterService } from './../../importer/importer.service';
import { ProcessorService } from './../../processor/processor.service';
import { BasefilterComponent } from './../basefilter/basefilter.component';

/** Which slice of the loaded period a panel starts on. */
export type PeriodSpan = 'full' | 'first' | 'second';

@Component({
  standalone: false,
  selector: 'sbi-periodfilter',
  templateUrl: './periodfilter.component.html',
  styleUrls: ['./periodfilter.component.scss'],
  providers: [{ provide: BasefilterComponent, useExisting: forwardRef(() => PeriodfilterComponent) }],
})
export class PeriodfilterComponent extends BasefilterComponent implements OnInit, OnDestroy {
  /** Months back from today. Wins over everything else when set. */
  @Input() startAt;

  /** Explicit bounds. Pin a panel to fixed dates regardless of the data. */
  @Input() startFrom;
  @Input() startTo;

  /**
   * Which half of the loaded period this panel covers. Comparison views put
   * "first" on the left and "second" on the right; a single-period view leaves
   * it at "full".
   *
   * Deriving the window from the data is what lets one build serve any config
   * repo: the bounds used to be hardcoded to the bundled sample's 2020, so
   * every other dataset was filtered down to nothing.
   */
  @Input() span: PeriodSpan = 'full';

  data: any = {};

  private ps = inject(ProcessorService);
  private importer = inject(ImporterService);
  private sub: Subscription | undefined;

  /** Set once a stored filter has been restored, so we stop overriding it. */
  private configured = false;

  ngOnInit(): void {
    this.applyDefaults();
    // The frame normally lands after the filter bar is built, so re-derive the
    // window once it has — and again on every re-import.
    this.sub = this.importer.dataLoaded.subscribe(() => this.applyDefaults());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** The column the period filter keys on, per the loaded structure. */
  private timeColumn(): string {
    return resolveTimeColumn(this.dss, this.ps.start?.data) ?? 'uatu:date';
  }

  /** Min/max of the time column across the loaded frame. */
  private dataRange(): { start: Date; end: Date } | undefined {
    const rows: any[] = this.ps.start?.data ?? [];
    if (!rows.length) {
      return undefined;
    }
    const col = this.timeColumn();
    let min = Infinity;
    let max = -Infinity;
    for (const row of rows) {
      const t = +new Date(row[col]);
      if (!Number.isFinite(t)) {
        continue;
      }
      if (t < min) min = t;
      if (t > max) max = t;
    }
    return Number.isFinite(min) && Number.isFinite(max) ? { start: new Date(min), end: new Date(max) } : undefined;
  }

  /** Resolve the window this panel should show, in order of precedence. */
  private applyDefaults(): void {
    if (this.configured) {
      return;
    }

    if (this.startAt) {
      this.data = {
        startDate: moment()
          .subtract(this.startAt + 1, 'month')
          .toDate(),
        endDate: moment().subtract(this.startAt, 'month').toDate(),
      };
      return;
    }

    if (this.startFrom && this.startTo) {
      this.data = { startDate: moment(this.startFrom).toDate(), endDate: moment(this.startTo).toDate() };
      return;
    }

    const range = this.dataRange();
    if (!range) {
      // Nothing loaded yet — leave the pickers empty rather than inventing a
      // year. ngOnInit's subscription fills them in when the data lands.
      return;
    }
    this.data = this.slice(range);
  }

  /** Split a range according to `span`, without the halves overlapping. */
  private slice(range: { start: Date; end: Date }): { startDate: Date; endDate: Date } {
    if (this.span === 'full') {
      return { startDate: range.start, endDate: range.end };
    }
    const mid = new Date((+range.start + +range.end) / 2);
    if (this.span === 'first') {
      return { startDate: range.start, endDate: moment(mid).subtract(1, 'day').toDate() };
    }
    return { startDate: mid, endDate: range.end };
  }

  save(): any {
    if (!this.data.startDate || !this.data.endDate) {
      this.applyDefaults();
    }
    return {
      [this.timeColumn()]: {
        between: [moment(this.data.startDate).toDate(), moment(this.data.endDate).toDate()],
      },
    };
  }

  /** Back to the window this panel opened on, not to "the last month". */
  reset(): any {
    this.configured = false;
    this.applyDefaults();
    return this.save();
  }

  configure(value) {
    if (value) {
      const key = Object.keys(value)[0];
      const between = value[key]?.between;
      if (!between) {
        return;
      }
      this.configured = true;
      this.data = { startDate: moment(between[0]).toDate(), endDate: moment(between[1]).toDate() };
    }
  }
}
