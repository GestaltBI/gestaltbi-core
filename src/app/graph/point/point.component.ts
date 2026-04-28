import { Component, Injector, Input, OnInit } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { combineLatest } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base-component';
import { Measure } from 'src/app/shared/measure';

import { GraphService } from './../graph.service';
import { GraphBaseComponent } from '../graph-base-component';

@Component({
  standalone: false,
  selector: 'sbi-graph-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.scss'],
})
export class PointComponent extends GraphBaseComponent implements OnInit {
  conf: any = this.ds.getProcessInfo('conf_pointgraph');
  // misure fisse per il secondo grafico
  fixedMeasureA = new Measure(this.datastructureService.getLabel(this.conf.fixedMeasureA), this.conf.fixedMeasureA); // 1° barra
  fixedMeasureB = new Measure(this.datastructureService.getLabel(this.conf.fixedMeasureB), this.conf.fixedMeasureB); // 2° barra
  fixedMeasureC = new Measure(this.datastructureService.getLabel(this.conf.fixedMeasureC), this.conf.fixedMeasureC); // line

  doubleChartOption: any;
  doubleChartMergeOption: any;

  ngOnInit() {
    setTimeout(() => {
      combineLatest([this.ds.getProcessed(this.conf.name)]).subscribe((data) => {
        this.rootDataA = this.graphService.truncateValues(data[0], 0);
        this.chartOption = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              animation: false,
            },
            formatter: (value, index) => {
              let res = '<b>' + value[0].name + '</b></br>';
              value.forEach((element) => {
                if (element.seriesName === this.dynamicMeasure.column.label) {
                  res += element.marker + element.seriesName + ': ' + element.value;
                  if (this.dynamicMeasure.column.type === 'number:currency') {
                    res += '€';
                  }
                  res += '</br>';
                } else if (element.seriesName === this.fixedMeasure.column.label) {
                  res += element.marker + element.seriesName + ': ' + element.value;
                  if (this.fixedMeasure.column.type === 'number:currency') {
                    res += '€';
                  }
                  res += '</br>';
                }
              });
              return res;
            },
          },
          calculable: true,
          xAxis: {
            type: 'category',
            splitLine: {
              show: false,
            },
            axisLabel: {
              rotate: 50,
              interval: 'auto',
              formatter: (value, index) => {
                return value;
              },
            },
          },
          yAxis: {
            type: 'value',
            boundaryGap: [0, '100%'],
            splitLine: {
              show: false,
            },
            axisLabel: {
              formatter: (value, index) => {
                return value;
              },
            },
          },
          series: [
            {
              name: this.dynamicMeasure.column.label,
              type: 'line',
              smooth: true,
              hoverAnimation: false,
            },
            {
              name: this.fixedMeasure.column.label,
              type: 'line',
              smooth: true,
              showSymbol: false,
              hoverAnimation: false,
            },
          ],
        };
        this.doubleChartOption = {
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross',
              crossStyle: {
                color: '#999',
              },
            },
            formatter: (value, index) => {
              let res = '<b>' + value[0].name + '</b></br>';
              value.forEach((element) => {
                if (element.value) {
                  res +=
                    element.marker +
                    element.seriesName +
                    ': ' +
                    element.value.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
                  if (element.seriesName.indexOf('Cumul') >= 0) {
                    res += '€';
                  }
                  res += '</br>';
                }
              });
              return res;
            },
          },
          legend: {
            data: [this.fixedMeasureA.column.label, this.fixedMeasureB.column.label, this.fixedMeasureC.column.label],
          },
          xAxis: [
            {
              type: 'category',

              axisPointer: {
                type: 'shadow',
              },
              axisLabel: {
                rotate: 50,
                interval: 'auto',
                formatter: (value, index) => {
                  return value;
                },
              },
            },
          ],
          yAxis: [
            {
              type: 'value',
              axisLabel: {
                formatter: (value, index) => {
                  return value;
                },
              },
            },
            {
              type: 'value',
              axisLabel: {
                formatter: (value, index) => {
                  return value;
                },
              },
            },
          ],
          series: [
            {
              name: this.fixedMeasureA.column.label,
              type: 'bar',
              stack: 'one',
            },
            {
              name: this.fixedMeasureB.column.label,
              type: 'bar',
              stack: 'one',
            },
            {
              name: this.fixedMeasureC.column.label,
              type: 'line',
              smooth: true,
              yAxisIndex: 1,
            },
          ],
        };
        this.onUpdateField();
      });
    }, 1000);
  }

  onUpdateField(): void {
    this.mergeOption = {
      legend: {
        data: [this.dynamicMeasure.column.label, this.fixedMeasure.column.label],
      },
      xAxis: {
        data: this.generateTimeLabel([this.rootDataA]),
      },
      series: [
        {
          name: this.dynamicMeasure.column.label,
          data: this.extractDataByField(this.rootDataA, this.dynamicMeasure.code),
        },
        {
          name: this.fixedMeasure.column.label,
          data: this.extractDataByField(this.rootDataA, this.fixedMeasure.code),
        },
      ],
    };

    this.doubleChartMergeOption = {
      xAxis: [
        {
          data: this.generateTimeLabel([this.rootDataA]),
        },
      ],
      series: [
        {
          data: this.extractDataByField(this.rootDataA, this.fixedMeasureA.code),
        },
        {
          data: this.extractDataByField(this.rootDataA, this.fixedMeasureB.code),
        },
        {
          data: this.extractDataByField(this.rootDataA, this.fixedMeasureC.code),
        },
      ],
    };
  }
  refresh() {}
}
