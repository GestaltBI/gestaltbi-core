import { AbstractOp } from '../op.js';
import { byDate, resolveTimeColumn } from '../resolve.js';

/**
 * Period-over-period deltas, and the stock/flow bridge.
 *
 * For each configured measure emits the absolute change, the relative change,
 * and (for a stock) the implied flow — the first difference of a level. Rows
 * are ordered by the date column; the first period gets `null`, not `0`, so a
 * missing baseline never reads as "no change".
 *
 * ```json
 * { "op": "diffcalc", "options": {
 *     "date": "month",
 *     "measures": [
 *       { "column": "users",  "kind": "stock", "flowInto": "users_added" },
 *       { "column": "revenue", "kind": "flow", "lag": 12, "suffix": "_yoy" }
 *     ] } }
 * ```
 *
 * With no `measures`, every column tagged `uatu:measure:stock` or
 * `uatu:measure:flow` is picked up automatically.
 */
export class DiffCalc extends AbstractOp {
  public run(df: any): any {
    const rows: any[] = df[0] ?? [];
    if (!rows.length) return rows;

    const o = this.options ?? {};
    const dateCol = resolveTimeColumn(this.columnDirectory, rows, o.date);
    const specs = this.resolveMeasures(o);
    if (!specs.length) return rows;

    const order = rows.map((_, i) => i).sort(byDate(rows, dateCol));

    for (const spec of specs) {
      const lag = Math.max(1, Math.round(spec.lag ?? 1));
      const suffix = spec.suffix ?? (lag === 1 ? '' : `_lag${lag}`);
      const deltaCol = spec.deltaInto ?? `${spec.column}_delta${suffix}`;
      const pctCol = spec.pctInto ?? `${spec.column}_pct${suffix}`;

      order.forEach((rowIdx, k) => {
        const cur = this.num(rows[rowIdx][spec.column]);
        const prevIdx = k - lag >= 0 ? order[k - lag] : -1;
        const prev = prevIdx >= 0 ? this.num(rows[prevIdx][spec.column]) : null;

        const delta = cur === null || prev === null ? null : cur - prev;
        rows[rowIdx][deltaCol] = delta;
        rows[rowIdx][pctCol] = delta === null || prev === null || prev === 0 ? null : delta / prev;

        // A stock's first difference is the flow that produced it.
        if (spec.kind === 'stock' && spec.flowInto) rows[rowIdx][spec.flowInto] = delta;
      });
    }

    return rows;
  }

  private resolveMeasures(o: any): any[] {
    if (Array.isArray(o.measures) && o.measures.length) return o.measures;
    const stocks = this.tagged('uatu:measure:stock').map((c) => ({ column: c, kind: 'stock' }));
    const flows = this.tagged('uatu:measure:flow').map((c) => ({ column: c, kind: 'flow' }));
    return [...stocks, ...flows];
  }

  private tagged(tag: string): string[] {
    try {
      return this.columnDirectory?.getColumnsFor(tag) ?? [];
    } catch {
      return [];
    }
  }

  private num(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const x = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(x) ? x : null;
  }
}
