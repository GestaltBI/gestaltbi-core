import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  composeStory,
  type DataProfile,
  disclosedValues,
  listModels,
  type ModelInfo,
  profileFrame,
  recommend,
  type Recommendation,
} from '@gestaltbi/inference';
import type { Story } from '@gestaltbi/storybook';
import { TranslateService } from '@ngx-translate/core';

import { AdvisorStoreService } from '../core/advisor-store.service';
import { ExploreBaseComponent } from '../explore/explore-base.component';
import { RegistryService } from '../sbi-registry/registry.service';
import { SmartbiService } from '../smartbi/smartbi.service';
import { InferenceSettingsService } from './inference-settings.service';

/** What to tell a model to write in. Anything else falls back to English. */
const LANGUAGES: Record<string, string> = { it: 'Italian', en: 'English' };

/**
 * What is worth looking at, asked of a model the user pays for themselves.
 *
 * The dataset is described to OpenRouter, never handed over — see
 * `@gestaltbi/inference`. What comes back is checked against the same
 * description, and the misses are shown rather than hidden: a suggestion naming
 * a column this data does not have says so, which is the difference between
 * evaluating a model and trusting one.
 */
@Component({
  standalone: false,
  selector: 'sbi-advisor',
  templateUrl: './advisor.component.html',
  styleUrls: ['./advisor.component.scss'],
})
export class AdvisorComponent extends ExploreBaseComponent {
  /** Bound to the key field; only committed to storage on save. */
  keyDraft = '';

  models: ModelInfo[] = [];
  suggestions: Recommendation[] = [];

  loadingModels = false;
  thinking = false;
  writing = false;
  error = '';

  /** Exactly what would leave the browser, so it can be shown before it does. */
  disclosed: string[] = [];

  /** When the shown advice was asked for, or null if it was asked for just now. */
  askedAt: number | null = null;

  /** True once a report has been written for this dataset. */
  hasStory = false;

  /** Chapters the model wrote that this dataset could not support. */
  storyProblems: string[] = [];

  /** The dataset the restored run belongs to, so a different one re-reads. */
  private restoredFor = '';

  protected get identifier(): string {
    return 'advisor';
  }

  get settings(): InferenceSettingsService {
    return this.injector.get(InferenceSettingsService);
  }

  private get store(): AdvisorStoreService {
    return this.injector.get(AdvisorStoreService);
  }

  /** Only grounded advice is worth writing a report from. */
  get grounded(): Recommendation[] {
    return this.suggestions.filter((s) => s.grounded);
  }

  /** Whether there is a narrative mode to send a generated report to. */
  get canRenderStory(): boolean {
    return this.injector.get(RegistryService).viewsFor('narrative').length > 0;
  }

  get hasKey(): boolean {
    return !!this.settings.apiKey;
  }

  get rowCount(): number {
    return this.source.length;
  }

  /** The op runs on demand here, not on every frame: it costs the user money. */
  protected recompute(): void {
    const profile = this.profile();
    this.disclosed = disclosedValues(profile);
    this.restore(this.store.fingerprint(profile.columns));
  }

  /**
   * Put back the last consultation about this data.
   *
   * Keyed on the shape of the dataset, so moving the period filter — which
   * fires this — does not throw away advice the user has already paid for.
   */
  private restore(fingerprint: string): void {
    if (this.restoredFor === fingerprint) return;
    this.restoredFor = fingerprint;

    const run = this.store.load(fingerprint);
    this.suggestions = run?.suggestions ?? [];
    this.askedAt = run?.at ?? null;
    this.storyProblems = run?.storyProblems ?? [];
    this.hasStory = !!run?.story?.chapters?.length;
  }

  // --------------------------------------------------------------- the key ---

  saveKey(): void {
    this.settings.apiKey = this.keyDraft;
    this.keyDraft = '';
    this.error = '';
    if (this.hasKey) this.loadModels();
  }

  forgetKey(): void {
    this.settings.forget();
    this.models = [];
    this.suggestions = [];
  }

  // -------------------------------------------------------------- the model ---

  async loadModels(): Promise<void> {
    if (!this.hasKey) return;
    this.loadingModels = true;
    this.error = '';
    try {
      const all = await listModels({ apiKey: this.settings.apiKey });
      // OpenRouter rejects a request outright when the model cannot hold a
      // schema, so offering one that cannot is offering a guaranteed failure.
      this.models = all.filter((m) => m.structuredOutputs).sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
      if (!this.models.some((m) => m.id === this.settings.model)) {
        this.settings.model = this.models[0]?.id ?? '';
      }
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.loadingModels = false;
    }
  }

