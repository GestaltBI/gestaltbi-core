import { Injectable, Injector, Type } from '@angular/core';

import { DatastructureService } from './../datastructure/datastructure.service';
import { Op } from './op';

@Injectable({
  providedIn: 'root',
})
export class OpRegistryService {
  private registry: Map<string, Type<Op>> = new Map<string, Type<Op>>();

  constructor(
    private ds: DatastructureService, //
    private inj: Injector,
  ) {}

  register(name: string, op: Type<Op>) {
    this.registry.set(name, op);
  }

  get(name: string) {
    return this.registry.get(name);
  }

  instantiate(name: string, opts: any): Op {
    // instance creation here
    if (name) {
      const it = this.registry.get(name);
      const instance = new it(opts, this.ds, this.inj);
      return instance;
    } else {
      return null;
    }
  }
}
