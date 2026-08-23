import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { SmartbiService } from '../../smartbi.service';

interface WikiTerm {
  name: string;
  description: string;
}

@Component({
  standalone: false,
  selector: 'sbi-r-sidenav',
  templateUrl: './r-sidenav.component.html',
  styleUrls: ['./r-sidenav.component.scss'],
})
export class RSidenavComponent implements OnInit {
  mode: string;
  terms: WikiTerm[] = [];

  constructor(
    private ar: ActivatedRoute,
    private sbi: SmartbiService,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.ar.paramMap.subscribe((params) => {
      this.mode = params.get('mode');
      this.translateService.get(`wiki.${this.mode}.terms`).subscribe((terms: WikiTerm[]) => {
        // Resolve $key.path references — lets the JSON share long
        // descriptions across modes without duplicating them.
        // A mode with no wiki entry gets the key string back, not an array —
        // any config repo declaring a mode we have no glossary for used to take
        // the sidenav down with it.
        this.terms = (Array.isArray(terms) ? terms : []).map((t) => ({
          name: t.name,
          description: t.description?.startsWith('$')
            ? this.translateService.instant(t.description.slice(1))
            : t.description,
        }));
      });
    });
  }

  closeSidenav() {
    this.sbi.throwToggleRight();
  }
}
