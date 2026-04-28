import { Inject } from '@angular/core';

import { FilterService } from '../filter.service';
import { AbstractOp } from '../op';

@Inject({})
export class ClearEmpty extends AbstractOp {
  public run(df: any): any {
    return df[0].filter((x) => x.id !== '');
  }
}
