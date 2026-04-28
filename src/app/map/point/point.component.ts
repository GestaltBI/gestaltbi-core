import { Component, OnInit } from '@angular/core';
import { BaseComponentWithLegend } from 'src/app/legend/base-component-with-legend';

import { BaseComponent } from './../../shared/base-component';

@Component({
  standalone: false,
  selector: 'sbi-map-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.scss'],
})
export class PointComponent extends BaseComponentWithLegend implements OnInit {
  data: any;

  ngOnInit(): void {
    setTimeout((_) => {
      this.ds.getProcessed('pointmap').subscribe((data) => {
        this.data = data;
      });
    }, 1000);
  }
}
