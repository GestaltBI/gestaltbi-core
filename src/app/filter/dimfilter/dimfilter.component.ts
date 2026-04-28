import { Component, Input, OnInit, forwardRef } from '@angular/core';

import { BasefilterComponent } from './../basefilter/basefilter.component';

@Component({
  standalone: false,
  selector: 'sbi-dimfilter',
  templateUrl: './dimfilter.component.html',
  styleUrls: ['./dimfilter.component.scss'],
  providers: [{ provide: BasefilterComponent, useExisting: forwardRef(() => DimfilterComponent) }],
})
export class DimfilterComponent extends BasefilterComponent implements OnInit {
  dims: any[];
  @Input() start: any = {};

  data = {};

  ngOnInit(): void {
    this.as.prepareDimensions();
    this.dims = this.as.getDimensions();
    this.data = JSON.parse(JSON.stringify(this.start));
  }

  save(): any {
    return this.data;
  }

  reset(): any {
    return JSON.parse(JSON.stringify(this.start));
  }
}
