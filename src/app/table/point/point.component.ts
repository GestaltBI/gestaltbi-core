import { Component, OnInit } from '@angular/core';
import { BaseComponent } from 'src/app/shared/base-component';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { ProcessorService } from './../../processor/processor.service';
import { Utils } from './../utils';

@Component({
  standalone: false,
  selector: 'sbi-table-point',
  templateUrl: './point.component.html',
  styleUrls: ['./point.component.scss'],
})
export class PointComponent extends BaseComponent implements OnInit {
  columnDefs;

  rowData = [];

  dss: DatastructureService;

  ngOnInit(): void {
    this.dss = this.injector.get(DatastructureService);
    const conf: any = this.ds.getProcessInfo('conf_pointtable');
    this.columnDefs = new Utils().pimp(conf.columnDefs);
    setTimeout((_) => {
      this.ds.getProcessed('pointtable').subscribe((data) => {
        this.rowData = data;
        console.log(data);
      });
    }, 1000);
  }
}
