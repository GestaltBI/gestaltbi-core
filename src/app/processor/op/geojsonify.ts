import { Inject } from '@angular/core';

import { AbstractOp } from '../op';

@Inject({})
export class Geojsonify extends AbstractOp {
  geoj: any;

  public run(df: any): void {
    this.geoj = {
      type: 'FeatureCollection',
      features: [],
    };
    const geoLon = this.dss.getColumnsFor('gcx:lon');
    const geoLat = this.dss.getColumnsFor('gcx:lat');
    const features = [];
    df[0].forEach((row) => {
      features.push({
        type: 'Feature',
        properties: this.numberify(row),
        geometry: { type: 'Point', coordinates: [row[geoLat[0]], row[geoLon[0]]] },
      });
    });
    this.geoj.features = features;

    this.extractGeoJsonRange(this.geoj);

    return this.geoj;
  }

  public extractGeoJsonRange(object: any) {
    const properties = {};

    object.features.forEach((feature) => {
      for (const key of Object.keys(feature.properties)) {
        if (!isNaN(feature.properties[key])) {
          if (properties[key] === undefined) {
            properties[key] = {
              min: feature.properties[key],
              max: feature.properties[key],
            };
          } else {
            if (feature.properties[key] > properties[key].max) {
              properties[key].max = feature.properties[key];
            }
            if (feature.properties[key] < properties[key].min) {
              properties[key].min = feature.properties[key];
            }
          }
        }
      }
    });

    object.properties = properties;
  }

  numberify(row) {
    const nrow = {};
    for (const k of Object.keys(row)) {
      const pv = row[k];
      let nv = pv;
      nv = Number.parseFloat(row[k]);
      if (isNaN(nv)) {
        nv = pv;
      }
      nrow[k] = nv;
    }
    return nrow;
  }
}
