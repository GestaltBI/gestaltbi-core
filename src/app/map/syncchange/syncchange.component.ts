import { Component, OnInit } from '@angular/core';
import { BaseComponentWithLegend } from 'src/app/legend/base-component-with-legend';
import { GeoDeviation } from '@gestaltbi/stream';
import { Measure } from 'src/app/shared/measure';

@Component({
  standalone: false,
  selector: 'sbi-syncchange',
  templateUrl: './syncchange.component.html',
  styleUrls: ['./syncchange.component.scss'],
})
export class SyncchangeComponent extends BaseComponentWithLegend implements OnInit {
  data: any;
  fixedMeasure: Measure;

  ngOnInit(): void {
    const conf: any = this.ds.getProcessInfo('conf_changemap');
    this.fixedMeasure = new Measure(this.dataStructureService.getLabel(conf.revenue), conf.revenue);
    setTimeout((_) => {
      new GeoDeviation(
        this.ds.getProcessed('changemap', conf.prefixes[0]),
        this.ds.getProcessed('changemap', conf.prefixes[1]),
        conf.prefixes,
        conf.rows,
      )
        .getStream()
        .subscribe((data) => {
          this.data = data;
        });
    }, 1000);
  }
}
