import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from './../shared/shared.module';
import { TimedmapModule } from './../timedmap/timedmap.module';
import { CalculatorComponent } from './calculator/calculator.component';
import { DebugRoutingModule } from './debug-routing.module';
import { MainComponent } from './main/main.component';

@NgModule({
  declarations: [
    MainComponent, //
    CalculatorComponent,
  ],
  imports: [
    CommonModule, //
    DebugRoutingModule,

    TimedmapModule,
    SharedModule,
  ],
})
export class DebugModule {}
