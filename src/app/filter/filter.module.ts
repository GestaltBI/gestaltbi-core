import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProcessorModule } from './../processor/processor.module';
import { SharedModule } from './../shared/shared.module';
import { BasefilterComponent } from './basefilter/basefilter.component';
import { DimfilterComponent } from './dimfilter/dimfilter.component';
import { DimselectComponent } from './dimselect/dimselect.component';
import { FilterComponent } from './filter.component';
import { FilterRegistryService } from './filter.registry.service';
import { PeriodfilterComponent } from './periodfilter/periodfilter.component';

@NgModule({
  declarations: [FilterComponent, DimfilterComponent, PeriodfilterComponent, BasefilterComponent, DimselectComponent],
  imports: [FormsModule, SharedModule, ProcessorModule],
  exports: [FilterComponent, DimfilterComponent, PeriodfilterComponent, BasefilterComponent, DimselectComponent],
})
export class FilterModule {
  constructor(private reg: FilterRegistryService) {
    this.reg.register('long', 'map', 'global', DimfilterComponent); // 200 - 202
    this.reg.register('longdiff', 'map', 'global', DimfilterComponent); // 300 - 301
    this.reg.register('longchange', 'map', 'global', DimfilterComponent); // 400
    this.reg.register('sync', 'map', 'global', PeriodfilterComponent); // 500
    this.reg.register('syncdiff', 'map', 'global', PeriodfilterComponent); // 300 - 301
    this.reg.register('syncchange', 'map', 'global', PeriodfilterComponent); // 400
    this.reg.register('point', 'map', 'global', DimfilterComponent); // 500

    this.reg.register('long', 'graph', 'global', DimfilterComponent); // 203
    this.reg.register('longdiff', 'graph', 'global', DimfilterComponent); // 303 - 305
    this.reg.register('longchange', 'graph', 'global', DimfilterComponent); // 403 - 404
    this.reg.register('sync', 'graph', 'global', PeriodfilterComponent); // 501 - 504
    this.reg.register('syncdiff', 'graph', 'global', PeriodfilterComponent); // 303 - 305
    this.reg.register('syncchange', 'graph', 'global', PeriodfilterComponent); // 403 - 404
    this.reg.register('point', 'graph', 'global', DimfilterComponent); // 601 - 603

    this.reg.register('long', 'table', 'global', DimfilterComponent); // 204
    this.reg.register('longdiff', 'table', 'global', DimfilterComponent); // 303 - 305
    this.reg.register('longchange', 'table', 'global', DimfilterComponent); // 403 - 404
    this.reg.register('sync', 'table', 'global', PeriodfilterComponent); // 505 - 506
    this.reg.register('syncdiff', 'table', 'global', PeriodfilterComponent); // 303 - 305
    this.reg.register('syncchange', 'table', 'global', PeriodfilterComponent); // 403 - 404
    this.reg.register('point', 'table', 'global', DimfilterComponent); // 605 - 606

    /* this.reg.register('long', 'map', 'local', PeriodfilterComponent); // 200 - 202
    this.reg.register('diff', 'map', 'local', PeriodfilterComponent); // 300 - 301
    this.reg.register('change', 'map', 'local', PeriodfilterComponent); // 400
    this.reg.register('sync', 'map', 'local', DimfilterComponent); // 500
    this.reg.register('point', 'map', 'local', PeriodfilterComponent); // 600
    this.reg.register('long', 'graph', 'local', PeriodfilterComponent); // 203
    this.reg.register('diff', 'graph', 'local', PeriodfilterComponent); // 302
    this.reg.register('change', 'graph', 'local', PeriodfilterComponent); // 401
    this.reg.register('change', 'graph', 'local', DimfilterComponent); // 401
    this.reg.register('sync', 'graph', 'local', DimfilterComponent); // 501 - 504
    this.reg.register('point', 'graph', 'local', PeriodfilterComponent); // 601 - 603
    this.reg.register('long', 'table', 'local', PeriodfilterComponent); // 204
    this.reg.register('diff', 'table', 'local', PeriodfilterComponent); // 303 - 305
    this.reg.register('change', 'table', 'local', PeriodfilterComponent); // 403 - 404
    this.reg.register('sync', 'table', 'local', DimfilterComponent); // 505 - 506
    this.reg.register('point', 'table', 'local', PeriodfilterComponent); // 605 - 606 */
  }
}
