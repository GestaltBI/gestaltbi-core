import { Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'sbi-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss'],
})
export class DownloadComponent {
  previewRows = [1, 2, 3, 4, 5];

  download(): void {
    const link = document.createElement('a');
    link.setAttribute('type', 'hidden');
    link.href = 'assets/data_template.csv';
    link.download = 'data.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
