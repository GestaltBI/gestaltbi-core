import { Component, OnInit } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { Deviation } from '@gestaltbi/stream';

import { GraphBaseComponent } from '../graph-base-component';

@Component({
  standalone: false,
  selector: 'sbi-syncchange',
  templateUrl: './syncchange.component.html',
  styleUrls: ['./syncchange.component.scss'],
})
export class SyncchangeComponent extends GraphBaseComponent implements OnInit {
  conf: any = this.ds.getProcessInfo('conf_syncchangegraph');
  echartsInstance: any;
  barChartInstance: any;
  mergeOptionA: any;
  mergeOptionB: any;
  tag = 'uatu:aggregate:change';
  labels = [];
  barLabels = [];

  dataset = { source: [] };

  chartOption: any = {
    tooltip: {
      trigger: 'axis',
      showContent: true,
      formatter: (d) => {
        return parseFloat(d).toFixed(2);
      },
    },
    // dataset: this.dataset,
    xAxis: { type: 'category' },
    yAxis: { gridIndex: 0 },
    //  grid: { top: '55%' },
    legend: {
      type: 'scroll',
      data: this.datastructureService.getColumnsFor(this.tag, true).map((x) => {
        return this.datastructureService.getLabel(x);
      }),
    },
  };

  barChartOption = {
    id: 'bar',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      data: this.datastructureService.getColumnsFor(this.tag, true),
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '10%',
      top: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['summary'],
    },
    yAxis: {
      type: 'value',
    },
  };

  ngOnInit() {
    setTimeout(() => {
      new Deviation(
        this.ds.getProcessed('changegraph', this.conf.prefixes[0]),
        this.ds.getProcessed('changegraph', this.conf.prefixes[1]),
        this.conf.prefixes,
        this.conf.rows,
      )
        .getStream()
        .subscribe((data) => {
          this.rootDataA = this.graphService.truncateValues(data, 0);

          this.onUpdateField();
          this.fixedMeasure = this.conf.revenue;
        });
    }, 1000);
  }

  onBarChartInit(ec) {
    this.barChartInstance = ec;
  }

  onChartInit(ec) {
    this.echartsInstance = ec;
    this.echartsInstance.on('updateAxisPointer', (event) => {
      const xAxisInfo = event.axesInfo[0];
      if (xAxisInfo) {
        const dimension = xAxisInfo.value + 1; // pos 0 has tagnames
        this.barChartInstance.setOption({
          series: this.createSeries(dimension),
        });
      }
    });
  }

  createSeries(index: number): any {
    const series = [];
    const measures = this.datastructureService.getColumnsFor(this.tag, true);
    for (let i = 1; i < this.dataset.source.length; i += 1) {
      const element = this.dataset.source[i];

      const label = String(element[0]).slice(0, String(element[0]).length);
      if (measures.includes(label) && element[index + 1] !== undefined) {
        series.push({
          name: label,
          type: 'bar',
          stack: 'bar',
          label: {
            show: true,
            position: 'insideRight',
          },
          data: [element[index]],
        });
      }
    }

    return series;
  }

  onUpdateField(): void {
    this.xAxisData = this.generateTimeLabel([this.rootDataA]);
    const source = this.createSource();
    const series = [];
    for (let index = 0; index < source.length - 1; index++) {
      series.push({ type: 'line', smooth: true, seriesLayoutBy: 'row' });
    }

    this.mergeOptionA = {
      legend: {
        data: this.labels,
      },
      dataset: {
        source,
      },
      series,
    };

    this.mergeOptionB = {
      legend: {
        data: this.barLabels,
      },
    };
  }

  createSource(): any[] {
    const source = [];
    source.push(['labels'].concat(this.xAxisData));

    const measures = this.datastructureService.getColumnsFor(this.tag, true);
    measures.forEach((element) => {
      const data = this.extractDataByField(this.rootDataA, element);

      if (data[0] != null) {
        const rowData = [];

        data.forEach((el) => {
          rowData.push(el);
        });

        source.push([element].concat(rowData));

        this.labels.push(element);
        this.barLabels.push(element);
      }
    });
    this.dataset.source = source;
    return source;
  }
}
