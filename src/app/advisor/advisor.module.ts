import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FilterModule } from '../filter/filter.module';
import { RegistryService } from '../sbi-registry/registry.service';
import { SbiRegistryModule } from '../sbi-registry/sbi-registry.module';
import { SharedModule } from '../shared/shared.module';
import { AdvisorComponent } from './advisor.component';

/**
 * The `advisor` mode: what a model thinks is worth looking at.
 *
 * Its own view id rather than a table or a chart, because it produces neither —
 * it produces routes into the other modes.
 */
@NgModule({
  declarations: [AdvisorComponent],
  imports: [SharedModule, SbiRegistryModule, FilterModule, FormsModule],
})
export class AdvisorModule {
  constructor(private reg: RegistryService) {
    this.reg.registerComponent('advisor', 'advice', AdvisorComponent);
    // Not an analysis this dataset happens to suit — a tool that reads whatever
    // is loaded. It appears whether or not a config repo lists it.
    this.reg.registerTool({ id: 'advisor', labelKey: 'modes.advisor', icon: 'lightbulb-on-outline' });
  }
}
