import { Component, OnInit } from '@angular/core';
import { BaseComponent } from 'src/app/shared/base-component';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { ProcessorService } from './../../processor/processor.service';
import { Utils } from './../utils';

@Component({
  standalone: false,
  selector: 'sbi-table-sync',
  templateUrl: './sync.component.html',
  styleUrls: ['./sync.component.scss'],
})
export class SyncComponent extends BaseComponent implements OnInit {
  columnDefs;

  rowData1 = [];
  rowData2 = [];

  dss: DatastructureService;

  ngOnInit(): void {
    this.dss = this.injector.get(DatastructureService);
    // this.columnDefs = this.dss.getDataStructure().columns.map((x) => ({
    //   headerName: this.dss.getLabel(x.column),
    //   field: x.column,
    // }));
    const conf: any = this.ds.getProcessInfo('conf_synctable');
    this.columnDefs = new Utils().pimp(conf.columnDefs);

    setTimeout((_) => {
      this.ds.getProcessed('synctable', 'data1').subscribe((data) => {
        this.rowData1 = data;
      });
      this.ds.getProcessed('synctable', 'data2').subscribe((data) => {
        this.rowData2 = data;
      });
    }, 1000);
  }
}
