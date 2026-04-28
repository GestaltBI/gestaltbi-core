import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { APP_INITIALIZER } from '@angular/core';

import { DatastructureService } from './datastructure.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule, //
    HttpClientModule,
  ],
  providers: [
    DatastructureService,
    {
      provide: APP_INITIALIZER,
      deps: [DatastructureService],
      multi: true,
      useFactory: (ds: DatastructureService) => () => ds.autoload(),
    },
  ],
})
export class DatastructureModule {}
