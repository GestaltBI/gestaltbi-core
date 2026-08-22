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
    this.measures = this.ds.getColumnsFor(this.tag, true).map((x) => new Measure(this.ds.getFull(x), x));
    if (this.measures.length > 0) {
      this.defaultMeasure = this.measures[0];
      // The host binds this measure straight into its children, and its view
      // has already been checked by the time our ngOnInit runs — emitting
      // synchronously changes a checked binding (NG0100). Announce the default
      // once the current pass is over.
      setTimeout(() => this.measureChange.emit(this.defaultMeasure));
    }
  }

  notifyChange({ value }): void {
    this.measureChange.emit(value);
  }
}
