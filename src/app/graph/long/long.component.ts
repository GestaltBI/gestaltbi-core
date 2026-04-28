import { Component, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { GraphBaseComponent } from './../graph-base-component';

@Component({
  standalone: false,
  selector: 'sbi-graph-long',
  templateUrl: './long.component.html',
  styleUrls: ['./long.component.scss'],
})
export class LongComponent extends GraphBaseComponent implements OnInit {
  conf: any = this.ds.getProcessInfo('conf_longgraph');
  ngOnInit() {
    setTimeout(() => {
      combineLatest([
        this.ds.getProcessed('longgraph', this.conf.prefixes[0]),
        this.ds.getProcessed('longgraph', this.conf.prefixes[1]),
      ]).subscribe((data) => {
        this.rootDataA = this.graphService.truncateValues(data[0], 0);
        this.rootDataB = this.graphService.truncateValues(data[1], 0);

        this.chartOption = {
          legend: {
            data: [
              this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' A',
              this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' B',
            ],
          },
          tooltip: {
            show: true,
            formatter: (element, index) => {
              let res = '<b>' + element.name + '</b></br>';

              if (
                element.seriesName.substring(0, this.dynamicMeasure.column.label.length) ===
                this.dynamicMeasure.column.label
              ) {
                res += element.marker + element.seriesName + ': ' + element.value;
                if (this.dynamicMeasure.column.type === 'number:currency') {
                  res += '€';
                }
                res += '</br>';
              } else if (
                element.seriesName.substring(0, this.fixedMeasure.column.label.length) ===
                this.fixedMeasure.column.label
              ) {
                res += element.marker + element.seriesName + ': ' + element.value;
                if (this.fixedMeasure.column.type === 'number:currency') {
                  res += '€';
                }
                res += '</br>';
              }

              return res;
            },
          },
          xAxis: {
            data: this.xAxisData,
            splitLine: {
              show: false,
            },
            axisLabel: {
              rotate: 50,
              interval: 'auto',
            },
          },
          yAxis: {},
          series: [
            {
              name: this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' A',
              type: 'bar',
              data: this.data1,
              animationDelay: (idx) => {
                return idx * 10;
              },
            },
            {
              name: this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' B',
              type: 'bar',
              data: this.data2,
              animationDelay: (idx) => {
                return idx * 10 + 100;
              },
            },
          ],
          animationEasing: 'elasticOut',
          animationDelayUpdate: (idx) => {
            return idx * 5;
          },
        };

        this.onUpdateField();
      });
    }, 1000);
  }

  onUpdateField() {
    this.data1 = this.extractDataByField(this.rootDataA, this.dynamicMeasure.code);
    this.data2 = this.extractDataByField(this.rootDataB, this.dynamicMeasure.code);

    this.xAxisData = this.generateTimeLabel([this.rootDataB, this.dateFieldName]);

    this.mergeOption = {
      legend: {
        data: [
          this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' A',
          this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' B',
        ],
      },
      xAxis: {
        data: this.xAxisData,
      },
      series: [
        {
          name: this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' A',
          data: this.data1,
        },
        {
          name: this.dynamicMeasure.column.label + ' - ' + this.translateService.instant('graph.period') + ' B',
          data: this.data2,
        },
      ],
    };
  }
}
