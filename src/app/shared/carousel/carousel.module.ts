import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { CarouselItemComponent } from './carousel-item.component';
import { CarouselComponent } from './carousel.component';

const components = [CarouselComponent, CarouselItemComponent];

@NgModule({
  imports: [CommonModule, MatTabsModule, MatButtonModule, MatIconModule, MatCardModule],
  declarations: components,
  exports: components,
})
export class CarouselModule {}
