import { finalize, neuter, step, type AggKind, type AggSpec } from '../agg.js';
import { AbstractOp } from '../op.js';
import { dimensionColumns } from '../resolve.js';

/**
 * How to lay out a cross-tab, and how to fold the measure in its cells.
 */
export interface PivotOptions extends AggSpec {
  /** Dimensions down the side. Defaults to every dimension not used as a column. */
  rows?: string[];
  /** Dimensions across the top. Omit for a plain group-by with one measure column. */
  columns?: string[];
  /** Measure to roll up. Not needed for `count`. */
  measure?: string;
  /** How to fold the measure. Default `sum`. */
  type?: AggKind;
  /** Add a per-row total and a grand-total record. */
  totals?: boolean;
  /** Field name for the row total. Default `Total`. */
  totalInto?: string;
  /** Label of the grand-total record in its first row dimension. Default `Total`. */
  totalLabel?: string;
  /** Highest number of column buckets to emit. Default 50. */
  columnLimit?: number;
  /** Where the tail beyond `columnLimit` goes. Set null to drop it. Default `Other`. */
  otherLabel?: string | null;
  /** Stands in for a null or empty dimension value. Default `(blank)`. */
  emptyLabel?: string;
  /** Joins several column dimensions into one header. Default ` / `. */
  separator?: string;
  /** Prepended to every generated column field. */
  prefix?: string;
}

/**
 * Cross-tabulation: dimensions down the side, dimensions across the top, one
 * aggregated measure in the cells.
 *
 * `aggregate` rolls a frame up along a single axis. This puts a second axis
 * across the top, which is what it takes to see how two dimensions interact
 * rather than each one's totals separately.
 *
 * ```json
 * { "op": "pivot", "require": ["clean"], "options": {
 *     "rows": ["product_family"],
 *     "columns": ["region"],
 *     "measure": "revenue",
 *     "type": "sum",
 *     "totals": true } }
 * ```
 *
 * Emits one plain record per row key — the row dimensions, then one field per
 * column bucket — so a grid or a chart consumes it without unpacking a nested
 * shape.
 *
 * Column buckets are capped: pivoting across something high-cardinality would
 * otherwise emit thousands of fields. The tail is collected under `otherLabel`
 * and counted in {@link Pivot.getOmitted}, never dropped without saying so.
 */
export class Pivot extends AbstractOp {
  private columnKeys: string[] = [];
  private omitted = 0;

  /** Column buckets emitted by the last run, in output order. */
  public getColumns(): string[] {
    return this.columnKeys;
  }

  /** How many distinct column values fell past `columnLimit` into the tail. */
  public getOmitted(): number {
    return this.omitted;
  }

