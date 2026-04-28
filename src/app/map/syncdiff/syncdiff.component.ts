import { Component, OnInit } from '@angular/core';
import { BaseComponentWithLegend } from 'src/app/legend/base-component-with-legend';
import { GeoDeviation } from 'src/app/processor/geodeviation';
import { Measure } from 'src/app/shared/measure';

@Component({
  standalone: false,
  selector: 'sbi-syncdiff',
  templateUrl: './syncdiff.component.html',
  styleUrls: ['./syncdiff.component.scss'],
})
export class SyncdiffComponent extends BaseComponentWithLegend implements OnInit {
  data: any;
  fixedMeasure: Measure;

  ngOnInit(): void {
    const conf: any = this.ds.getProcessInfo('conf_diffmap');
    this.fixedMeasure = new Measure(this.dataStructureService.getFull(conf.revenue), conf.revenue);
    setTimeout((_) => {
      new GeoDeviation(
        this.ds.getProcessed('diffmap', conf.prefixes[0]),
        this.ds.getProcessed('diffmap', conf.prefixes[1]),
        conf.prefixes,
        conf.rows,
      )
        .getStream()
        .subscribe((data) => {
          console.log(data);
          this.data = data;
        });
    }, 1000);
  }
}
