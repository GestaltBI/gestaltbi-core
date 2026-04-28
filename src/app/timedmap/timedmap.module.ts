import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { SharedModule } from '../shared/shared.module';
import { BaseMapComponent } from './base-map/base-map.component';
import { TimedmapComponent } from './timedmap/timedmap.component';

@NgModule({
  declarations: [TimedmapComponent, BaseMapComponent],
  imports: [
    CommonModule,
    SharedModule, //
    MatDatepickerModule,
  ],
  exports: [TimedmapComponent],
})
export class TimedmapModule {}
