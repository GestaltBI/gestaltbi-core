import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { EmptyComponent } from '../sbi-registry/empty/empty.component';
import { defaultModeGuard } from './default-mode.guard';
import { MainComponent } from './main/main.component';

const routes: Routes = [
  { path: ':mode/:vis', component: MainComponent },
  // The guard always redirects, so the component is never shown — it is only
  // here because a route needs something to activate.
  { path: '', pathMatch: 'full', component: EmptyComponent, canActivate: [defaultModeGuard] },
];
@NgModule({
  imports: [
    RouterModule.forChild(routes), //
  ],
  exports: [RouterModule],
})
export class SmartbiRoutingModule {}
