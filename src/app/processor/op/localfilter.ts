
import { Inject } from '@angular/core';

import { FilterService } from './../filter.service';
import { AbstractFilter } from './abstractfilter';

@Inject({})
export class LocalFilter extends AbstractFilter {
  fs: FilterService;

  public run(df: any): any {
    if (this.options.identifier) {
      this.fs = this.injector.get(FilterService);
      const filter = this.fs.getFilter(this.options.identifier);
      console.log(filter);
      return df[0].filter((x) => {
        return this.doFilter(x, filter);
      });
    } else {
      return df[0];
    }
  }
}
