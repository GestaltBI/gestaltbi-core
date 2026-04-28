import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CalculatorComponent } from './calculator/calculator.component';
import { MainComponent } from './main/main.component';

const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    children: [{ path: 'calculator', component: CalculatorComponent }],
  },
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule, //
    RouterModule.forChild(routes),
  ],
  exports: [
    RouterModule, //
  ],
})
export class DebugRoutingModule {}
