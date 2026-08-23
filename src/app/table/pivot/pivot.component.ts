import { Component } from '@angular/core';
import { Pivot } from '@gestaltbi/stream';

import { ExploreBaseComponent } from '../../explore/explore-base.component';
import { PivotSelection } from '../../explore/pivot-controls/pivot-controls.component';
import { Utils } from '../utils';

/**
 * The cross-tab: one dimension down the side, another across the top, an
 * aggregated measure in the cells.
 *
 * The op runs here rather than in the process graph because the axes are the
 * question — the owner changes them and reads the answer.
 */
@Component({
  standalone: false,
  selector: 'sbi-table-pivot',
  templateUrl: './pivot.component.html',
  styleUrls: ['./pivot.component.scss'],
})
export class PivotComponent extends ExploreBaseComponent {
  columnDefs: any[] = [];
  rowData: any[] = [];

  /** Column values folded into `Other` because the axis was capped. */
  omitted = 0;

  /** No dimensions in the structure means there is nothing to cross-tabulate. */
  get pivotable(): boolean {
    return (this.dataStructureService.getColumnsFor('uatu:dimension') ?? []).length > 0;
  }

  private selection: PivotSelection | undefined;

  protected get identifier(): string {
    return 'pivot';
  }

  onSelection(selection: PivotSelection): void {
    this.selection = selection;
    this.recompute();
  }

  protected recompute(): void {
    const sel = this.selection;
    if (!sel || !sel.rows || !this.source.length) {
      this.columnDefs = [];
      this.rowData = [];
      return;
    }

    const op = new Pivot(
      {
        rows: [sel.rows],
        columns: sel.columns ? [sel.columns] : [],
        measure: sel.measure,
        type: sel.type,
        totals: true,
        // Wider than the package default would be unreadable in a grid.
        columnLimit: 24,
      },
      this.ps.opContext(),
    );

    this.rowData = op.run([this.source, {}]);
    this.omitted = op.getOmitted();

    const format = this.formatterFor(sel);
    this.columnDefs = [
      {
        headerName: this.dataStructureService.getLabel(sel.rows),
        field: sel.rows,
        pinned: 'left',
        sortable: true,
        minWidth: 200,
      },
      ...op.getColumns().map((col) => ({
        headerName: col,
        field: col,
        sortable: true,
        type: 'numericColumn',
        valueFormatter: format,
      })),
      {
        headerName: this.translateLabel(),
        field: 'Total',
        sortable: true,
        pinned: 'right',
        type: 'numericColumn',
        valueFormatter: format,
      },
    ];
  }

  /** Counts are plain integers; anything else follows the measure's own type. */
  private formatterFor(sel: PivotSelection): (params: any) => string {
    const utils = new Utils();
    if (sel.type === 'count' || sel.type === 'countDistinct') {
      return utils.getFormatter('amount');
    }
    const type = String(this.dataStructureService.getTypeFor(sel.measure) ?? '');
    if (type.includes('currency')) return utils.getFormatter('currency');
    if (type.includes('percent')) return utils.getFormatter('percent');
    return utils.getFormatter('floatamount');
  }

  private translateLabel(): string {
    return 'Total';
  }
}
