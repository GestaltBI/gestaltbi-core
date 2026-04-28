import { NgModule } from '@angular/core';

import { SharedModule } from './../shared/shared.module';
import { LegendComponent } from './legend.component';

@NgModule({
  declarations: [LegendComponent],
  imports: [SharedModule],
  exports: [LegendComponent],
})
export class LegendModule {}
