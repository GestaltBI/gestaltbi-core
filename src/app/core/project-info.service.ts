import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { ConfigSourceService } from './config-source.service';

export interface ReadmeDoc {
  html: string;
  raw: string;
}

export interface ProjectInfo {
  readme?: ReadmeDoc;
  /** Raw CITATION.cff source. Parsing is deferred to citation.js inside the dialog. */
  cff?: string;
}

/**
 * Loads the optional README.md and CITATION.cff from the active config
 * source so a GestaltBI project can ship its own introduction and citation
 * page directly inside the platform. The CFF source is exposed verbatim;
 * citation.js handles all parsing/formatting on demand from the dialog.
 */
@Injectable({ providedIn: 'root' })
export class ProjectInfoService {
  private readonly subject = new BehaviorSubject<ProjectInfo>({});

  constructor(
    private http: HttpClient,
    private cs: ConfigSourceService,
  ) {
    this.cs.source$.subscribe(() => this.refresh());
  }

  get info$(): Observable<ProjectInfo> {
    return this.subject.asObservable();
  }

  refresh(): void {
    const readme$ = this.fetchText('README.md').pipe(
      map((raw) => (raw ? { raw, html: renderMarkdown(raw) } : undefined)),
    );
    // CITATION.cff is the canonical filename; CITATIONS.cff is a common typo
    // — accept either so a repo author isn't punished for the wrong plural.
    const cff$ = this.fetchText('CITATION.cff').pipe(
      switchMap((raw) => (raw ? of(raw) : this.fetchText('CITATIONS.cff'))),
      map((raw) => raw ?? undefined),
    );

    readme$.pipe(switchMap((readme) => cff$.pipe(map((cff) => ({ readme, cff }))))).subscribe((info) => {
      this.subject.next(info);
    });
  }

  private fetchText(path: string): Observable<string | null> {
    return this.http.get(this.cs.url(path), { responseType: 'text' }).pipe(catchError(() => of(null)));
  }
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SAFE_LINK_SCHEMES = /^(https?:|mailto:|#|\/|\.\/|\.\.\/|[a-zA-Z0-9._~%-]+(?:\/|$))/;
const SAFE_IMG_SCHEMES = /^(https?:|data:image\/|\/|\.\/|\.\.\/|[a-zA-Z0-9._~%-]+(?:\/|$))/;

function safeUrl(url: string, image = false): string {
  return (image ? SAFE_IMG_SCHEMES : SAFE_LINK_SCHEMES).test(url) ? url : '#';
}

/**
 * Tiny markdown→HTML renderer. Covers headings, paragraphs, lists, code
 * blocks, inline code, bold/italic, links, images, blockquotes and HRs —
 * enough for a typical project README. Input is fully escaped first so the
 * output cannot smuggle script tags from the remote repo.
 */
export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        `<pre class="md-code"${lang ? ` data-lang="${escapeHtml(lang)}"` : ''}><code>${escapeHtml(buf.join('\n'))}</code></pre>`,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level} class="md-h md-h${level}">${renderInline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*[-*_]{3,}\s*$/.test(line)) {
      out.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(`<ul class="md-list">${items.map((it) => `<li>${renderInline(it)}</li>`).join('')}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(`<ol class="md-list">${items.map((it) => `<li>${renderInline(it)}</li>`).join('')}</ol>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote class="md-quote">${renderInline(buf.join(' '))}</blockquote>`);
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*[-*_]{3,}\s*$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p class="md-p">${renderInline(buf.join(' '))}</p>`);
  }

  return out.join('\n');
}

function renderInline(text: string): string {
  let s = escapeHtml(text);

  // images first, before links: ![alt](url)
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, alt, url) => {
    return `<img class="md-img" src="${safeUrl(url, true)}" alt="${alt}" />`;
  });

  // links: [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_, label, url) => {
    return `<a class="md-link" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // inline code
  s = s.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // bold then italic (order matters for mixed markers)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[\s(])_([^_\n]+)_/g, '$1<em>$2</em>');

  return s;
}
