import { PortalModule } from '@angular/cdk/portal';
import { NgModule } from '@angular/core';

import { ImporterModule } from './../importer/importer.module';
import { SbiRegistryModule } from './../sbi-registry/sbi-registry.module';
import { SharedModule } from './../shared/shared.module';
import { TimedmapModule } from './../timedmap/timedmap.module';
import { FilterModule } from '../filter/filter.module';
import { GraphModule } from '../graph/graph.module';
import { MapModule } from '../map/map.module';
import { TableModule } from '../table/table.module';
import { MainComponent } from './main/main.component';
import { ShellModule } from './shell/shell.module';
import { SmartbiRoutingModule } from './smartbi-routing.module';

@NgModule({
  declarations: [
    MainComponent, //
  ],
  imports: [
    ImporterModule,
    SmartbiRoutingModule,
    PortalModule,
    TimedmapModule,
    SharedModule,

    SbiRegistryModule,

    ShellModule,
    FilterModule,

    GraphModule,
    TableModule,
    MapModule,
  ],
})
export class SmartbiModule {}
