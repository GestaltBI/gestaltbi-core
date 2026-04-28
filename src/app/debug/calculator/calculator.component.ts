import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

import { ImporterService } from './../../importer/importer.service';
import { AggregatorService } from './../../processor/aggregator.service';
import { ProcessorService } from './../../processor/processor.service';

@Component({
  standalone: false,
  selector: 'sbi-calculator',
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.scss'],
})
export class CalculatorComponent implements OnInit {
  processing: any;
  show = false;
  loaded = false;
  cols = [];

  constructor(
    private http: HttpClient, //
    public proc: ProcessorService,
    public i: ImporterService,
    public as: AggregatorService,
  ) {}

  ngOnInit(): void {
    this.http.get('/assets/processing.json').subscribe((data) => {
      this.processing = data;
    });
  }

  async calc(op) {
    this.proc.clear();
    await this.proc.process(op);
  }

  load() {
    this.i.dataLoaded.subscribe((data) => {
      this.show = false;
      this.proc.workOn(data);
      this.show = true;
    });
    // this.i.launchMock();
    this.as.prepareDimensions();
    this.cols = this.as.getDimensions();
  }

  getValues(block) {
    return this.as.getDimensionMembers(block);
  }
}
