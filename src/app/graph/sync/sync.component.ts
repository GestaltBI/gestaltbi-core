import { Component, OnInit } from '@angular/core';
import type { EChartsOption } from 'echarts';
import { combineLatest } from 'rxjs';

import { GraphBaseComponent } from '../graph-base-component';

@Component({
  standalone: false,
  selector: 'sbi-graph-sync',
  templateUrl: './sync.component.html',
  styleUrls: ['./sync.component.scss'],
})
export class SyncComponent extends GraphBaseComponent implements OnInit {
  conf: any = this.ds.getProcessInfo('conf_syncgraph');
  barChartOption: any;
  pieChartOption: any;
  sankeyChartOption: any;
  bubbleChartOption: any;

  barMergeOption: any;
  pieMergeOption: any;
  sankeyMergeOptionA: any;
  sankeyMergeOptionB: any;
  bubbleMergeOption: any;

  barFilterField = this.conf.barFilterField; // top N customers
  pieFilterField = this.conf.pieFilterField; // top N products

  bubbleRootField = this.conf.bubbleRootField; // raggruppo tutto per prodotti, cosi li risommo
  bubbleXField = this.conf.bubbleXField; // sommo e divido per il numero di prodotti unici
  bubbleYField = this.conf.bubbleYField; // sommo tutte le quantità dei prodotti trovati

  bubbleSizeField = this.conf.bubbleSizeField; // sommo tutti i redditi trovati

  sankeyRootField = this.conf.sankeyRootField; // can be smartbi:delivery_state
  sankeyFirstLevelField = this.conf.sankeyFirstLevelField;
  sankeySecondLevelField = this.conf.sankeySecondLevelField;

  ngOnInit() {
    setTimeout(() => {
      combineLatest([
        this.ds.getProcessed(this.conf.name, this.conf.prefixes[0]),
        this.ds.getProcessed(this.conf.name, this.conf.prefixes[1]),
      ]).subscribe((data) => {
        this.rootDataA = this.graphService.truncateValues(data[0], 0);
        this.rootDataB = this.graphService.truncateValues(data[1], 0);

        this.setupBarChart();
        this.setupPieChart();
        this.setupSankeyChart();
        this.setupBubbleChart();
        this.onUpdateField();
      });
    }, 1000);
  }

  setupBarChart(): void {
    this.barChartOption = {
      tooltip: {
        //  trigger: 'grid',
        axisPointer: {
          type: 'shadow',
        },

        formatter: (element, index) => {
          let res = '<b>' + element.name + '</b></br>';

          res += element.marker + element.seriesName + ': ' + element.value;
          if (this.dynamicMeasure.column.type === 'number:currency') {
            res += '€';
          }

          res += '</br>';

          return res;
        },
      },
      legend: {
        data: [
          this.translateService.instant('graph.focus') + ' A',
          this.translateService.instant('graph.focus') + ' B',
        ],
        selectedMode: false,
      },
      grid: [
        { left: '7%', top: '7%', width: '38%', height: '80%', containLabel: true },
        { right: '7%', top: '7%', width: '38%', height: '80%', containLabel: true },
      ],
      xAxis: [
        {
          gridIndex: 0,
          type: 'value',
          boundaryGap: [0, 0.01],
        },
        {
          gridIndex: 1,
          type: 'value',
          boundaryGap: [0, 0.01],
        },
      ],
      yAxis: [
        {
          gridIndex: 0,
          type: 'category',
        },
        {
          gridIndex: 1,
          type: 'category',
        },
      ],
      series: [
        {
          xAxisIndex: 0,
          yAxisIndex: 0,
          name: this.translateService.instant('graph.focus') + ' A',
          type: 'bar',
        },
        {
          xAxisIndex: 1,
          yAxisIndex: 1,
          name: this.translateService.instant('graph.focus') + ' B',
          type: 'bar',
        },
      ],
    };
  }

