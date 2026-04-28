
import { Observable, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { Deviation } from './deviation';
import { Geojsonify } from './op/geojsonify';

export class GeoDeviation {
  geocolumn;
  stream1;
  stream2;
  prefixes;
  fields;
  aggField;
  data0;
  data1;

  latField: string;
  lonField: string;

  outStream: Observable<any>;

  provs1: Map<string, any> = new Map<string, any>();
  provs2: Map<string, any> = new Map<string, any>();

  constructor(
    stream1: Observable<any>,
    stream2: Observable<any>,
    prefixes: [],
    fields: [],
    aggField: string = 'smartbi:delivery_pc',
    latField: string = 'smartbi:delivery_province_lat',
    lonField: string = 'smartbi:delivery_province_lon',
  ) {
    this.geocolumn = aggField;
    this.latField = latField;
    this.lonField = lonField;
    this.stream1 = stream1.pipe(
      tap((x) => {
        console.log('stream1', x);
      }),
      map((x) => {
        const ret = [];
        x.features.forEach((feature) => {
          this.provs1.set(feature[this.geocolumn], feature.geometry);
          ret.push(feature.properties);
        });
        return ret;
      }),
    );
    this.stream2 = stream2.pipe(
      tap((x) => {
        console.log('stream2', x);
      }),
      map((x) => {
        const ret = [];
        x.features.forEach((feature) => {
          this.provs2.set(feature[this.geocolumn], feature.geometry);
          ret.push(feature.properties);
        });
        return ret;
      }),
    );

    this.prefixes = prefixes;
    this.fields = fields;
    this.aggField = aggField;
    this.outStream = new Deviation(this.stream1, this.stream2, this.prefixes, this.fields, this.aggField)
      .getStream()
      .pipe(
        map((x) => {
          return {
            type: 'FeatureCollection',
            features: x.map((row) => {
              return {
                type: 'Feature',
                properties: row,
                geometry: {
                  type: 'Point',
                  coordinates: [
                    row[this.prefixes[0] + ':' + this.latField],
                    row[this.prefixes[0] + ':' + this.lonField],
                  ],
                },
              };
            }),
          };
        }),
        map((x) => {
          new Geojsonify({}, null, null).extractGeoJsonRange(x);
          return x;
        }),
      );
  }

  getStream(): Observable<any[]> {
    return this.outStream;
  }
}
