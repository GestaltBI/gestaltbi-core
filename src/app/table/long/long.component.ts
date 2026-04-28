import { Component, OnInit } from '@angular/core';
import { BaseComponent } from 'src/app/shared/base-component';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { ProcessorService } from './../../processor/processor.service';
import { Utils } from './../utils';

@Component({
  standalone: false,
  selector: 'sbi-table-long',
  templateUrl: './long.component.html',
  styleUrls: ['./long.component.scss'],
})
export class LongComponent extends BaseComponent implements OnInit {
  columnDefs;

  rowDataP1 = [];
  rowDataP2 = [];

  dss: DatastructureService;

  ngOnInit(): void {
    this.dss = this.injector.get(DatastructureService);
    const conf: any = this.ds.getProcessInfo('conf_longtable');
    this.columnDefs = new Utils().pimp(conf.columnDefs);
    // this.columnDefs = this.dss.getDataStructure().columns.map((x) => ({
    //   headerName: this.dss.getLabel(x.column),
    //   field: x.column,
    // }));

    setTimeout((_) => {
      this.ds.getProcessed('longtable', 'longA').subscribe((data) => {
        this.rowDataP1 = data;
      });
      this.ds.getProcessed('longtable', 'longB').subscribe((data) => {
        this.rowDataP2 = data;
      });
    }, 1000);
  }
}
