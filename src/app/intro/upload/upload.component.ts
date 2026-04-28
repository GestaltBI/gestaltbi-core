import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ParseResult } from 'ngx-papaparse';
import { ImporterService } from 'src/app/importer/importer.service';

import { environment } from './../../../environments/environment';
import { ImporterComponent } from './../../importer/importer/importer.component';
import { ProcessorService } from './../../processor/processor.service';
import { MessageDialogComponent } from './../message-dialog/message-dialog.component';

@Component({
  standalone: false,
  selector: 'sbi-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.scss'],
})
export class UploadComponent implements OnInit {
  public mouseOvered = false;

  fileToUpload: File = null;

  data;

  @Output() dataError: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private dialog: MatDialog,
    private importer: ImporterService,
    private ps: ProcessorService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.importer.dataLoaded.subscribe((data) => {
      this.dataLoaded(data);
    });
  }

  uploadFromPC(): void {
    this.dialog.open(ImporterComponent);
  }

  onFileDropped($event) {
    const files: FileList = $event;
    this.fileToUpload = files.item(0);
    this.importer.getData(this.fileToUpload);
  }

  dataLoaded(result: ParseResult) {
    if (!this.isDataValid(result)) {
      this.openInvalidDialog();
    } else if (this.tooManyRows(result)) {
      this.openTooManyRowsDialog(result);
    } else {
      this.openAnalyzeDialog(result);
    }
  }

  openInvalidDialog(): void {
    this.dialog.open(MessageDialogComponent, {
      data: { title: 'errors.file.invalid.title', description: 'errors.file.invalid.description' },
    });
  }

  openTooManyRowsDialog(result: ParseResult): void {
    const dialogRef = this.dialog.open(MessageDialogComponent, {
      data: {
        title: 'errors.file.tooManyRows.title',
        description: 'errors.file.tooManyRows.description',
        confirmation: true,
      },
    });
    dialogRef.afterClosed().subscribe((choice) => {
      if (choice) {
        this.openAnalyzeDialog(result);
      }
      dialogRef.close();
    });
  }

  openAnalyzeDialog(result: ParseResult): void {
    this.data = result;
    const dialogRef = this.dialog.open(MessageDialogComponent, {
      data: {
        title: 'intro.fileLoadedCorrectlyTitle',
        description: 'intro.fileLoadedCorrectlyDesc',
        buttonOk: 'common.analyze',
      },
    });
    dialogRef.afterClosed().subscribe((choice) => {
      this.ps.workOn(result);
      this.router.navigate(['/data/long/map']);
      dialogRef.close();
    });
  }

  isDataValid(result: ParseResult): boolean {
    const isArray = Array.isArray(result.data);
    const noErrors = result.errors.length === 0;
    return isArray && noErrors;
  }

  tooManyRows(result: ParseResult): boolean {
    return result.data.length >= environment.maxDataRows;
  }
}
