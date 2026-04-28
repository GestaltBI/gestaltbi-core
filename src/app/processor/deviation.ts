
import { Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { Enhance } from './op/enhance';

export class Deviation {
  stream1: Observable<any[]>;
  stream2: Observable<any[]>;
  prefixes: any[];
  fields: any[];

  data0: any;
  data1: any;

  outStream: Observable<any[]>;

  constructor(
    stream1: Observable<any[]>,
    stream2: Observable<any[]>,
    prefixes: any[],
    fields: any[],
    aggField: string = 'smartbi:product_code',
  ) {
    this.stream1 = stream1;
    this.stream2 = stream2;
    this.prefixes = prefixes;
    this.fields = fields;
    this.outStream = combineLatest([this.stream1, this.stream2])
      .pipe(
        map((data) => {
          console.log('combined', data);
          let data0 = this.pimp(this.prefixes[0], data[0], aggField);
          let data1 = this.pimp(this.prefixes[1], data[1], aggField);

          if (data0.length < data1.length) {
            const dataP = data1;
            data1 = data0;
            data0 = dataP;
          }

          const allData = data0
            .map((e, i) => {
              if (aggField === 'idx') {
                return [e, data1[i] || {}];
              } else {
                return [e, data1.filter((x) => x[aggField] === e[aggField])[0] || {}];
              }
            })
            .map((x) => {
              return Object.assign(x[0], x[1]);
            });
          return allData;
        }),
      )
      .pipe(
        map((data) => {
          return new Enhance({ columns: this.fields }, null, null).run([data, {}]);
        }),
      );
  }

  getStream(): Observable<any[]> {
    return this.outStream;
  }

  pimp(prefix, list, keep) {
    const nlist = JSON.parse(JSON.stringify(list));
    return nlist.map((x) => {
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
