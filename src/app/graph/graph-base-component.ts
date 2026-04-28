import { DoCheck } from '@angular/core';
import { Component, Injector, Input, SimpleChanges } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import type { EChartsOption } from 'echarts';
import moment from 'moment';

import { DatastructureService } from '../datastructure/datastructure.service';
import { BaseComponentWithLegend } from '../legend/base-component-with-legend';
import { BaseComponent } from '../shared/base-component';
import { Measure } from '../shared/measure';
import { GraphService } from './graph.service';

@Component({ template: '' })
export abstract class GraphBaseComponent extends BaseComponentWithLegend implements DoCheck {
  conf: any = this.ds.getProcessInfo('conf_basegraph');
  @Input() xAxisData: string[] = [];
  @Input() startingDynamicMeasure = this.conf.startingDynamicMeasure;
  @Input() startingFixedMeasure = this.conf.startingFixedMeasure;
  @Input() tag = 'uatu:aggregate';
  dateFieldName = 'uatu:date';
  mergeOption: any;
  rootDataA: any;
  rootDataB: any;
  rootDataTime: any; // optional, not needed for now
  oldSelectedMeasure: Measure;
  measures: Measure[];
  graphService: GraphService;
  translateService: TranslateService;
  datastructureService: DatastructureService;

  private _dynamicMeasure: Measure;
  @Input() set dynamicMeasure(value: Measure) {
    this._dynamicMeasure = value;
    this.onUpdateField();
  }
  get dynamicMeasure() {
    if (this._dynamicMeasure === undefined) {
      return new Measure(this.datastructureService.getLabel(this.startingDynamicMeasure), this.startingDynamicMeasure);
    }
    return this._dynamicMeasure;
  }

  private _fixedMeasure: Measure;
  @Input() set fixedMeasure(value: Measure) {
    this._fixedMeasure = value;
    this.onUpdateField();
  }
  get fixedMeasure() {
    if (this._fixedMeasure === undefined) {
      return new Measure(this.datastructureService.getLabel(this.startingFixedMeasure), this.startingFixedMeasure);
    }
    return this._fixedMeasure;
  }

  private _data1: any[] = [];
  set data1(value: any[]) {
    this._data1 = value;
  }

  get data1() {
    return this._data1;
  }

  private _data2: any[] = [];
  set data2(value: any[]) {
    this._data2 = value;
  }

  get data2() {
    return this._data2;
  }

  @Input() chartOption: any;

  theme: any;

  constructor(public injector: Injector) {
    super(injector);
    this.translateService = injector.get(TranslateService);
    this.graphService = injector.get(GraphService);
    this.datastructureService = injector.get(DatastructureService);
    if (this.graphService.theme === undefined) {
      this.graphService.getTheme().subscribe((data) => {
        this.theme = data;
      });
    } else {
      this.theme = this.graphService.theme;
    }
    this.measures = this.datastructureService.getColumnsFor(this.tag, true).map((x) => {
      return new Measure(this.datastructureService.getLabel(x), x);
    });
  }

  ngDoCheck(): void {
    if (this.selectedMeasure !== this.oldSelectedMeasure) {
      this.oldSelectedMeasure = this.selectedMeasure;
      this.dynamicMeasure = this.selectedMeasure;
    }
  }

  extractDataByField(rootData: any, key: string, fill?: any): any[] {
    const data = [];
    rootData.forEach((element) => {
      if (element[key] !== undefined) {
        if (key === this.dateFieldName && moment(element[key]).isValid()) {
          data.push(moment(element[key]).format('DD/MM/YYYY'));
        } else {
          data.push(parseFloat(element[key]));
        }
      } else {
        data.push(fill);
      }
    });
    return data;
  }

  generateLabel(rootData: any[], label: string): any[] {
    const size: number[] = [];
    rootData.forEach((element) => {
      size.push(element.length);
    });
    const max = Math.max.apply(null, size);
    const res = Array(max);
    for (let index = 0; index < res.length; index++) {
      res[index] = label + ' ' + (index + 1);
    }

    return res;
  }

  generateTimeLabel(rootData: any[]) {
    return this.generateLabel(rootData, this.translateService.instant('graph.day'));
  }

  abstract onUpdateField(): void;
}
