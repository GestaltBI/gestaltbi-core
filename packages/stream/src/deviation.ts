import { combineLatest, type Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { OpContext } from './op.js';
import { Enhance } from './ops/enhance.js';

/**
 * Joins two streams on `aggField`, optionally pads, then applies an Enhance
 * pass to compute derived fields. Used by the diff/change visualizations.
 */
export class Deviation {
  stream1: Observable<any[]>;
  stream2: Observable<any[]>;
  prefixes: any[];
  fields: any[];

  outStream: Observable<any[]>;

  constructor(
    stream1: Observable<any[]>,
    stream2: Observable<any[]>,
    prefixes: any[],
    fields: any[],
    aggField = 'smartbi:product_code',
    ctx?: OpContext,
  ) {
    this.stream1 = stream1;
    this.stream2 = stream2;
    this.prefixes = prefixes;
    this.fields = fields;

    this.outStream = combineLatest([this.stream1, this.stream2])
      .pipe(
        map((data) => {
          let data0 = this.pimp(this.prefixes[0], data[0], aggField);
          let data1 = this.pimp(this.prefixes[1], data[1], aggField);

          if (data0.length < data1.length) {
            const dataP = data1;
            data1 = data0;
            data0 = dataP;
          }

          return data0
            .map((e: any, i: number) => {
              if (aggField === 'idx') {
                return [e, data1[i] || {}];
              } else {
                return [e, data1.filter((x: any) => x[aggField] === e[aggField])[0] || {}];
              }
            })
            .map((x: any) => Object.assign(x[0], x[1]));
        }),
      )
      .pipe(
        map((data) => {
          return new Enhance({ columns: this.fields }, ctx as OpContext).run([data, {}]);
        }),
      );
  }

  getStream(): Observable<any[]> {
    return this.outStream;
  }

  pimp(prefix: string, list: any[], keep: string): any[] {
    const nlist = JSON.parse(JSON.stringify(list));
    return nlist.map((x: any) => {
      for (const k of Object.keys(x)) {
        if (k !== keep) {
          x[prefix + ':' + k] = x[k];
          delete x[k];
        }
      }
      return x;
    });
  }
}