  get model(): string {
    return this.settings.model;
  }

  pickModel(id: string): void {
    this.settings.model = id;
  }

  get sampleValues(): boolean {
    return this.settings.sampleValues;
  }

  toggleSamples(on: boolean): void {
    this.settings.sampleValues = on;
    this.recompute();
  }

  // --------------------------------------------------------------- the ask ---

  async suggest(): Promise<void> {
    if (!this.settings.configured || !this.source.length) return;
    this.thinking = true;
    this.error = '';
    this.suggestions = [];
    try {
      const profile = this.profile();
      this.suggestions = await recommend(profile, {
        apiKey: this.settings.apiKey,
        model: this.settings.model,
        // Show what the model got wrong rather than quietly dropping it.
        keepUngrounded: true,
        limit: 8,
      });
      this.askedAt = Date.now();
      // A report written from the previous analysis is about a question nobody
      // is asking any more, so it goes with it.
      this.hasStory = false;
      this.storyProblems = [];
      this.remember(profile, { suggestions: this.suggestions, at: this.askedAt });
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.thinking = false;
    }
  }

  // ------------------------------------------------------------ the report ---

  /**
   * Turn the analysis into something that reads like a report.
   *
   * The model writes the sentences; every number in them is computed here from
   * the real frame, so it is describing this data rather than recalling it.
   */
  async writeStory(): Promise<void> {
    if (!this.settings.configured || !this.grounded.length) return;
    this.writing = true;
    this.error = '';
    try {
      const profile = this.profile();
      const lang = this.injector.get(TranslateService).currentLang;
      const { story, problems } = await composeStory<Story>(profile, this.grounded, {
        apiKey: this.settings.apiKey,
        model: this.settings.model,
        chapters: 4,
        language: LANGUAGES[lang] ?? 'English',
      });

      this.storyProblems = problems;
      this.hasStory = !!story?.chapters?.length;
      this.remember(profile, { story, storyProblems: problems });
      if (this.hasStory) this.openStory();
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.writing = false;
    }
  }

  /** Read the generated report in the narrative mode, which knows how to draw it. */
  openStory(): void {
    if (!this.canRenderStory) return;
    const sbi = this.injector.get(SmartbiService);
    this.injector.get(Router).navigate([...sbi.prefix, 'narrative', 'story'], {
      queryParams: { source: 'generated' },
    });
  }

  /** Merge into whatever is already stored for this dataset. */
  private remember(profile: DataProfile, patch: Partial<Parameters<AdvisorStoreService['save']>[0]>): void {
    const fingerprint = this.store.fingerprint(profile.columns);
    this.restoredFor = fingerprint;
    this.store.save({
      ...(this.store.load(fingerprint) ?? { suggestions: [], at: Date.now() }),
      fingerprint,
      model: this.settings.model,
      sampleValues: this.settings.sampleValues,
      ...patch,
    } as any);
  }

  /** Open a suggestion in the view it recommends, with its axes already set. */
  open(rec: Recommendation): void {
    if (!rec.grounded) return;
    const router = this.injector.get(Router);
    const sbi = this.injector.get(SmartbiService);
    const views = this.injector.get(RegistryService).viewsFor(rec.mode);
    const view = views.includes(rec.view) ? rec.view : (views[0] ?? rec.view);

    router.navigate([...sbi.prefix, rec.mode, view], {
      queryParams: {
        rows: rec.rows?.[0],
        columns: rec.columns?.[0],
        measure: rec.measures?.[0],
        agg: rec.aggregate,
      },
    });
  }

  /** The whole payload: statistics about the frame, and what the host can render. */
  private profile(): DataProfile {
    return {
      ...profileFrame(this.source, this.dataStructureService, {
        sampleValues: this.settings.sampleValues,
        label: (code) => this.dataStructureService.getLabel(code),
      }),
      modes: this.hostModes(),
      views: ['map', 'graph', 'table'],
      context: 'A small or family-run business reading its own numbers. Advice should be practical and plainly worded.',
    };
  }

  /** Only modes that can actually be rendered, so advice is never a dead end. */
  private hostModes(): string[] {
    const reg = this.injector.get(RegistryService);
    return ['long', 'longdiff', 'longchange', 'sync', 'syncdiff', 'syncchange', 'point', 'pivot', 'correlate'].filter(
      (m) => reg.viewsFor(m).length > 0,
    );
  }
}
