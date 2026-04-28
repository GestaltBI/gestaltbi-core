import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ghSourceGuard } from './core/gh-source.guard';

const routes: Routes = [
  { path: '', redirectTo: 'intro', pathMatch: 'full' },
  { path: 'intro', loadChildren: () => import('./intro/intro.module').then((m) => m.IntroModule) },
  { path: 'data', loadChildren: () => import('./smartbi/smartbi.module').then((m) => m.SmartbiModule) },
  {
    path: 'gh/:org/:repo',
    canActivate: [ghSourceGuard],
    loadChildren: () => import('./smartbi/smartbi.module').then((m) => m.SmartbiModule),
  },
  {
    path: 'gh/:org/:repo/:ref',
    canActivate: [ghSourceGuard],
    loadChildren: () => import('./smartbi/smartbi.module').then((m) => m.SmartbiModule),
  },
  { path: 'debug', loadChildren: () => import('./debug/debug.module').then((m) => m.DebugModule) },
  { path: '**', redirectTo: 'intro' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
