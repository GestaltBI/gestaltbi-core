import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { CorrelateControlsComponent } from './correlate-controls/correlate-controls.component';
import { PivotControlsComponent } from './pivot-controls/pivot-controls.component';

/**
 * Controls for the cross-dimensional views.
 *
 * They live apart from `table/` and `graph/` because both surfaces drive the
 * same ops from the same choices — the grid and the heatmap are two readings of
 * one question, not two features.
 */
@NgModule({
  declarations: [PivotControlsComponent, CorrelateControlsComponent],
  imports: [SharedModule],
  exports: [PivotControlsComponent, CorrelateControlsComponent],
})
export class ExploreModule {}
