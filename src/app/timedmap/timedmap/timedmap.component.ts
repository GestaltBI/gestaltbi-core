import { Component, Input, OnInit, Output } from '@angular/core';
import { Injector } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { BaseComponent } from 'src/app/shared/base-component';
import { Measure } from 'src/app/shared/measure';

@Component({
  standalone: false,
  selector: 'sbi-timedmap',
  templateUrl: './timedmap.component.html',
  styleUrls: ['./timedmap.component.scss'],
})
export class TimedmapComponent extends BaseComponent implements OnInit {
  @Input() lat = 41.9109;
  @Input() lng = 12.4818;
  @Input() zoom = 5;
  @Input() layout: string;

  @Input() data: any;
  @Input() navigation: string;

  @Input() fixedMeasure: Measure;
  @Input() dynamicMeasure: Measure;

  debug = false;
  toggle = false;

  constructor(public injector: Injector) {
    super(injector);
  }

  onChangeToggle(): void {
    this.toggle = !this.toggle;
  }

  ngOnInit(): void {
    if (this.data !== undefined) {
      this.data = 'https://docs.mapbox.com/mapbox-gl-js/assets/earthquakes.geojson';
      throw new Error('GeoJson is undefined, using demo');
    }
    this.layout = 'colored';
  }

  refresh(params?: any) {}
}
