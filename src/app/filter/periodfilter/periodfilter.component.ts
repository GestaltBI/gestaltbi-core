import { Component, Input, OnInit, forwardRef } from '@angular/core';
import moment from 'moment';

import { BasefilterComponent } from './../basefilter/basefilter.component';

@Component({
  standalone: false,
  selector: 'sbi-periodfilter',
  templateUrl: './periodfilter.component.html',
  styleUrls: ['./periodfilter.component.scss'],
  providers: [{ provide: BasefilterComponent, useExisting: forwardRef(() => PeriodfilterComponent) }],
})
export class PeriodfilterComponent extends BasefilterComponent implements OnInit {
  @Input() startAt;
  @Input() startFrom;
  @Input() startTo;
  data: any;

  ngOnInit(): void {
    if (this.startAt) {
      this.data = {
        startDate: moment()
          .subtract(this.startAt + 1, 'month')
          .toDate(),
        endDate: moment().subtract(this.startAt, 'month').toDate(),
      };
    } else {
      this.data = {};
      if (this.startFrom) {
        this.data.startDate = moment(this.startFrom).toDate();
      } else {
        this.data.startDate = moment('2020-01-01').toDate();
      }
      if (this.startTo) {
        this.data.endDate = moment(this.startTo).toDate();
      } else {
        this.data.endDate = moment('2020-12-31').toDate();
      }
    }
  }

  save(): any {
    const sd = moment(this.data.startDate).toDate();
    const ed = moment(this.data.endDate).toDate();
    return {
      'uatu:date': {
        between: [sd, ed],
      },
    };
  }

  reset(): any {
    const sd = moment().subtract(1, 'month').toDate();
    const ed = moment().toDate();
    return {
      'uatu:date': {
        between: [sd, ed],
      },
    };
  }

  configure(value) {
    if (value) {
      const sd = value['uatu:date'].between[0];
      const ed = value['uatu:date'].between[1];
      this.data = {
        startDate: moment(sd).toDate(),
        endDate: moment(ed).toDate(),
      };
    }
  }
}
