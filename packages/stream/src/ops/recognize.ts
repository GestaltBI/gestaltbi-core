import { AbstractOp } from '../op.js';
import { byDate, resolveTimeColumn } from '../resolve.js';

/**
 * Revenue recognition — the matching principle, mechanized.
 *
 * Spreads an amount booked in one period across the periods it actually serves,
 * so a twelve-month prepayment stops looking like twelve months of margin on the
 * day it lands. Also emits the deferred balance: the obligation still owed.
 *
 * ```json
 * { "op": "recognize", "options": {
 *     "amount": "cash_yearly", "date": "month", "term": 12,
 *     "into": "recognized_yearly", "deferredInto": "deferred_yearly" } }
 * ```
 *
 * `term` is either a constant number of periods or, via `termColumn`, a column
 * holding a per-row term. Rows are matched on their position in the date order,
 * so the frame must carry one row per period (no gaps) — {@link Cohort} or a
 * prior `aggregate` normally guarantees that.
 *
 * Amounts scheduled past the last row are not lost: they stay in the final
 * deferred balance and are counted in {@link Recognize.getSpill}.
 */
export class Recognize extends AbstractOp {
  private spill = 0;

  public run(df: any): any {
    const rows: any[] = df[0] ?? [];
    if (!rows.length) return rows;

    const o = this.options ?? {};
    const amountCol: string = o.amount;
    const into: string = o.into ?? `${amountCol}_recognized`;
    const deferredInto: string | undefined = o.deferredInto;
    const dateCol = resolveTimeColumn(this.columnDirectory, rows, o.date);
    if (!dateCol) throw new Error('recognize: no options.date and no time column found');
    const method: string = o.method ?? 'straight-line';

    if (!amountCol) throw new Error('recognize: options.amount is required');
    if (method !== 'straight-line') throw new Error(`recognize: unsupported method "${method}"`);

    const order = this.sortedIndices(rows, dateCol);
    const n = order.length;
    const recognized = new Array(n).fill(0);
    const deferred = new Array(n).fill(0);
    this.spill = 0;

    for (let k = 0; k < n; k++) {
      const row = rows[order[k]];
      const amount = this.num(row[amountCol]);
      if (amount === null) continue;
      const term = Math.max(1, Math.round(o.termColumn ? this.num(row[o.termColumn]) ?? 1 : (o.term ?? 1)));
      const per = amount / term;
      for (let j = 0; j < term; j++) {
        const i = k + j;
        if (i < n) recognized[i] += per;
        else this.spill += per;
      }
      // Obligation still owed at the end of each period this cohort touches.
      for (let i = k; i < n; i++) {
        const servedThrough = Math.min(i - k + 1, term);
        const remaining = amount - per * servedThrough;
        if (remaining > 1e-9) deferred[i] += remaining;
      }
    }

    order.forEach((rowIdx, k) => {
      rows[rowIdx][into] = recognized[k];
      if (deferredInto) rows[rowIdx][deferredInto] = deferred[k];
    });

    return rows;
  }

  /** Amount scheduled beyond the end of the frame (still owed, not yet recognizable). */
  public getSpill(): number {
    return this.spill;
  }

  private num(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const x = typeof v === 'number' ? v : parseFloat(v);
    return Number.isFinite(x) ? x : null;
  }

  /** Row indices in ascending date order. */
  private sortedIndices(rows: any[], dateCol: string): number[] {
    return rows.map((_, i) => i).sort(byDate(rows, dateCol));
  }
}
