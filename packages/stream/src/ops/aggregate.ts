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
          pv[cv[this.ac]][agg.target] = this.agg(agg.type, pv[cv[this.ac]][agg.target], cv[col.column]);
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

  agg(type: string, target: any, value: any): any {
    switch (type) {
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
      case 'median':
        if (target.length % 2 === 0) {
          const idxh = target.length / 2;
          const idxl = idxh - 1;
          return (target[idxh] + target[idxl]) / 2;
        } else {
          return target[(target.length - 1) / 2];
        }
      case 'concat':
        return target.join(', ');
      default:
        return target;
    }
  }
}
