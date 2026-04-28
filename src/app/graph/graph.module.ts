import { CdkScrollableModule } from '@angular/cdk/scrolling';
import { NgModule } from '@angular/core';
import * as echarts from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';

import { FilterModule } from './../filter/filter.module';
import { LegendModule } from './../legend/legend.module';
import { RegistryService } from './../sbi-registry/registry.service';
import { SbiRegistryModule } from './../sbi-registry/sbi-registry.module';
import { SharedModule } from '../shared/shared.module';
import { ChangeComponent } from './change/change.component';
import { DiffComponent } from './diff/diff.component';
import { GraphComponent } from './graph/graph.component';
import { LongComponent } from './long/long.component';
import { PointComponent } from './point/point.component';
import { SyncComponent } from './sync/sync.component';
import { SyncchangeComponent } from './syncchange/syncchange.component';
import { SyncdiffComponent } from './syncdiff/syncdiff.component';

@NgModule({
  declarations: [
    GraphComponent,
    LongComponent,
    DiffComponent,
    ChangeComponent,
    SyncComponent,
    PointComponent,
    SyncdiffComponent,
    SyncchangeComponent,
  ],
  imports: [
    SharedModule,
    SbiRegistryModule,
    LegendModule,
    FilterModule,
    CdkScrollableModule,
    NgxEchartsModule.forRoot({
      echarts,
    }),
  ],
})
export class GraphModule {
  constructor(private reg: RegistryService) {
    this.reg.registerComponent('long', 'graph', LongComponent); // 203
    this.reg.registerComponent('longdiff', 'graph', DiffComponent); // 302
    this.reg.registerComponent('longchange', 'graph', ChangeComponent); // 401
    this.reg.registerComponent('sync', 'graph', SyncComponent); // 501 - 504
    this.reg.registerComponent('point', 'graph', PointComponent); // 601 - 603
    this.reg.registerComponent('syncdiff', 'graph', SyncdiffComponent);
    this.reg.registerComponent('syncchange', 'graph', SyncchangeComponent);
  }
}
