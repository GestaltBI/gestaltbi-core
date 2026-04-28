import { Inject } from '@angular/core';

import { FilterService } from './../filter.service';
import { AbstractOp } from '../op';
import { AbstractFilter } from './abstractfilter';

@Inject({})
export class GlobalFilter extends AbstractFilter {
  fs: FilterService;

  public run(df: any): any {
    this.fs = this.injector.get(FilterService);
    const filter = this.fs.getFilter();
    console.log(filter);
    if (filter) {
      return df[0].filter((x) => {
        return this.doFilter(x, filter);
      });
    } else {
      return df[0];
    }
  }
}
