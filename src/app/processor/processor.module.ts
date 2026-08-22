import { CommonModule } from '@angular/common';
import { APP_INITIALIZER, NgModule } from '@angular/core';

import { ProcessorService } from './processor.service';

@NgModule({
  imports: [CommonModule],
  providers: [
    {
      // Hold bootstrap until processing.json is loaded. Visualization
      // components read their configuration synchronously when constructed, so
      // starting before the graph is in throws on the first missing option.
      provide: APP_INITIALIZER,
      deps: [ProcessorService],
      multi: true,
      useFactory: (ps: ProcessorService) => () => ps.ready,
    },
  ],
})
export class ProcessorModule {}
