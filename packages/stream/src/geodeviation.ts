import { type Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { Deviation } from './deviation.js';
import type { OpContext } from './op.js';
import { Geojsonify } from './ops/geojsonify.js';

/**
 * Like Deviation but reshapes both upstream GeoJSON FeatureCollections into
 * row-oriented data first, joins, then re-wraps the result as GeoJSON for
 * map rendering.
 */
export class GeoDeviation {
  geocolumn: string;
  stream1: Observable<any>;
  stream2: Observable<any>;
  prefixes: any[];
  fields: any[];
  aggField: string;

  latField: string;
  lonField: string;

  outStream: Observable<any>;

  provs1: Map<string, any> = new Map<string, any>();
  provs2: Map<string, any> = new Map<string, any>();

  constructor(
    stream1: Observable<any>,
    stream2: Observable<any>,
    prefixes: any[],
    fields: any[],
    aggField = 'smartbi:delivery_pc',
    latField = 'smartbi:delivery_province_lat',
    lonField = 'smartbi:delivery_province_lon',
    ctx?: OpContext,
  ) {
    this.geocolumn = aggField;
    this.latField = latField;
    this.lonField = lonField;

    this.stream1 = stream1.pipe(
      map((x) => {
        const ret: any[] = [];
        x.features.forEach((feature: any) => {
          this.provs1.set(feature[this.geocolumn], feature.geometry);
          ret.push(feature.properties);
        });
        return ret;
      }),
    );
    this.stream2 = stream2.pipe(
      map((x) => {
        const ret: any[] = [];
        x.features.forEach((feature: any) => {
          this.provs2.set(feature[this.geocolumn], feature.geometry);
          ret.push(feature.properties);
        });
        return ret;
      }),
    );

    this.prefixes = prefixes;
    this.fields = fields;
    this.aggField = aggField;

    this.outStream = new Deviation(this.stream1, this.stream2, this.prefixes, this.fields, this.aggField, ctx)
      .getStream()
      .pipe(
        map((x) => ({
          type: 'FeatureCollection',
          features: x.map((row: any) => ({
            type: 'Feature',
            properties: row,
            geometry: {
              type: 'Point',
              coordinates: [
                row[this.prefixes[0] + ':' + this.latField],
                row[this.prefixes[0] + ':' + this.lonField],
              ],
            },
          })),
        })),
        map((x: any) => {
          new Geojsonify({}, ctx as OpContext).extractGeoJsonRange(x);
          return x;
        }),
      );
  }

  getStream(): Observable<any[]> {
    return this.outStream;
  }
}
