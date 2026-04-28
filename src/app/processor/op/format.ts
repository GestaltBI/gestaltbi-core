import { Inject } from '@angular/core';
import moment from 'moment';

import { FilterService } from '../filter.service';
import { AbstractOp } from '../op';

@Inject({})
export class Format extends AbstractOp {
  public run(df: any): any {
    const ret = df[0];
    ret.map((row) => {
      if (this.options.dateTag) {
        this.dss.getColumnsFor(this.options.dateTag).forEach((col) => {
          row[col] = this.parseDate(row[col]);
        });
      }
      if (this.options.numberTag) {
        this.dss.getColumnsFor(this.options.numberTag).forEach((col) => {
          if (Object.keys(row).indexOf(col) >= 0) {
            row[col] = this.cleanNumber(row[col]);
          }
        });
      }
    });
    return ret;
  }

  parseDate(date): any {
    return moment(date, this.options.dateFormat).toDate();
  }

  cleanNumber(num) {
    if (typeof num === 'string') {
      return parseFloat(num.replace('.', '').replace(',', '.').replace('€', '').replace('$', '').trim());
    } else {
      return num;
    }
  }
}
