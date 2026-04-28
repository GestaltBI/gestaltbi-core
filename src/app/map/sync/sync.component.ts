import { Component, OnInit } from '@angular/core';
import { BaseComponentWithLegend } from 'src/app/legend/base-component-with-legend';

import { BaseComponent } from './../../shared/base-component';

@Component({
  standalone: false,
  selector: 'sbi-map-sync',
  templateUrl: './sync.component.html',
  styleUrls: ['./sync.component.scss'],
})
export class SyncComponent extends BaseComponentWithLegend implements OnInit {
  data1: any;
  data2: any;

  ngOnInit(): void {
    setTimeout((_) => {
      this.ds.getProcessed('syncmap', 'syncA').subscribe((data) => {
        this.data1 = data;
      });
      this.ds.getProcessed('syncmap', 'syncB').subscribe((data) => {
        this.data2 = data;
      });
    }, 1000);
  }
}
