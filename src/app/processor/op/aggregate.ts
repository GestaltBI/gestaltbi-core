import { Inject } from '@angular/core';

import { AbstractOp } from '../op';

@Inject({})
export class Aggregate extends AbstractOp {
  ac = '__aggregate_col__';

  run(df: any) {
    const aggFields = this.options.groupby;
    const aggs = this.dss.getDataStructureFor('uatu:aggregable');
    const data: any[] = df[0];
    const pagg = {};
    const adata = data.map((x) => {
      const f = aggFields.map((z) => x[z]).join('$$');
      x[this.ac] = f;
      pagg[f] = {};
      for (const col of aggs.columns) {
        for (const agg of col.aggregation) {
          pagg[f][agg.target] = this.neuter(agg.type);
        }
      }
      return x;
    });
    const pret = data.reduce((pv, cv, ci, a) => {
      for (const col of aggs.columns) {
        for (const agg of col.aggregation) {
          pv[cv[this.ac]][agg.target] = this.agg(agg.type, pv[cv[this.ac]][agg.target], cv[col.column]);
        }
      }
      return pv;
    }, pagg);
    const fret = [];
    for (const agg of Object.keys(pret)) {
      const dd = pret[agg];
      const ks = agg.split('$$');
      aggFields.forEach((e, i) => {
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

  neuter(type) {
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

  agg(type, target, value) {
    switch (type) {
      case 'sum':
        return target + parseFloat(value);
      case 'avg':
        target.push(parseFloat(value));
        return target;
      case 'last':
        target.push(parseFloat(value));
        return target;
      case 'first':
        target.push(parseFloat(value));
        return target;
      case 'max':
        target.push(parseFloat(value));
        return target;
      case 'min':
        target.push(parseFloat(value));
        return target;
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

  finalize(type, target) {
    switch (type) {
      case 'avg':
        const sum = target.reduce((a, b) => a + b, 0);
        return sum / target.length;
      case 'last':
        return target[target.length - 1];
      case 'first':
        return target[0];
      case 'max':
        return Math.max(target);
      case 'min':
        return Math.min(target);
      case 'median':
        if (target.length % 2 === 0) {
          const idxh = target.length / 2;
          const idxl = idxh - 1;

          const vh = target[idxh];
          const vl = target[idxl];

          return (vh + vl) / 2;
        } else {
          const idxh = (target.length - 1) / 2;
          return target[idxh];
        }
      case 'concat':
        return target.join(', ');
      default:
        return target;
    }
  }
}
