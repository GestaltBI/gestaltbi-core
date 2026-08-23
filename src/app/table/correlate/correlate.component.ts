import { Component } from '@angular/core';
import { type Association, Correlate } from '@gestaltbi/stream';
import { TranslateService } from '@ngx-translate/core';

import { CorrelateSelection } from '../../explore/correlate-controls/correlate-controls.component';
import { ExploreBaseComponent } from '../../explore/explore-base.component';

/**
 * Which pairs of columns actually travel together, strongest first.
 *
 * The coefficient is the evidence; the sentence beside it is the point. A pair
 * the statistic cannot honestly score is listed with its reason rather than
 * quietly dropped, so an empty row means "we could not tell", not "no relation".
 */
@Component({
  standalone: false,
  selector: 'sbi-table-correlate',
  templateUrl: './correlate.component.html',
  styleUrls: ['./correlate.component.scss'],
})
export class CorrelateComponent extends ExploreBaseComponent {
  columnDefs: any[] = [];
  rowData: any[] = [];

  private selection: CorrelateSelection | undefined;

  protected get identifier(): string {
    return 'correlate';
  }

  onSelection(selection: CorrelateSelection): void {
    this.selection = selection;
    this.recompute();
  }

  protected recompute(): void {
    const sel = this.selection;
    if (!sel || !this.source.length) {
      this.rowData = [];
      return;
    }
    if (!this.columnDefs.length) this.columnDefs = this.buildColumns();

    const op = new Correlate(
      {
        method: sel.method,
        include: sel.include,
        minCoefficient: sel.minCoefficient,
        limit: 60,
      },
      this.ps.opContext(),
    );

    const out: Association[] = op.run([this.source, {}]);
    this.rowData = out.map((r) => {
      const aLabel = this.dataStructureService.getLabel(r.a);
      const bLabel = this.dataStructureService.getLabel(r.b);
      return {
        ...r,
        aLabel,
        bLabel,
        kindLabel: this.t('explore.families.' + this.kindKey(r.kind)),
        strengthLabel: this.t('explore.strength.' + r.strength),
        // The op writes its sentence in column codes because it knows nothing
        // about the glossary. This is the column the reader actually reads.
        summary: this.relabel(r.summary, [
          [r.a, aLabel],
          [r.b, bLabel],
        ]),
      };
    });
  }

  /** Swap column codes for their labels, longest first so a prefix cannot win. */
  private relabel(text: string, pairs: Array<[string, string]>): string {
    let out = text ?? '';
    for (const [code, label] of [...pairs].sort((a, b) => b[0].length - a[0].length)) {
      if (code && label && code !== label) out = out.split(code).join(label);
    }
    return out;
  }

  private kindKey(kind: string): string {
    if (kind === 'measure-measure') return 'measureMeasure';
    if (kind === 'dimension-measure') return 'dimensionMeasure';
    return 'dimensionDimension';
  }

  private t(key: string): string {
    return this.injector.get(TranslateService).instant(key);
  }

  private buildColumns(): any[] {
    return [
      { headerName: this.t('explore.col.a'), field: 'aLabel', sortable: true, minWidth: 180 },
      { headerName: this.t('explore.col.b'), field: 'bLabel', sortable: true, minWidth: 180 },
      { headerName: this.t('explore.col.kind'), field: 'kindLabel', sortable: true, minWidth: 170 },
      {
        headerName: this.t('explore.col.coefficient'),
        field: 'coefficient',
        sortable: true,
        type: 'numericColumn',
        maxWidth: 130,
        // A skipped pair has no number. Showing 0 would read as "no relation".
        valueFormatter: (p: any) => (typeof p.value === 'number' ? p.value.toFixed(2) : '—'),
      },
      { headerName: this.t('explore.col.strength'), field: 'strengthLabel', sortable: true, maxWidth: 140 },
      { headerName: this.t('explore.col.reading'), field: 'summary', flex: 1, minWidth: 320, tooltipField: 'summary' },
    ];
  }
}
