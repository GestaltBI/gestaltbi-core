import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

@Component({
  standalone: false,
  selector: 'sbi-download',
  templateUrl: './download.component.html',
  styleUrls: ['./download.component.scss'],
})
export class DownloadComponent implements OnInit {
  products$: Observable<any>;
  services$: Observable<any>;

  constructor(private readonly translateService: TranslateService) {}

  ngOnInit(): void {
    this.products$ = this.translateService.get(`intro.download.products.list`);
    this.services$ = this.translateService.get(`intro.download.services.list`);
  }

  download(): void {
    const link = document.createElement('a');
    link.setAttribute('type', 'hidden');
    link.href = 'assets/mocks/data_template.csv';
    link.download = 'data.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
