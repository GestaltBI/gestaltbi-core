import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';

import { SharedModule } from './../shared/shared.module';
import { ColumnComponent } from './column/column.component';
import { DatamodelComponent } from './datamodel/datamodel.component';
import { DialogComponent } from './dialog/dialog.component';
import { ImportbtnComponent } from './importbtn/importbtn.component';
import { ImporterService } from './importer.service';
import { ImporterComponent } from './importer/importer.component';

@NgModule({
  declarations: [
    DatamodelComponent, //
    ColumnComponent,
    ImporterComponent,
    DialogComponent,
    ImportbtnComponent,
  ],
  imports: [MatButtonModule, MatIconModule, MatListModule, MatDialogModule, MatSelectModule],
  providers: [
    ImporterService, //
  ],
  exports: [ImportbtnComponent, DialogComponent],
})
export class ImporterModule {}
