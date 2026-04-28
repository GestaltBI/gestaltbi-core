import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { SharedModule } from './../../shared/shared.module';
import { LSidenavComponent } from './l-sidenav/l-sidenav.component';
import { RSidenavComponent } from './r-sidenav/r-sidenav.component';
import { ToolbarComponent } from './toolbar/toolbar.component';

@NgModule({
  declarations: [ToolbarComponent, LSidenavComponent, RSidenavComponent],
  imports: [CommonModule, RouterModule, SharedModule],
  exports: [ToolbarComponent, LSidenavComponent, RSidenavComponent],
})
export class ShellModule {}
