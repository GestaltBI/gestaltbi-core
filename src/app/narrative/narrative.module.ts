import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import * as echarts from 'echarts';
import { NgxEchartsModule } from 'ngx-echarts';

import { FilterModule } from '../filter/filter.module';
import { RegistryService } from '../sbi-registry/registry.service';
import { SbiRegistryModule } from '../sbi-registry/sbi-registry.module';
import { SharedModule } from '../shared/shared.module';
import { NarrativeComponent } from './narrative.component';

/**
 * The `narrative` mode: a story read against the loaded data.
 *
 * It registers a `story` view rather than reusing map/graph/table — a report is
 * not a chart type, and the toolbar now only offers the views a mode actually
 * has, so nothing advertises a surface this mode does not provide.
 */
@NgModule({
  declarations: [NarrativeComponent],
  imports: [
    SharedModule,
    SbiRegistryModule,
    FilterModule,
    RouterModule,
    NgxEchartsModule.forRoot({ echarts }),
  ],
})
export class NarrativeModule {
  constructor(private reg: RegistryService) {
    this.reg.registerComponent('narrative', 'story', NarrativeComponent);
  }
}
