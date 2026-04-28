import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { AggregatorService } from './../../processor/aggregator.service';
import { Filter } from './../filter.interface';

@Component({
  standalone: false,
  selector: 'sbi-basefilter',
  templateUrl: './basefilter.component.html',
  styleUrls: ['./basefilter.component.scss'],
})
export class BasefilterComponent implements OnInit, Filter {
  constructor(public as: AggregatorService, public dss: DatastructureService) {}

  ngOnInit(): void {}

  save(): any {}

  reset(): void {}

  configure(value) {}
}
