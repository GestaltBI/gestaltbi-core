import { Component, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base-component';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { Deviation } from '@gestaltbi/stream';
import { ProcessorService } from './../../processor/processor.service';
import { Utils } from './../utils';

@Component({
  standalone: false,
  selector: 'sbi-table-diff',
  templateUrl: './diff.component.html',
  styleUrls: ['./diff.component.scss'],
})
export class DiffComponent extends BaseComponent implements OnInit {
  columnDefs = [];

  rowData = [];

  dss: DatastructureService;

  ngOnInit(): void {
    const conf: any = this.ds.getProcessInfo('conf_difftable');
    this.columnDefs = new Utils().pimp(conf.columnDefs);
    setTimeout((_) => {
      new Deviation(
        this.ds.getProcessed('difftable', conf.prefixes[0]),
        this.ds.getProcessed('difftable', conf.prefixes[1]),
        conf.prefixes,
        conf.rows,
      )
        .getStream()
        .subscribe((data) => {
          console.log(data);
          this.rowData = data;
        });
    }, 1500);
  }
}
