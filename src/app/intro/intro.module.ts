import { NgModule } from '@angular/core';

import { ImporterModule } from './../importer/importer.module';
import { SharedModule } from './../shared/shared.module';
import { DownloadComponent } from './download/download.component';
import { IntroRoutingModule } from './intro-routing.module';
import { IntroComponent } from './intro.component';
import { MessageDialogComponent } from './message-dialog/message-dialog.component';
import { DragAndDropDirective } from './upload/drag-and-drop.directive';
import { UploadComponent } from './upload/upload.component';

@NgModule({
  imports: [SharedModule, IntroRoutingModule, ImporterModule],
  declarations: [IntroComponent, DownloadComponent, UploadComponent, MessageDialogComponent, DragAndDropDirective],
})
export class IntroModule {}
