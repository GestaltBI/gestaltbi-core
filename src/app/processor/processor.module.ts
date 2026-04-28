import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';

import { AggregatorService } from './aggregator.service';
import { FilterService } from './filter.service';
import { OpRegistryService } from './op.registry.service';
import { Aggregate } from './op/aggregate';
import { ClearEmpty } from './op/clearEmpty';
import { DiffCalc } from './op/diffcalc';
import { Enhance } from './op/enhance';
import { Format } from './op/format';
import { Geocode } from './op/geocode';
import { Geojsonify } from './op/geojsonify';
import { GlobalFilter } from './op/globalfilter';
import { Heatmap } from './op/heatmap';
import { LocalFilter } from './op/localfilter';
import { Regionify } from './op/regionify';
import { ProcessorService } from './processor.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule, //
    HttpClientModule,
  ],
})
export class ProcessorModule {
  constructor(private ops: OpRegistryService) {
    ops.register('clear', ClearEmpty);
    ops.register('format', Format);
    ops.register('globalfilter', GlobalFilter);
    ops.register('localfilter', LocalFilter);
    ops.register('enhance', Enhance);
    ops.register('geocode', Geocode);
    ops.register('geojsonify', Geojsonify);
    ops.register('diffcalc', DiffCalc);
    ops.register('heatmap', Heatmap);
    ops.register('regionify', Regionify);
    ops.register('aggregate', Aggregate);
  }
}
