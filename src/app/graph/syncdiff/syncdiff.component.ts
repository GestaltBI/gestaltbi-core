import { Component, OnInit } from '@angular/core';
import { Deviation } from 'src/app/processor/deviation';
import { Measure } from 'src/app/shared/measure';

import { GraphBaseComponent } from '../graph-base-component';

@Component({
  standalone: false,
  selector: 'sbi-syncdiff',
  templateUrl: './syncdiff.component.html',
  styleUrls: ['./syncdiff.component.scss'],
})
export class SyncdiffComponent extends GraphBaseComponent implements OnInit {
  conf: any = this.ds.getProcessInfo('conf_diffgraph');
  ngOnInit() {
    setTimeout(() => {
      new Deviation(
        this.ds.getProcessed('diffgraph', this.conf.prefixes[0]),
        this.ds.getProcessed('diffgraph', this.conf.prefixes[1]),
        this.conf.prefixes,
        this.conf.rows,
      )
        .getStream()
        .subscribe((data) => {
          this.rootDataA = this.graphService.truncateValues(data, 0);
          this.rootDataB = this.graphService.truncateValues(data, 0);
          this.onUpdateField();
          this.fixedMeasure = new Measure(this.datastructureService.getLabel(this.conf.revenue), this.conf.revenue);
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
                    if (this.dynamicMeasure.column.type === 'number:currency') {
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
              },
            },
            yAxis: {
              type: 'value',
              boundaryGap: [0, '100%'],
              splitLine: {
                show: false,
              },
            },
            series: [
              {
                type: 'line',
                smooth: true,
              },
              {
                type: 'line',
                smooth: true,
              },
            ],
          };
        });
    }, 1000);
  }

  onUpdateField(): void {
    this.xAxisData = this.generateTimeLabel([this.rootDataA, this.rootDataB]);
    this.data1 = this.extractDataByField(this.rootDataA, this.dynamicMeasure.code);
    this.data2 = this.extractDataByField(this.rootDataB, this.fixedMeasure.code);

    this.mergeOption = {
      legend: {
        data: [this.dynamicMeasure.column.label, this.fixedMeasure.column.label],
      },
      xAxis: {
        data: this.xAxisData,
      },
      series: [
        {
          name: this.dynamicMeasure.column.label,
          data: this.data1,
        },
        {
          name: this.fixedMeasure.column.label,
          data: this.data2,
        },
      ],
    };
  }

  refresh() {}
}
