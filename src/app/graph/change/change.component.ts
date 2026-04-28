import { Component, ElementRef, Injector, OnInit, Type } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { combineLatest, pipe } from 'rxjs';
import { map } from 'rxjs/internal/operators/map';
import { ColumnStructure } from 'src/app/datastructure/datastructure.service';
import { Deviation } from '@gestaltbi/stream';
import { Measure } from 'src/app/shared/measure';

import { GraphService } from './../graph.service';
import { GraphBaseComponent } from '../graph-base-component';
import { GraphComponent } from '../graph/graph.component';

@Component({
  standalone: false,
  selector: 'sbi-graph-change',
  templateUrl: './change.component.html',
  styleUrls: ['./change.component.scss'],
})
export class ChangeComponent extends GraphBaseComponent implements OnInit {
  echartsInstance: any;
  barChartInstance: any;
  mergeOptionA: any;
  mergeOptionB: any;
  tag = 'uatu:aggregate:change';
  conf: any = this.ds.getProcessInfo('conf_changegraph');
  revenue = new Measure(this.datastructureService.getFull(this.conf.revenue), this.conf.revenue);

  labels = [];
  barLabels = [];

  dataset = { source: [] };

  chartOption: any = {
    tooltip: {
      trigger: 'axis',
      showContent: true,
      formatter: (data) => {
        let body = '';
        if (data.length > 0) {
          body += data[0].data[0] + '</br>';
        }

        data.forEach((element) => {
          body += `${element.marker}${element.dimensionNames[element.componentIndex + 1]}: ${
            element.data[element.componentIndex + 1]
          }€</br>`;
        });
        return body;
      },
    },
    // dataset: this.dataset,
    xAxis: { type: 'category' },
    yAxis: {
      gridIndex: 0,
      axisLabel: {
        formatter: '{value} €',
      },
    },
    //  grid: { top: '55%' },
    legend: {
      type: 'scroll',
      data: this.datastructureService.getColumnsFor(this.tag, true).map((x) => this.datastructureService.getFull(x)),
    },
  };

  barChartOption = {
    id: 'bar',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: '{a0}: {c0}€</br>{a1}: {c1}€</br>{a2}: {c2}€</br>{a3}: {c3}€',
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      data: this.datastructureService.getColumnsFor(this.tag, true).map((x) => this.datastructureService.getFull(x)),
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
      data: [this.revenue.column.label],
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value} €',
      },
    },
  };

  ngOnInit() {
    setTimeout(() => {
      new Deviation(
        this.ds.getProcessed('changegraph', this.conf.prefixes[0]),
        this.ds.getProcessed('changegraph', this.conf.prefixes[1]),
        this.conf.prefixes,
        this.conf.rows,
        'idx',
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
    const measures = this.datastructureService.getColumnsFor(this.tag, true).map((x) => {
      return this.datastructureService.getLabel(x);
    });

    const revenueLabel = this.datastructureService.getLabel(this.conf.revenue);

    for (let i = 1; i < this.dataset.source.length; i += 1) {
      const element = this.dataset.source[i];

      const label = String(element[0]).slice(0, String(element[0]).length);
      if (measures.includes(label) && element[index + 1] !== undefined) {
        if (revenueLabel === label) {
          series.push({
            name: label,
            type: 'bar',
            stack: 'bar',
            label: {
              formatter: '',
              show: false,
              position: 'insideRight',
            },
            data: [0],
          });
        } else {
          series.push({
            name: label,
            type: 'bar',
            stack: 'bar',
            label: {
              formatter: '{c}€',
              show: true,
              position: 'insideRight',
            },
            data: [element[index]],
          });
        }
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

    const measures = this.datastructureService.getColumnsFor(this.tag, true).map((x) => {
      const label = this.datastructureService.getLabel(x);
      const mes = new Measure(label, x);
      console.log(mes);
      return mes;
    });
    console.log(measures);
    measures.forEach((element) => {
      const data = this.extractDataByField(this.rootDataA, element.code, 0);

      if (data[0] != null) {
        const rowData = [];

        data.forEach((el) => {
          rowData.push(el);
        });

        source.push([element.column.label].concat(rowData));

        this.labels.push(element.column.label);
        if (element.column.label !== this.revenue.column.label) {
          this.barLabels.push(element.column.label);
        }
      }
    });

    this.dataset.source = source;
    return source;
  }
}
