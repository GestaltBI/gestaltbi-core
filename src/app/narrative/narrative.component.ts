import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { missingColumns, resolveStory, type ResolvedStory, type Story } from '@gestaltbi/storybook';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ConfigSourceService } from '../core/config-source.service';
import { ExploreBaseComponent } from '../explore/explore-base.component';
import { GraphService } from '../graph/graph.service';

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
   * things.
   */
  protected override sourceProcess(): string | undefined {
    const conf: any = this.ds.getProcessInfo('conf_narrative') ?? {};
    return conf.source ?? this.definition?.source;
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
    const conf: any = this.ds.getProcessInfo('conf_narrative') ?? {};
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
      locale: this.injector.get(TranslateService).currentLang ?? 'en',
      currency: conf.currency ?? 'USD',
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
