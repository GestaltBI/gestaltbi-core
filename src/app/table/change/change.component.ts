import { Component, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base-component';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { Deviation } from '@gestaltbi/stream';
import { ProcessorService } from './../../processor/processor.service';
import { Utils } from './../utils';

@Component({
  standalone: false,
  selector: 'sbi-table-change',
  templateUrl: './change.component.html',
  styleUrls: ['./change.component.scss'],
})
export class ChangeComponent extends BaseComponent implements OnInit {
  columnDefs = {};

  rowData = [];

  dss: DatastructureService;

  ngOnInit(): void {
    this.dss = this.injector.get(DatastructureService);
    const conf: any = this.ds.getProcessInfo('conf_changetable');
    this.columnDefs = new Utils().pimp(conf.columnDefs);
    setTimeout((_) => {
      new Deviation(
        this.ds.getProcessed('changetable', conf.prefixes[0]),
        this.ds.getProcessed('changetable', conf.prefixes[1]),
        conf.prefixes,
        conf.rows,
        'idx',
      )
        .getStream()
        .subscribe((data) => {
          console.log(data);
          this.rowData = data;
        });
    }, 1500);
  }
}
