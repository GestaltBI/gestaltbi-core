import { Component, OnInit } from '@angular/core';

import { DatastructureService } from './../../datastructure/datastructure.service';
import { Deviation } from '@gestaltbi/stream';
import { BaseComponent } from './../../shared/base-component';
import { Utils } from './../utils';

@Component({
  standalone: false,
  selector: 'sbi-syncdiff',
  templateUrl: './syncdiff.component.html',
  styleUrls: ['./syncdiff.component.scss'],
})
export class SyncdiffComponent extends BaseComponent implements OnInit {
  columnDefs;

  rowData = [];

  dss: DatastructureService;

  ngOnInit(): void {
    const conf: any = this.ds.getProcessInfo('conf_syncdifftable');
    this.columnDefs = new Utils().pimp(conf.columnDefs);
    setTimeout((_) => {
      new Deviation(
        this.ds.getProcessed('synctable', conf.prefixes[0]),
        this.ds.getProcessed('synctable', conf.prefixes[1]),
        conf.prefixes,
        conf.rows,
        'uatu:date',
      )
        .getStream()
        .subscribe((data) => {
          console.log(data);
          this.rowData = data;
        });
    }, 1500);
  }
}
