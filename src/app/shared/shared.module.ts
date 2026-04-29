import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslateModule } from '@ngx-translate/core';

import { CarouselModule } from './carousel/carousel.module';
import { EmbedComponent } from './embed/embed.component';
import { ProjectInfoDialogComponent } from './project-info/project-info-dialog.component';

const matModules = [
  MatButtonModule,
  MatIconModule,
  MatCardModule,
  MatGridListModule,
  MatButtonToggleModule,
  MatToolbarModule,
  MatSelectModule,
  MatMenuModule,
  MatDatepickerModule,
  MatNativeDateModule,
  MatFormFieldModule,
  MatInputModule,
  MatStepperModule,
  MatSliderModule,
  MatSidenavModule,
  PortalModule,
  MatListModule,
  MatSlideToggleModule,
  MatExpansionModule,
  MatDialogModule,
  MatDividerModule,
];

@NgModule({
  imports: [CommonModule, TranslateModule, ...matModules, CarouselModule],
  exports: [CommonModule, TranslateModule, ...matModules, CarouselModule],
  declarations: [EmbedComponent, ProjectInfoDialogComponent],
})
export class SharedModule {}
