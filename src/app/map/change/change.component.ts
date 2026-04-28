import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { BaseComponentWithLegend } from 'src/app/legend/base-component-with-legend';
import { Aggregate, GeoDeviation } from '@gestaltbi/stream';
import { Measure } from 'src/app/shared/measure';

@Component({
  standalone: false,
  selector: 'sbi-map-change',
  templateUrl: './change.component.html',
  styleUrls: ['./change.component.scss'],
})
export class ChangeComponent extends BaseComponentWithLegend implements OnInit {
  data: any;
  fixedMeasure: Measure;

  ngOnInit(): void {
    const conf: any = this.ds.getProcessInfo('conf_changemap');

    this.fixedMeasure = new Measure(this.dataStructureService.getFull(conf.revenue as string), conf.revenue);
    console.log('code', this.fixedMeasure);
    setTimeout((_) => {
      new GeoDeviation(
        this.ds.getProcessed('changemap', conf.prefixes[0]),
        this.ds.getProcessed('changemap', conf.prefixes[1]),
        conf.prefixes,
        conf.rows,
      )
        .getStream()
        // .pipe(map(data => {
        //   return new Aggregate({ columns: this.fields }, null, null).run([data, {}]);
        // }))
        .subscribe((data) => {
          console.log(data);
          this.data = data;
        });
    }, 1000);
  }
}
