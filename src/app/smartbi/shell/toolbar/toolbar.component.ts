import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ProjectInfo, ProjectInfoService } from '../../../core/project-info.service';
import { ThemeService } from '../../../core/theme.service';
import { environment } from './../../../../environments/environment';
import { EmbedComponent } from './../../../shared/embed/embed.component';
import {
  ProjectInfoDialogComponent,
  ProjectInfoDialogKind,
} from './../../../shared/project-info/project-info-dialog.component';
import { SmartbiService } from './../../smartbi.service';

@Component({
  standalone: false,
  selector: 'sbi-shell-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent implements OnInit {
  mode$: Observable<any>;
  projectInfo$: Observable<ProjectInfo>;

  constructor(
    private ar: ActivatedRoute,
    public sbi: SmartbiService,
    public dialog: MatDialog,
    private _sanitizer: DomSanitizer,
    public themeService: ThemeService,
    private projectInfo: ProjectInfoService,
  ) {
    this.projectInfo$ = this.projectInfo.info$;
  }

  toggleTheme() {
    this.themeService.toggle();
  }

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

  openProjectInfo(kind: ProjectInfoDialogKind, info: ProjectInfo) {
    this.dialog.open(ProjectInfoDialogComponent, {
      panelClass: 'sbi-project-info-dialog',
      data: { kind, readme: info.readme, cff: info.cff },
    });
  }
}
