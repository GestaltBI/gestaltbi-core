import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ABSENT,
  formatFigure,
  missingColumns,
  type ResolvedStory,
  resolveStory,
  type Story,
} from '@gestaltbi/storybook';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AdvisorStoreService } from '../core/advisor-store.service';
import { ConfigSourceService } from '../core/config-source.service';
import { ExploreBaseComponent } from '../explore/explore-base.component';
import { GraphService } from '../graph/graph.service';
import { RegistryService } from '../sbi-registry/registry.service';
import { SmartbiService } from '../smartbi/smartbi.service';

/**
 * A story, read against the data that is loaded.
 *
 * Every other mode hands the owner a surface and lets them find the question.
 * This one has already asked it: an ordered argument where each chapter states
 * something, shows the analysis behind it, and reports whether the data still
 * agrees. A chapter whose claim fails says so, next to the paragraph that made
 * it — a report that cannot be contradicted by its own numbers is a brochure.
 *
 * The story itself is data, from `@gestaltbi/storybook`. Nothing about Everpix
 * lives in this component.
 */
@Component({
  standalone: false,
  selector: 'sbi-narrative',
  templateUrl: './narrative.component.html',
  styleUrls: ['./narrative.component.scss'],
})
export class NarrativeComponent extends ExploreBaseComponent {
  story: ResolvedStory | undefined;

  /** Columns the story needs that this dataset does not describe. */
  missing: string[] = [];

  /** The story this config asked for, whether or not it fits. */
  storyTitle = '';

  /** True when this configuration ships no story at all. */
  get noStory(): boolean {
    return this.loaded && !this.definition;
  }

  /** True when what is being read was written by a model, not by the config. */
  generated = false;

  /** Where to go to have one written, or null if the advisor is not registered. */
  get advisorLink(): any[] | null {
    const reg = this.injector.get(RegistryService);
    if (!reg.viewsFor('advisor').length) return null;
    return [...this.injector.get(SmartbiService).prefix, 'advisor', 'advice'];
  }

  theme: any;

  /** ECharts options for the `series` panels, keyed by chapter id. */
  readonly charts = new Map<string, any>();

  /** The story this config tells, wherever it came from. */
  private definition: Story | undefined;

  protected get identifier(): string {
    return 'narrative';
  }

  /**
   * The process the story was written against.
   *
   * A story names the process it reads in the config repo it belongs to; the
   * host's own `conf_narrative.source` overrides it for a repo that renamed
   * things. A story that names neither — a generated one never does, having
   * been written from the data rather than for a repo — falls back to the same
   * candidate stages every other explore view reads.
   */
  protected override sourceProcess(): string | undefined {
    const conf: any = this.ds.getProcessInfo('conf_narrative') ?? {};
    const named = conf.source ?? this.definition?.source;
    return named ?? super.sourceProcess();
  }

  override ngOnInit(): void {
    this.theme = this.injector.get(GraphService).theme;
    // The story has to be in hand before the base subscribes, because it names
    // the process to read from.
    this.loadStory().subscribe((story) => {
      this.definition = story ?? undefined;
      super.ngOnInit();
    });
  }

  /**
   * Where a story comes from, in order of precedence.
   *
   * A story is about one dataset, so it belongs with that dataset: a config repo
   * ships `story.json` beside `processing.json` and owns its narrative outright.
   * Nothing is compiled in — `conf_narrative.storyUrl` only moves the file.
   */
  private loadStory(): Observable<Story | null> {
    // `?source=generated` is how the advisor hands over a report it just wrote.
    // It is explicit on purpose: a config that ships a curated story keeps
    // telling it, and the generated one is somewhere the user chose to go.
    if (this.injector.get(ActivatedRoute).snapshot.queryParamMap.get('source') === 'generated') {
      const written = this.injector.get(AdvisorStoreService).latestStory();
      if (written) {
        this.generated = true;
        return of(written);
      }
    }

    const conf: any = this.ds.getProcessInfo('conf_narrative') ?? {};
    const url = this.injector.get(ConfigSourceService).url(conf.storyUrl ?? 'story.json');
    return this.injector.get(HttpClient).get<Story>(url).pipe(
      map((story) => (story?.chapters?.length ? story : null)),
      // No story.json is a normal configuration, not an error: this mode simply
      // has nothing to tell for that dataset, and says so.
      catchError(() => of(null)),
    );
  }

  protected recompute(): void {
    const story = this.definition;
    this.charts.clear();

    if (!story) {
      this.story = undefined;
      this.missing = [];
      return;
    }
    this.storyTitle = story.title;

    // A story written for another dataset resolves to a page of em dashes,
    // which reads like a bug rather than a mismatch. Say which it is.
    const declared = (this.dataStructureService.getDataStructure()?.columns ?? []).map((c: any) => c.column);
    this.missing = missingColumns(story, declared);
    if (this.missing.length) {
      this.story = undefined;
      return;
    }

    this.story = resolveStory(story, this.source, {
      columnDirectory: this.dataStructureService,
      opContext: this.ps.opContext(),
      ...this.formatting,
    });

    for (const chapter of this.story.chapters) {
      if (chapter.panel?.kind === 'series') {
        this.charts.set(chapter.id, this.seriesOption(chapter.panel));
      }
    }
  }

  /** Label for a verdict row: the check's own label, falling back to its id. */
  verdictLabel(v: any): string {
    return v.label ?? v.id;
  }

  /**
   * A column code is not a heading.
   *
   * Panel headers come back as the codes the story named — `ks:calc:fail_rate`,
   * not "Tasso di fallimento" — because the story is written against a dataset
   * and the labels belong to the configuration reading it.
   */
  label(code: string): string {
    return this.dataStructureService.getLabel(code) || code;
  }

  /**
   * A pivot cell, printed the way the story asked for.
   *
   * A rate rendered raw is `0.1881408827463219`, which is not a number anybody
   * can read in a table. Absent stays absent: a gap is not a zero.
   */
  cell(value: any, format?: string): string {
    if (value === null || value === undefined || value === '') return ABSENT;
    const n = typeof value === 'number' ? value : parseFloat(value);
    if (!Number.isFinite(n)) return String(value);
    return formatFigure(n, (format as any) ?? 'number', this.formatting);
  }

  /** Locale and currency, resolved once so panels and figures agree. */
  private get formatting(): { locale: string; currency: string } {
    const conf: any = this.ds.getProcessInfo('conf_narrative') ?? {};
    return {
      locale: this.injector.get(TranslateService).currentLang ?? 'en',
      currency: conf.currency ?? 'USD',
    };
  }

  private seriesOption(panel: any): any {
    const twoAxes = panel.series.some((s: any) => s.axis === 1);
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: panel.series.map((s: any) => s.label), bottom: 0, type: 'scroll' },
      grid: { left: 72, right: twoAxes ? 72 : 24, top: 24, bottom: 64 },
      xAxis: { type: 'category', data: panel.labels, axisLabel: { rotate: panel.labels.length > 10 ? 45 : 0 } },
      yAxis: twoAxes ? [{ type: 'value' }, { type: 'value' }] : [{ type: 'value' }],
      series: panel.series.map((s: any) => ({
        name: s.label,
        type: s.type === 'area' ? 'line' : s.type,
        smooth: s.type !== 'bar',
        areaStyle: s.type === 'area' ? { opacity: 0.25 } : undefined,
        yAxisIndex: twoAxes ? s.axis : 0,
        stack: panel.stack ? 'total' : undefined,
        // A gap stays a gap: joining across it would draw a line nobody measured.
        connectNulls: false,
        data: s.data,
      })),
    };
  }
}
