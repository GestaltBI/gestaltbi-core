import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { DatastructureService } from '../datastructure/datastructure.service';
import { Measure } from '../shared/measure';

@Component({
  standalone: false,
  selector: 'sbi-map-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss'],
})
export class LegendComponent implements OnInit {
  @Input() tag = 'uatu:measure';
  @Input() isMap = true;

  @Output() measureChange = new EventEmitter<Measure>();

  defaultMeasure: Measure;
  measures: Measure[] = [];

  constructor(private ds: DatastructureService) {}

  ngOnInit(): void {
    this.measures = this.ds.getColumnsFor(this.tag, true).map((x) => {
      console.log(this.tag, x);
      return new Measure(this.ds.getFull(x), x);
    });
    if (this.measures.length > 1) {
      this.defaultMeasure = this.measures[0];
      this.measureChange.emit(this.defaultMeasure);
    }
  }

  notifyChange({ value }): void {
    console.log(value);
    this.measureChange.emit(value);
  }
}
