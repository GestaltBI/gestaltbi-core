import { NgModule } from '@angular/core';
import { AgGridModule } from 'ag-grid-angular';

import { RegistryService } from './../sbi-registry/registry.service';
import { SbiRegistryModule } from './../sbi-registry/sbi-registry.module';
import { SharedModule } from './../shared/shared.module';
import { ExploreModule } from '../explore/explore.module';
import { FilterModule } from '../filter/filter.module';
import { ChangeComponent } from './change/change.component';
import { CorrelateComponent } from './correlate/correlate.component';
import { DiffComponent } from './diff/diff.component';
import { LongComponent } from './long/long.component';
import { PivotComponent } from './pivot/pivot.component';
import { PointComponent } from './point/point.component';
import { SyncComponent } from './sync/sync.component';
import { SyncchangeComponent } from './syncchange/syncchange.component';
import { SyncdiffComponent } from './syncdiff/syncdiff.component';

@NgModule({
  declarations: [
    LongComponent,
    DiffComponent,
    ChangeComponent,
    SyncComponent,
    PointComponent,
    SyncdiffComponent,
    SyncchangeComponent,
    PivotComponent,
    CorrelateComponent,
  ],
  imports: [SharedModule, SbiRegistryModule, FilterModule, ExploreModule, AgGridModule],
})
export class TableModule {
  constructor(private reg: RegistryService) {
    this.reg.registerComponent('long', 'table', LongComponent);
    this.reg.registerComponent('longdiff', 'table', DiffComponent);
    this.reg.registerComponent('longchange', 'table', ChangeComponent);
    this.reg.registerComponent('sync', 'table', SyncComponent);
    this.reg.registerComponent('syncdiff', 'table', SyncdiffComponent);
    this.reg.registerComponent('syncchange', 'table', SyncchangeComponent);
    this.reg.registerComponent('point', 'table', PointComponent);
    this.reg.registerComponent('pivot', 'table', PivotComponent);
    this.reg.registerComponent('correlate', 'table', CorrelateComponent);
  }
}
