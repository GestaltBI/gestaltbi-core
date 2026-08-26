import { AbstractOp } from '../op.js';

/**
 * How to stack the frames, and whether to record where each row came from.
 */
export interface UnionOptions {
  /** Column to write each input's origin into, when you need to tell them apart. */
  sourceInto?: string;
  /** Names for each input, positionally. Defaults to the index. */
  sourceLabels?: string[];
  /** Drop rows whose values for these columns have already been seen. */
  distinctOn?: string[];
}

/**
 * Stack several frames into one.
 *
 * The simplest thing two branches can do once the graph allows them: last year
 * and this year, two regions prepared differently, a forecast beside an actual.
 * Rows keep their own columns — a column missing from one input is simply
 * absent on those rows rather than filled with a zero nobody measured.
 *
 * `sourceInto` writes which branch each row came from, which is usually what
 * makes the union worth doing: it turns the origin into a dimension you can
 * then group by.
 */
export class Union extends AbstractOp {
  /** Anything from two upwards; the graph decides. */
  public override readonly inputs = Number.MAX_SAFE_INTEGER;

  public override runAll(inputs: any[]): any {
    const o: UnionOptions = this.options ?? {};
    const frames = (inputs ?? []).map((f) => (Array.isArray(f) ? f : []));

    const out: any[] = [];
    frames.forEach((frame, i) => {
      const label = o.sourceLabels?.[i] ?? String(i);
      for (const row of frame) {
        out.push(o.sourceInto ? { ...row, [o.sourceInto]: label } : row);
      }
    });

    if (!o.distinctOn?.length) return out;

    const seen = new Set<string>();
    return out.filter((row) => {
      const key = JSON.stringify(o.distinctOn!.map((c) => row[c] ?? null));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
