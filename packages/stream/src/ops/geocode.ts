import { forkJoin, type Observable } from 'rxjs';

import { AbstractOp } from '../op.js';

export class Geocode extends AbstractOp {
  public getExternal(): Observable<any> {
    const reqs = this.options.geocoding.map((x: any) => this.ctx.fetcher(x.file));
    return forkJoin(reqs);
  }

  public run(data: any[]): any {
    const points: { p?: any; r?: any } = {};
    points.p = data[1][0];
    points.r = data[1][1];

    data[0].forEach((x: any) => {
      this.options.geocoding.forEach((col: any) => {
        x[col.columns.lat] = points.p.features.filter(
          (a: any) => a.properties[col.field] === x[col.col],
        )[0]?.geometry.coordinates[0];
        x[col.columns.lon] = points.p.features.filter(
          (a: any) => a.properties[col.field] === x[col.col],
        )[0]?.geometry.coordinates[1];
      });
    });

    return data[0];
  }
}
