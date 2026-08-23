import { Component } from '@angular/core';
import { Pivot } from '@gestaltbi/stream';

import { ExploreBaseComponent } from '../../explore/explore-base.component';
import { PivotSelection } from '../../explore/pivot-controls/pivot-controls.component';
import { GraphService } from '../graph.service';

/**
 * The same cross-tab as the table, read as a picture.
 *
 * A grid of numbers tells you the figures; the heatmap tells you where the
 * weight sits, which is the thing a grid makes you work for.
 */
@Component({
  standalone: false,
  selector: 'sbi-graph-pivot',
  templateUrl: './pivot.component.html',
  styleUrls: ['./pivot.component.scss'],
})
export class PivotComponent extends ExploreBaseComponent {
  chartOption: any;
  omitted = 0;
  theme: any;

  get pivotable(): boolean {
    return (this.dataStructureService.getColumnsFor('uatu:dimension') ?? []).length > 0;
  }

  private selection: PivotSelection | undefined;

  protected get identifier(): string {
    return 'pivotgraph';
  }

  override ngOnInit(): void {
    const gs = this.injector.get(GraphService);
    this.theme = gs.theme;
    super.ngOnInit();
  }

  onSelection(selection: PivotSelection): void {
    this.selection = selection;
    this.recompute();
  }

  protected recompute(): void {
    const sel = this.selection;
    if (!sel || !sel.rows || !this.source.length) return;

    const op = new Pivot(
      {
        rows: [sel.rows],
        columns: sel.columns ? [sel.columns] : [],
        measure: sel.measure,
        type: sel.type,
        columnLimit: 24,
      },
      this.ps.opContext(),
    );

    const grid: any[] = op.run([this.source, {}]);
    this.omitted = op.getOmitted();

    const cols = op.getColumns();
    const rows = grid.map((r) => String(r[sel.rows] ?? ''));
    const points: Array<[number, number, number]> = [];
    let min = Infinity;
    let max = -Infinity;

    grid.forEach((record, y) => {
      cols.forEach((col, x) => {
        const v = record[col];
        if (typeof v !== 'number' || !Number.isFinite(v)) return; // an absence, not a zero
        points.push([x, y, v]);
        if (v < min) min = v;
        if (v > max) max = v;
      });
    });

    if (!points.length) {
      this.chartOption = undefined;
      return;
    }

    const measureLabel = sel.type === 'count' ? '' : this.dataStructureService.getLabel(sel.measure);

    this.chartOption = {
      tooltip: {
        position: 'top',
        formatter: (p: any) =>
          `<b>${rows[p.data[1]]}</b><br/>${cols[p.data[0]]}: ${this.round(p.data[2])}`,
      },
      grid: { left: 160, right: 24, top: 16, bottom: 96 },
      xAxis: { type: 'category', data: cols, axisLabel: { rotate: 45, interval: 0 }, splitArea: { show: true } },
      yAxis: { type: 'category', data: rows, splitArea: { show: true } },
      visualMap: {
        min,
        max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        text: [measureLabel, ''],
        // Sequential: a pivot cell is a magnitude, so one hue that deepens.
        inRange: { color: ['#f6f2ec', '#f2c14e', '#e8743b', '#c2352a'] },
      },
      series: [
        {
          type: 'heatmap',
          data: points,
          label: { show: false },
          emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.35)' } },
        },
      ],
    };
  }

  private round(v: number): string {
    return Math.abs(v) >= 1000 ? v.toFixed(0) : v.toFixed(2);
  }
}
