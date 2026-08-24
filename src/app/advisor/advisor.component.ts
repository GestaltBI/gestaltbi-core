import { Component } from '@angular/core';
import { Router } from '@angular/router';
import {
  disclosedValues,
  listModels,
  profileFrame,
  recommend,
  type DataProfile,
  type ModelInfo,
  type Recommendation,
} from '@gestaltbi/inference';

import { ExploreBaseComponent } from '../explore/explore-base.component';
import { RegistryService } from '../sbi-registry/registry.service';
import { SmartbiService } from '../smartbi/smartbi.service';
import { InferenceSettingsService } from './inference-settings.service';

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
  error = '';

  /** Exactly what would leave the browser, so it can be shown before it does. */
  disclosed: string[] = [];

  protected get identifier(): string {
    return 'advisor';
  }

  get settings(): InferenceSettingsService {
    return this.injector.get(InferenceSettingsService);
  }

  get hasKey(): boolean {
    return !!this.settings.apiKey;
  }

  get rowCount(): number {
    return this.source.length;
  }

  /** The op runs on demand here, not on every frame: it costs the user money. */
  protected recompute(): void {
    this.disclosed = disclosedValues(this.profile());
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
      this.suggestions = await recommend(this.profile(), {
        apiKey: this.settings.apiKey,
        model: this.settings.model,
        // Show what the model got wrong rather than quietly dropping it.
        keepUngrounded: true,
        limit: 8,
      });
    } catch (e: any) {
      this.error = e?.message ?? String(e);
    } finally {
      this.thinking = false;
    }
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
