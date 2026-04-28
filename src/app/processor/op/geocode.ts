import { HttpClient } from '@angular/common/http';
import { Inject } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';

import { AbstractOp } from '../op';

// tslint:disable:max-line-length

@Inject({})
export class Geocode extends AbstractOp {
  public getExternal(): Observable<any> {
    const http: HttpClient = this.injector.get(HttpClient);
    const reqs = this.options.geocoding.map((x) => http.get(x.file));
    return forkJoin(reqs);
  }

  public run(data: any[]): any {
    const points: { p?; r? } = {};
    points.p = data[1][0];
    points.r = data[1][1];

    data[0].forEach((x) => {
      this.options.geocoding.forEach((col) => {
        x[col.columns.lat] = points.p.features.filter(
          (a) => a.properties[col.field] === x[col.col],
        )[0]?.geometry.coordinates[0];
        x[col.columns.lon] = points.p.features.filter(
          (a) => a.properties[col.field] === x[col.col],
        )[0]?.geometry.coordinates[1];
      });
    });

    return data[0];
  }
}
