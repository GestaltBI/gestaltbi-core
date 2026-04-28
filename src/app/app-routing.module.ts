import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'intro', pathMatch: 'full' },
  { path: 'data', loadChildren: () => import('./smartbi/smartbi.module').then((m) => m.SmartbiModule) },
  { path: 'intro', loadChildren: () => import('./intro/intro.module').then((m) => m.IntroModule) },
  { path: 'debug', loadChildren: () => import('./debug/debug.module').then((m) => m.DebugModule) },
  { path: '**', redirectTo: 'intro' },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
