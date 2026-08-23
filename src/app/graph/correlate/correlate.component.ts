import { Component } from '@angular/core';
import { type Association, Correlate } from '@gestaltbi/stream';

import { CorrelateSelection } from '../../explore/correlate-controls/correlate-controls.component';
import { ExploreBaseComponent } from '../../explore/explore-base.component';
import { GraphService } from '../graph.service';

/**
 * The association matrix.
 *
 * Every column that took part, against every other, shaded by how strongly the
 * two move together. Reading down a row shows what a single column is entangled
 * with — which is how you find the pairs worth a second look, and the pairs that
 * are the same fact written twice.
 */
@Component({
  standalone: false,
  selector: 'sbi-graph-correlate',
  templateUrl: './correlate.component.html',
  styleUrls: ['./correlate.component.scss'],
})
export class CorrelateComponent extends ExploreBaseComponent {
  chartOption: any;
  theme: any;
  pairs = 0;

  private selection: CorrelateSelection | undefined;

  protected get identifier(): string {
    return 'correlategraph';
  }

  override ngOnInit(): void {
    this.theme = this.injector.get(GraphService).theme;
    super.ngOnInit();
  }

  onSelection(selection: CorrelateSelection): void {
    this.selection = selection;
    this.recompute();
  }

  protected recompute(): void {
    const sel = this.selection;
    if (!sel || !this.source.length) return;

    // No floor here: a matrix with holes punched in it is harder to read than
    // one that shows the weak cells as weak.
    const op = new Correlate({ method: sel.method, include: sel.include }, this.ps.opContext());
    const out: Association[] = op.run([this.source, {}]);
    const scored = out.filter((r) => typeof r.coefficient === 'number');
    this.pairs = scored.length;

    if (!scored.length) {
      this.chartOption = undefined;
      return;
    }

    const codes = [...new Set(scored.flatMap((r) => [r.a, r.b]))].sort();
    const index = new Map(codes.map((c, i) => [c, i]));
    const labels = codes.map((c) => this.dataStructureService.getLabel(c));

    const points: Array<[number, number, number]> = [];
    for (const r of scored) {
      const x = index.get(r.a) as number;
      const y = index.get(r.b) as number;
      const v = r.coefficient as number;
      points.push([x, y, v]);
      points.push([y, x, v]);
    }
    // A column is perfectly correlated with itself; drawing the diagonal keeps
    // the eye anchored.
    codes.forEach((_, i) => points.push([i, i, 1]));

    this.chartOption = {
      tooltip: {
        position: 'top',
        formatter: (p: any) => `<b>${labels[p.data[0]]}</b><br/>${labels[p.data[1]]}<br/>${p.data[2].toFixed(2)}`,
      },
      grid: { left: 200, right: 24, top: 16, bottom: 190 },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: 55, interval: 0 }, splitArea: { show: true } },
      yAxis: { type: 'category', data: labels, splitArea: { show: true } },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        // Diverging: Pearson is signed, and an inverse relationship is a
        // finding, not a weak one.
        inRange: { color: ['#2a6f97', '#8ecae6', '#f6f2ec', '#f2c14e', '#c2352a'] },
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
}
