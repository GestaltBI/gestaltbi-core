import { Component, OnInit } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { BaseComponent } from 'src/app/shared/base-component';

@Component({
  standalone: false,
  selector: 'sbi-graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.scss'],
})
export class GraphComponent extends BaseComponent {
  chartOption: any = {
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },
    yAxis: {
      type: 'value',
    },
    series: [
      {
        data: [820, 932, 901, 934, 1290, 1330, 1320],
        type: 'line',
      },
    ],
  };
}
