import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  standalone: false,
  selector: 'sbi-embed',
  templateUrl: './embed.component.html',
  styleUrls: ['./embed.component.scss'],
})
export class EmbedComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
