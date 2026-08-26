import { finalize, neuter, step, type AggSpec } from '../agg.js';
import { AbstractOp } from '../op.js';

/**
 * Rolls the frame up along `options.groupby`.
 *
 * How each measure folds comes from the structure, not from here: a column
 * declares its own `aggregation` specs, so one op produces `:sum`, `:avg`,
 * `:last` and ratio columns together, and a rate is accumulated as numerator
 * and denominator and divided once.
 */
export class Aggregate extends AbstractOp {
  ac = '__aggregate_col__';

  run(df: any): any {
    const aggFields = this.options.groupby;
    const aggs = this.columnDirectory.getDataStructureFor('uatu:aggregable');
    const data: any[] = df[0];
    const pagg: Record<string, any> = {};
    // The group key is a joined string, but the columns it was built from keep
    // their own values. Writing the split key back turned a Date into its
    // toString — downstream anything that ordered by that column fell back to
    // comparing "Fri…" against "Mon…" alphabetically.
    const keyValues: Record<string, any> = {};
    data.map((x) => {
      const f = aggFields.map((z: string) => x[z]).join('$$');
      x[this.ac] = f;
      keyValues[f] = Object.fromEntries(aggFields.map((z: string) => [z, x[z]]));
      pagg[f] = {};
      for (const col of aggs.columns) {
        for (const agg of col.aggregation) {
          pagg[f][agg.target] = this.neuter(agg.type);
        }
      }
      return x;
    });
    const pret = data.reduce((pv, cv) => {
      for (const col of aggs.columns) {
        for (const agg of col.aggregation) {
          pv[cv[this.ac]][agg.target] = this.agg(agg.type, pv[cv[this.ac]][agg.target], cv[col.column], agg, cv);
        }
      }
      return pv;
    }, pagg);
    const fret: any[] = [];
    for (const aggKey of Object.keys(pret)) {
      const dd = pret[aggKey];
      const ks = aggKey.split('$$');
      aggFields.forEach((e: string, i: number) => {
        // Prefer the value the rows actually carried; the split key is only a
        // fallback for a group nothing was captured for.
        dd[e] = keyValues[aggKey] ? keyValues[aggKey][e] : ks[i];
      });
      for (const col of aggs.columns) {
        for (const nagg of col.aggregation) {
          dd[nagg.target] = this.finalize(nagg.type, dd[nagg.target]);
        }
      }
      fret.push(dd);
    }
    return fret;
  }

  // The accumulators live in ../agg.ts so `pivot` folds values exactly the way
  // this op does. Kept as methods because they read as the op's own vocabulary.
  neuter(type: string): any {
    return neuter(type);
  }

  agg(type: string, target: any, value: any, spec?: AggSpec, fact?: any): any {
    return step(type, target, value, spec, fact);
  }

  finalize(type: string, target: any): any {
    return finalize(type, target);
  }
}
