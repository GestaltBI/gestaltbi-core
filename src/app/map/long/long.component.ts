import { Component, OnInit } from '@angular/core';

import { BaseComponentWithLegend } from '../../legend/base-component-with-legend';

@Component({
  standalone: false,
  selector: 'sbi-map-long',
  templateUrl: './long.component.html',
  styleUrls: ['./long.component.scss'],
})
export class LongComponent extends BaseComponentWithLegend implements OnInit {
  dataA: any;
  dataB: any;

  ngOnInit(): void {
    setTimeout((_) => {
      this.ds.getProcessed('longmap', 'longA').subscribe((data) => {
        this.dataA = data;
      });
      this.ds.getProcessed('longmap', 'longB').subscribe((data) => {
        this.dataB = data;
      });
    }, 1000);
  }
}
