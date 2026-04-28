import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { SmartbiService } from '../../smartbi.service';

@Component({
  standalone: false,
  selector: 'sbi-r-sidenav',
  templateUrl: './r-sidenav.component.html',
  styleUrls: ['./r-sidenav.component.scss'],
})
export class RSidenavComponent implements OnInit {
  mode: string;
  terms$: Observable<any>;

  constructor(private ar: ActivatedRoute, private sbi: SmartbiService, private translateService: TranslateService) {}

  ngOnInit(): void {
    this.ar.paramMap.subscribe((params) => {
      this.mode = params.get('mode');
      this.terms$ = this.translateService.get(`wiki.${this.mode}.terms`);
    });
  }

  closeSidenav() {
    this.sbi.throwToggleRight();
  }
}