  setupPieChart(): void {
    this.pieChartOption = {
      title: [
        {
          text: this.translateService.instant('graph.focus') + ' A',
          left: '12.5%',
          // top: "left",
          textStyle: {
            fontSize: 30,
          },
          subtextStyle: {
            fontSize: 20,
          },
        },
        {
          text: this.translateService.instant('graph.focus') + ' B',

          left: '62.5%',
          // top: "left",
          textStyle: {
            fontSize: 30,
          },
          subtextStyle: {
            fontSize: 20,
          },
        },
      ],
      tooltip: {
        trigger: 'item',
        formatter: (element, index) => {
        
          let res = element.marker + '<b>' + element.name + ': ' + element.percent + '%</b></br>';

          res += element.value;
          if (this.dynamicMeasure.column.type === 'number:currency') {
            res += '€';
          }

          res += '</br>';

          return res;
        },
      },
      legend: {
        orient: 'vertical',
        left: '0%',
      },
      series: [
        {
          type: 'pie',
          radius: '50%',
          center: ['25%', '50%'],
          animation: true,
          label: {
            position: 'outer',
            alignTo: 'none',
            bleedMargin: 5,
          },
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        {
          type: 'pie',
          radius: '50%',
          center: ['75%', '50%'],
          animation: true,
          label: {
            position: 'outer',
            alignTo: 'none',
            bleedMargin: 5,
          },
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      ],
    };
  }

  setupSankeyChart(): void {
    this.sankeyChartOption = {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
      },
      series: [
        {
          type: 'sankey',
          focusNodeAdjacency: 'allEdges',
          animation: true,
        },
      ],
    };
  }
  setupBubbleChart(): void {
    this.bubbleChartOption = {
      legend: {
        right: 10,
        data: [
          this.translateService.instant('graph.focus') + ' A',
          this.translateService.instant('graph.focus') + ' B',
        ],
      },
      tooltip: {
        show: true,
        formatter: (params) => {
          return (
            '<span class="dot" style="background-color:' +
            params.color +
            '"></span>' +
            params.data[3] +
            '</br>' +
            this.translateService.instant('graph.sync.bubbleSize') +
            ': ' +
            params.data[2]
          );
        },
      },
      xAxis: {
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
        name: this.translateService.instant('graph.sync.bubbleX'),
        nameLocation: 'end',
        nameGap: 25,
      },
      yAxis: {
        splitLine: {
          lineStyle: {
            type: 'dashed',
          },
        },
        name: this.translateService.instant('graph.sync.bubbleY'),
        nameLocation: 'end',
        nameGap: 25,
        scale: true,
      },
      series: [
        {
          name: this.translateService.instant('graph.focus') + ' A',
          type: 'scatter',
          symbolSize: (val) => {
            const res = this.normalize(val[2], 100000, 0);
            return res > 0 ? res * 100 : 50;
          },
        },
        {
          name: this.translateService.instant('graph.focus') + ' B',
          type: 'scatter',
          symbolSize: (val) => {
            const res = this.normalize(val[2], 100000, 0);
            return res > 0 ? res * 100 : 50;
          },
        },
      ],
    };
  }

  normalize(val: number, max: number, min: number): number {
    return (val - min) / (max - min);
  }

  generateMapData(
    rootData: any,
    filterField: string,
    measureField: string,
    isLiteral?: boolean,
  ): Map<string, number> | Map<string, string[]> {
    let data;
    if (isLiteral) {
      data = new Map<string, string[]>();
    } else {
      data = new Map<string, number>();
    }
    if (rootData) {
      rootData.forEach((element) => {
        if (element[filterField] !== undefined || element[filterField] !== null) {
          if (data.has(element[filterField])) {
            if (element[measureField] !== undefined || measureField !== null) {
              if (isLiteral) {
                data.get(element[filterField]).push(String(element[measureField]));
              } else {
                const value = data.get(element[filterField]) + Number(element[measureField] || 0);
                data.set(element[filterField], value);
              }
            }
          } else {
            if (element[measureField] !== undefined || element[measureField] !== null) {
              if (isLiteral) {
                data.set(element[filterField], [String(element[measureField])]);
              } else {
                data.set(element[filterField], Number(element[measureField]));
              }
            }
          }
        }
      });
    }
    return data;
  }
  generateFocusData(rootData: any, filterField: string, measureField: string, sort?: boolean, fixed?: boolean): any[] {
    //console.log(JSON.stringify(rootData, null, 4));
    const focus = [];

    const map = this.generateMapData(rootData, filterField, measureField);
 
    const iterator = map.entries();

    while (true) {
      const next = iterator.next();
      if (next.done) {
        break;
      }
      if (fixed) {
        focus.push({ name: next.value[0], value: Number(next.value[1]).toFixed(2) });
      } else {
        focus.push({ name: next.value[0], value: Number(next.value[1]) });
      }
    }
    if (sort) {
      focus.sort((first, second) => {
        return first.value - second.value;
      });
    }

    return focus;
  }

  updateBarChart(): void {
    const focusA = this.generateFocusData(this.rootDataA, this.barFilterField, this.dynamicMeasure.code, true, true);
    const focusB = this.generateFocusData(this.rootDataB, this.barFilterField, this.dynamicMeasure.code, true, true);

    this.barMergeOption = {
      yAxis: [
        {
          data: this.generateLabel([focusA], '')
            .sort((a, b) => b - a)
            .slice(focusA.length - 9, focusA.length),
        },
        {
          data: this.generateLabel([focusB], '')
            .sort((a, b) => b - a)
            .slice(focusA.length - 9, focusA.length),
        },
      ],
      series: [
        {
          data: focusA.sort((a, b) => b - a).slice(0, 9),
        },
        {
          data: focusB.sort((a, b) => b - a).slice(0, 9),
        },
      ],
    };
  }

  updatePieChart(): void {
    const focusA = this.generateFocusData(this.rootDataA, this.pieFilterField, this.dynamicMeasure.code, false, true);
    const focusB = this.generateFocusData(this.rootDataB, this.pieFilterField, this.dynamicMeasure.code, false, true);

    this.pieMergeOption = {
      series: [{ data: focusA }, { data: focusB }],
    };
  }

  updateSankeyChart(): void {
    const sankeyDataA = this.generateSankeyData(this.rootDataA, ' A');
   
    this.sankeyMergeOptionA = {
      series: [
        {
          data: sankeyDataA.nodes,
          links: sankeyDataA.links,
          type: 'sankey',
          focusNodeAdjacency: 'allEdges',
          animation: true,
        },
      ],
    };
    const sankeyDataB = this.generateSankeyData(this.rootDataB, ' B');
    this.sankeyMergeOptionB = {
      series: [
        {
          data: sankeyDataB.nodes,
          links: sankeyDataB.links,
          type: 'sankey',
          focusNodeAdjacency: 'allEdges',
          animation: true,
        },
      ],
    };
  }

  generateSankeyData(rootData: any, tag: string): any {
    const data = {
      nodes: [],
      links: [],
    };

 

    const titleLabel = this.translateService.instant('graph.focus');
    const rootLabel = 'Italia';

    const focusFirstLevel = this.generateFocusData(
      rootData,
      this.sankeyFirstLevelField,
      this.dynamicMeasure.code,
      false,
      false,
    );
    const focusSecondLevel = this.generateFocusData(
      rootData,
      this.sankeySecondLevelField,
      this.dynamicMeasure.code,
      false,
      false,
    );

    const summFirstLevel = this.summFocus(focusFirstLevel);
    const focusTitle = [{ name: titleLabel, value: summFirstLevel }];
    const focusRoot = [{ name: rootLabel, value: summFirstLevel }];
    data.nodes = this.createSankeyNodes([focusTitle, focusRoot, focusFirstLevel, focusSecondLevel], tag);
    data.links = this.createSankeyLinks(rootData, titleLabel, rootLabel, summFirstLevel, tag);
    return data;
  }
  createSankeyNodes(focusList: any[], tag?: string): any[] {
    const nodes = [];
    focusList.forEach((focus) => {
      focus.forEach((element) => {
        nodes.push({ name: element.name + tag });
      });
    });
    return nodes;
  }

  createSankeyLevelLinks(node: string, mapData: Map<string, number> | Map<string, string[]>, tag: string): any[] {
    const links = [];
    const iterator = mapData.entries();
    while (true) {
      const next = iterator.next();
      if (next.done) {
        break;
      }
      links.push({ source: node + tag, target: next.value[0] + tag, value: next.value[1] });
    }
    return links;
  }

  createSankeyLinks(rootData: any, sourceLabel: string, root: string, totalValue: number, tag: string): any[] {
    const firstLevelMap = this.generateMapData(rootData, this.sankeyFirstLevelField, this.dynamicMeasure.code);
    const firstToSecondLevelMap = this.generateMapData(
      rootData,
      this.sankeyFirstLevelField,
      this.sankeySecondLevelField,
      true,
    );
    const secondLevelMap = this.generateMapData(rootData, this.sankeySecondLevelField, this.dynamicMeasure.code);
    let links = [];
    links.push({ source: sourceLabel + tag, target: root + tag, value: totalValue });

    links = links.concat(this.createSankeyLevelLinks(root, firstLevelMap, tag));
    const firstLevelIterator = firstLevelMap.entries();
    while (true) {
      const next = firstLevelIterator.next();
      if (next.done) {
        break;
      }

      const secondLevelList = firstToSecondLevelMap.get(next.value[0]);
      if (Array.isArray(secondLevelList)) {
        const s = new Set(secondLevelList);
        const it = s.values();
        Array.from(it).forEach((element) => {
          links.push({ source: next.value[0] + tag, target: element + tag, value: secondLevelMap.get(element) });
        });
      }
    }

    return links;
  }
  /**
   * generates an array for each bubble to display
   * each bubble must have at least [x,y, size,... extra data...]
   */
  updateBubbleChart(): void {
    const focusADataX = this.generateFocusData(this.rootDataA, this.bubbleRootField, this.bubbleXField);
    const focusBDataX = this.generateFocusData(this.rootDataB, this.bubbleRootField, this.bubbleXField);

    const focusADataY = this.generateFocusData(this.rootDataA, this.bubbleRootField, this.bubbleYField);
    const focusBDataY = this.generateFocusData(this.rootDataB, this.bubbleRootField, this.bubbleYField);

    const focusADataSize = this.generateFocusData(this.rootDataA, this.bubbleRootField, this.bubbleSizeField);
    const focusBDataSize = this.generateFocusData(this.rootDataB, this.bubbleRootField, this.bubbleSizeField);
    const xDataA = this.summFocus(focusADataX) / focusADataX.length;
    const yDataA = this.summFocus(focusADataY);
    const sizeDataA = this.summFocus(focusADataSize);

    const xDataB = this.summFocus(focusBDataX) / focusADataX.length;
    const yDataB = this.summFocus(focusBDataY);
    const sizeDataB = this.summFocus(focusBDataSize);

    this.bubbleMergeOption = {
      series: [
        {
          data: [[xDataA, yDataA, sizeDataA, this.translateService.instant('graph.focus') + ' A']],
        },
        {
          data: [[xDataB, yDataB, sizeDataB, this.translateService.instant('graph.focus') + ' B']],
        },
      ],
    };
  }

  summFocus(focus: any[]): number {
    let summ = 0;
    focus.forEach((element) => {
      summ += element.value;
    });

    return summ;
  }

  onUpdateField(): void {
    this.updateBarChart();
    this.updatePieChart();
    this.updateSankeyChart();
    this.updateBubbleChart();
  }

  refresh() {}
}
