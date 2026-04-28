import { AbstractOp } from '../op.js';

export class Geojsonify extends AbstractOp {
  geoj: any;

  public run(df: any): any {
    this.geoj = {
      type: 'FeatureCollection',
      features: [],
    };
    const geoLon = this.columnDirectory.getColumnsFor('gcx:lon');
    const geoLat = this.columnDirectory.getColumnsFor('gcx:lat');
    const features: any[] = [];
    df[0].forEach((row: any) => {
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

  public extractGeoJsonRange(object: any): void {
    const properties: Record<string, { min: number; max: number }> = {};

    object.features.forEach((feature: any) => {
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

  numberify(row: any): any {
    const nrow: Record<string, any> = {};
    for (const k of Object.keys(row)) {
      const pv = row[k];
      let nv: any = Number.parseFloat(row[k]);
      if (isNaN(nv)) nv = pv;
      nrow[k] = nv;
    }
    return nrow;
  }
}
