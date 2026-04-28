import { Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { empty, of } from 'rxjs';

import { DatastructureService } from './../datastructure/datastructure.service';

export interface Op {
  run(df: any): any;
  getExternal(): Observable<any>;
}

export abstract class AbstractOp implements Op {
  protected options: any;
  protected dss: DatastructureService;
  protected injector: Injector;
  constructor(opts: any, dss: DatastructureService, inj: Injector) {
    // console.log(opts, dss, inj);
    this.options = opts;
    this.dss = dss;
    this.injector = inj;
  }

  public getExternal(): Observable<any> {
    return of({});
  }

  public setOptions(options: any) {
    this.options = options;
  }
  public run(df: any): any {
    return df[0];
  }
}
