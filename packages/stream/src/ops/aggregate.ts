import { finalize, neuter, step, type AggSpec } from '../agg.js';
import { AbstractOp } from '../op.js';

export class Aggregate extends AbstractOp {
  ac = '__aggregate_col__';

  run(df: any): any {
    const aggFields = this.options.groupby;
    const aggs = this.columnDirectory.getDataStructureFor('uatu:aggregable');
    const data: any[] = df[0];
    const pagg: Record<string, any> = {};
    data.map((x) => {
      const f = aggFields.map((z: string) => x[z]).join('$$');
      x[this.ac] = f;
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
        dd[e] = ks[i];
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
