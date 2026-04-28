import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface MessageDialogData {
  title: string;
  description: string;
  buttonCancel?: string;
  buttonOk?: string;
  confirmation?: boolean;
}

@Component({
  standalone: false,
  selector: 'sbi-message-dialog',
  templateUrl: './message-dialog.component.html',
  styleUrls: ['./message-dialog.component.scss'],
})
export class MessageDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: MessageDialogData,
    public dialogRef: MatDialogRef<MessageDialogComponent>,
  ) {
    if (!data.buttonOk) {
      data.buttonOk = 'common.ok';
    }
    if (!data.buttonCancel) {
      data.buttonCancel = 'common.cancel';
    }
  }
}
