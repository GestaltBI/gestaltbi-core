import { NgModule } from '@angular/core';

import { RegistryService } from '../sbi-registry/registry.service';
import { SbiRegistryModule } from '../sbi-registry/sbi-registry.module';
import { SharedModule } from '../shared/shared.module';
import { PipelineComponent } from './pipeline.component';

/**
 * The `pipeline` tool: how this data is being processed.
 *
 * A tool rather than an analysis, for the same reason the advisor is one — it
 * has no dataset prerequisite. Every config describes a pipeline, so this is
 * offered for all of them whether or not `modes.json` was written before it
 * existed.
 *
 * Its own `flow` view, because it is not a chart type.
 */
@NgModule({
  declarations: [PipelineComponent],
  imports: [SharedModule, SbiRegistryModule],
})
export class PipelineModule {
  constructor(private reg: RegistryService) {
    this.reg.registerComponent('pipeline', 'flow', PipelineComponent);
    this.reg.registerTool({ id: 'pipeline', labelKey: 'modes.pipeline', icon: 'sitemap' });
  }
}