  public run(df: any): any {
    const rows: any[] = df[0] ?? [];
    const o: PivotOptions = this.options ?? {};

    const colDims = o.columns ?? [];
    const rowDims = o.rows ?? this.defaultRows(colDims);
    const type: AggKind = (o.type as AggKind) ?? 'sum';
    const sep = o.separator ?? ' / ';
    const empty = o.emptyLabel ?? '(blank)';
    const limit = Math.max(1, Math.round(o.columnLimit ?? 50));
    const otherLabel = o.otherLabel === null ? null : (o.otherLabel ?? 'Other');
    const totalInto = o.totalInto ?? 'Total';
    const prefix = o.prefix ?? '';

    this.columnKeys = [];
    this.omitted = 0;
    if (!rows.length || !rowDims.length) return [];

    const label = (v: any): string => (v === null || v === undefined || v === '' ? empty : String(v));
    const colKeyOf = (row: any): string =>
      colDims.length ? colDims.map((c) => label(row[c])).join(sep) : (o.measure ?? 'count');

    // Which column buckets survive the cap: the most frequent ones, so what
    // gets folded away is the long thin tail.
    const kept = this.resolveColumns(rows, colKeyOf, limit);
    const bucket = (key: string): string | null =>
      kept.has(key) ? key : otherLabel === null ? null : otherLabel;

    const groups = new Map<string, { dims: any; cells: Map<string, any>; total: any }>();
    const seenCols = new Set<string>();

    for (const row of rows) {
      const rowKey = rowDims.map((d) => label(row[d])).join(sep);
      let g = groups.get(rowKey);
      if (!g) {
        const dims: any = {};
        rowDims.forEach((d) => (dims[d] = row[d]));
        g = { dims, cells: new Map(), total: neuter(type) };
        groups.set(rowKey, g);
      }
      const col = bucket(colKeyOf(row));
      if (col === null) continue;
      seenCols.add(col);
      if (!g.cells.has(col)) g.cells.set(col, neuter(type));
      g.cells.set(col, step(type, g.cells.get(col), row[o.measure as string], o, row));
      g.total = step(type, g.total, row[o.measure as string], o, row);
    }

    const ordered = this.orderColumns(seenCols, otherLabel);
    this.columnKeys = ordered.map((c) => prefix + c);

    const out: any[] = [];
    const grand = new Map<string, any>();
    let grandTotal = neuter(type);

    for (const g of groups.values()) {
      const record: any = { ...g.dims };
      for (const col of ordered) {
        const acc = g.cells.get(col);
        record[prefix + col] = acc === undefined ? null : finalize(type, acc);
        if (acc !== undefined) {
          if (!grand.has(col)) grand.set(col, neuter(type));
          grand.set(col, this.merge(type, grand.get(col), acc));
        }
      }
      if (o.totals) record[totalInto] = finalize(type, g.total);
      grandTotal = this.merge(type, grandTotal, g.total);
      out.push(record);
    }

    if (o.totals) {
      const record: any = {};
      rowDims.forEach((d, i) => (record[d] = i === 0 ? (o.totalLabel ?? 'Total') : null));
      for (const col of ordered) {
        const acc = grand.get(col);
        record[prefix + col] = acc === undefined ? null : finalize(type, acc);
      }
      record[totalInto] = finalize(type, grandTotal);
      out.push(record);
    }

    return out;
  }

  /** Dimensions the structure declares, minus the ones spent on the column axis. */
  private defaultRows(colDims: string[]): string[] {
    try {
      return dimensionColumns(this.columnDirectory).filter((d) => !colDims.includes(d));
    } catch {
      return [];
    }
  }

  /** The `limit` most frequent column keys. */
  private resolveColumns(rows: any[], colKeyOf: (row: any) => string, limit: number): Set<string> {
    const freq = new Map<string, number>();
    for (const row of rows) {
      const k = colKeyOf(row);
      freq.set(k, (freq.get(k) ?? 0) + 1);
    }
    if (freq.size <= limit) return new Set(freq.keys());
    const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    this.omitted = freq.size - limit;
    return new Set(ranked.slice(0, limit).map(([k]) => k));
  }

  /** Stable output order: buckets sorted naturally, the tail last. */
  private orderColumns(seen: Set<string>, otherLabel: string | null): string[] {
    const cols = [...seen].filter((c) => c !== otherLabel);
    cols.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (otherLabel !== null && seen.has(otherLabel)) cols.push(otherLabel);
    return cols;
  }

  /**
   * Combine two accumulators of the same kind, for the totals row.
   *
   * Re-folding the finalized cell values would be wrong for anything that is
   * not a sum: an average of averages is not the average.
   */
  private merge(type: AggKind, a: any, b: any): any {
    switch (type) {
      case 'ratio':
        return { n: a.n + b.n, d: a.d + b.d };
      case 'sum':
      case 'count':
        return a + b;
      case 'countDistinct': {
        const s = new Set<string>(a);
        b.forEach((v: string) => s.add(v));
        return s;
      }
      default:
        return [...a, ...b];
    }
  }
}
