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

  neuter(type: string): any {
    switch (type) {
      case 'ratio':
        return { n: 0, d: 0 };
      case 'sum':
        return 0;
      case 'avg':
      case 'last':
      case 'first':
      case 'min':
      case 'max':
      case 'median':
      case 'concat':
        return [];
      default:
        return null;
    }
  }

  agg(type: string, target: any, value: any, spec?: any, fact?: any): any {
    switch (type) {
      case 'ratio': {
        // Rates do not average. Accumulate numerator and denominator, divide once
        // in finalize, so the group's rate is the rate of the group.
        const n = parseFloat(fact?.[spec?.numerator]);
        const d = parseFloat(fact?.[spec?.denominator]);
        if (Number.isFinite(n)) target.n += n;
        if (Number.isFinite(d)) target.d += d;
        return target;
      }
      case 'sum':
        return target + parseFloat(value);
      case 'avg':
      case 'last':
      case 'first':
      case 'max':
      case 'min':
      case 'median':
        target.push(parseFloat(value));
        return target;
      case 'concat':
        target.push(value.toString());
        return target;
      default:
        return null;
    }
  }

  finalize(type: string, target: any): any {
    switch (type) {
      case 'ratio':
        return target.d === 0 ? null : target.n / target.d;
      case 'avg':
        const sum = target.reduce((a: number, b: number) => a + b, 0);
        return sum / target.length;
      case 'last':
        return target[target.length - 1];
      case 'first':
        return target[0];
      case 'max':
        return Math.max(...target);
      case 'min':
        return Math.min(...target);
      case 'median': {
        // Values arrive in scan order; a median of an unsorted list is not a median.
        const sorted = target.slice().sort((a: number, b: number) => a - b);
        if (sorted.length === 0) return null;
        if (sorted.length % 2 === 0) {
          const idxh = sorted.length / 2;
          return (sorted[idxh] + sorted[idxh - 1]) / 2;
        }
        return sorted[(sorted.length - 1) / 2];
      }
      case 'concat':
        return target.join(', ');
      default:
        return target;
    }
  }
}
