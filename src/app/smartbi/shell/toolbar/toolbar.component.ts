import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from './../../../../environments/environment';
import { EmbedComponent } from './../../../shared/embed/embed.component';
import { SmartbiService } from './../../smartbi.service';

@Component({
  standalone: false,
  selector: 'sbi-shell-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit {
  mode$: Observable<any>;

  constructor(
    private ar: ActivatedRoute,
    public sbi: SmartbiService,
    public dialog: MatDialog,
    private _sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.ar.paramMap.subscribe((params) => {
      this.mode$ = this.sbi.getModes().pipe(map((modes) => modes.find((mode) => mode.id === params.get('mode'))));
    });
  }

  toggleLeft() {
    this.sbi.throwToggleLeft();
  }

  toggleRight() {
    this.sbi.throwToggleRight();
  }

  goToSiteForm() {
    window.open('https://github.com/GestaltBI', '_blank');
  }

  openTutorial() {
    const code = this._sanitizer.bypassSecurityTrustHtml(environment.tutorialEmbedCode);
    this.dialog.open(EmbedComponent, {
      data: {
        code,
      },
    });
  }
}
