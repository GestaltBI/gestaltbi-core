import moment from 'moment';

import { AbstractOp } from '../op.js';

export class Format extends AbstractOp {
  public run(df: any): any {
    const ret = df[0];
    ret.map((row: any) => {
      if (this.options.dateTag) {
        this.columnDirectory.getColumnsFor(this.options.dateTag).forEach((col) => {
          row[col] = this.parseDate(row[col]);
        });
      }
      if (this.options.numberTag) {
        this.columnDirectory.getColumnsFor(this.options.numberTag).forEach((col) => {
          if (Object.keys(row).indexOf(col) >= 0) {
            row[col] = this.cleanNumber(row[col]);
          }
        });
      }
    });
    return ret;
  }

  parseDate(date: any): Date {
    return moment(date, this.options.dateFormat).toDate();
  }

  cleanNumber(num: any): number | any {
    if (typeof num === 'string') {
      return parseFloat(num.replace('.', '').replace(',', '.').replace('€', '').replace('$', '').trim());
    }
    return num;
  }
}
