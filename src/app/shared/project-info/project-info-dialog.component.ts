import { ChangeDetectorRef, Component, Inject, NgZone, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ReadmeDoc } from '../../core/project-info.service';
import { BUILT_IN_STYLES, CiteInstance, CitationStyle, loadCite } from './cite.loader';

export type ProjectInfoDialogKind = 'readme' | 'citation';

export interface ProjectInfoDialogData {
  kind: ProjectInfoDialogKind;
  readme?: ReadmeDoc;
  cff?: string;
}

type SourceFormat = 'bibtex' | 'ris' | 'cff' | 'csl-json';

@Component({
  standalone: false,
  selector: 'sbi-project-info-dialog',
  templateUrl: './project-info-dialog.component.html',
  styleUrls: ['./project-info-dialog.component.scss'],
})
export class ProjectInfoDialogComponent implements OnInit {
  readmeHtml?: SafeHtml;

  readonly styles: CitationStyle[] = BUILT_IN_STYLES;
  readonly sourceFormats: { id: SourceFormat; labelKey: string }[] = [
    { id: 'bibtex', labelKey: 'projectInfo.formats.bibtex' },
    { id: 'ris', labelKey: 'projectInfo.formats.ris' },
    { id: 'csl-json', labelKey: 'projectInfo.formats.csljson' },
    { id: 'cff', labelKey: 'projectInfo.formats.cff' },
  ];

  loading = false;
  loadError?: unknown;
  selectedStyle: string = this.styles[0].id;
  selectedFormat: SourceFormat = 'bibtex';

  formattedBibliography: SafeHtml | null = null;
  sources: Record<SourceFormat, string> = { bibtex: '', ris: '', cff: '', 'csl-json': '' };

  copied: SourceFormat | 'bibliography' | null = null;

  private cite?: CiteInstance;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ProjectInfoDialogData,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {
    if (data.readme) {
      this.readmeHtml = sanitizer.bypassSecurityTrustHtml(data.readme.html);
    }
    if (data.cff) {
      this.sources.cff = data.cff;
    }
  }

  ngOnInit(): void {
    if (this.data.kind !== 'citation' || !this.data.cff) return;
    this.loading = true;
    this.zone.runOutsideAngular(() => {
      loadCite()
        .then((Cite) => Cite.async(this.data.cff!))
        .then((cite) => {
          this.zone.run(() => {
            this.cite = cite;
            this.sources.bibtex = cite.format('bibtex');
            this.sources.ris = cite.format('ris');
            this.sources['csl-json'] = JSON.stringify(cite.data, null, 2);
            this.renderBibliography();
            this.loading = false;
            this.cdr.markForCheck();
          });
        })
        .catch((err) => {
          console.error('[project-info] citation.js failed', err);
          this.zone.run(() => {
            this.loadError = err;
            this.loading = false;
            this.cdr.markForCheck();
          });
        });
    });
  }

  selectStyle(id: string): void {
    this.selectedStyle = id;
    this.renderBibliography();
  }

  selectFormat(id: SourceFormat): void {
    this.selectedFormat = id;
  }

  private renderBibliography(): void {
    if (!this.cite) return;
    const html = this.cite.format('bibliography', {
      template: this.selectedStyle,
      format: 'html',
      lang: 'en-US',
    });
    this.formattedBibliography = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  copy(text: string, key: SourceFormat | 'bibliography'): void {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copied = key;
      setTimeout(() => {
        if (this.copied === key) this.copied = null;
      }, 1600);
    });
  }

  copyBibliographyText(): void {
    if (!this.cite) return;
    const text = this.cite.format('bibliography', { template: this.selectedStyle, format: 'text', lang: 'en-US' });
    this.copy(text, 'bibliography');
  }
}
