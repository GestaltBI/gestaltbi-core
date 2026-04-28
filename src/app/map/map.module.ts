import { NgModule } from '@angular/core';

import { FilterModule } from './../filter/filter.module';
import { LegendModule } from './../legend/legend.module';
import { RegistryService } from './../sbi-registry/registry.service';
import { SbiRegistryModule } from './../sbi-registry/sbi-registry.module';
import { SharedModule } from './../shared/shared.module';
import { TimedmapModule } from './../timedmap/timedmap.module';
import { ChangeComponent } from './change/change.component';
import { DiffComponent } from './diff/diff.component';
import { LongComponent } from './long/long.component';
import { PointComponent } from './point/point.component';
import { SyncComponent } from './sync/sync.component';
import { SyncchangeComponent } from './syncchange/syncchange.component';
import { SyncdiffComponent } from './syncdiff/syncdiff.component';

@NgModule({
  declarations: [
    ChangeComponent,
    DiffComponent,
    LongComponent,
    PointComponent,
    SyncComponent,
    SyncchangeComponent,
    SyncdiffComponent,
  ],
  imports: [SharedModule, SbiRegistryModule, TimedmapModule, LegendModule, FilterModule],
})
export class MapModule {
  constructor(private reg: RegistryService) {
    this.reg.registerComponent('long', 'map', LongComponent);
    this.reg.registerComponent('longdiff', 'map', DiffComponent);
    this.reg.registerComponent('longchange', 'map', ChangeComponent);
    this.reg.registerComponent('sync', 'map', SyncComponent);
    this.reg.registerComponent('point', 'map', PointComponent);
    this.reg.registerComponent('syncdiff', 'map', SyncdiffComponent);
    this.reg.registerComponent('syncchange', 'map', SyncchangeComponent);
  }
}
