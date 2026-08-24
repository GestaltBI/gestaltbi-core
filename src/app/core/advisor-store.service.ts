import { Injectable } from '@angular/core';
import type { Recommendation } from '@gestaltbi/inference';
import type { Story } from '@gestaltbi/storybook';

import { ConfigSourceService } from './config-source.service';

/** One completed consultation, kept so the next visit does not pay for it again. */
export interface AdvisorRun {
  /** Which dataset this was about. A different one gets its own run. */
  fingerprint: string;
  model: string;
  /** Epoch milliseconds, so the UI can say how long ago. */
  at: number;
  sampleValues: boolean;
  suggestions: Recommendation[];
  /** The report, once it has been written. */
  story?: Story;
  storyProblems?: string[];
}

const KEY = 'gestaltbi.advisor.runs';
/** Datasets to remember. Enough to move between a few config repos and back. */
const KEEP = 5;

/**
 * The last answer, kept.
 *
 * Every question costs the user money at their own provider, and the answer
 * does not change while the data and the model do not. Re-asking on every visit
 * to the tab would be charging them for the same sentence twice.
 *
 * So a run is stored against a fingerprint of the dataset's *shape* — the
 * columns and what each is for — and not its contents. Moving the period filter
 * changes which rows are in the frame; it does not change which analyses suit
 * the data, so it must not throw the advice away. Adding a column does.
 *
 * This is localStorage, not sessionStorage: the point is to survive the tab
 * closing. The key never comes near it — see {@link InferenceSettingsService}.
 */
@Injectable({ providedIn: 'root' })
export class AdvisorStoreService {
  constructor(private cs: ConfigSourceService) {}

  /**
   * What makes two datasets the same question.
   *
   * The config source is in it because two repos can describe columns with the
   * same codes and mean different businesses by them.
   */
  fingerprint(columns: Array<{ column: string; role: string }>): string {
    const shape = (columns ?? [])
      .map((c) => `${c.column}:${c.role}`)
      .sort()
      .join('|');
    return `${this.cs.base}#${hash(shape)}`;
  }

  load(fingerprint: string): AdvisorRun | null {
    return this.all().find((r) => r.fingerprint === fingerprint) ?? null;
  }

  save(run: AdvisorRun): void {
    const rest = this.all().filter((r) => r.fingerprint !== run.fingerprint);
    this.write([run, ...rest].slice(0, KEEP));
  }

  /** Forget one dataset's run — used when the user asks the question again. */
  clear(fingerprint: string): void {
    this.write(this.all().filter((r) => r.fingerprint !== fingerprint));
  }

  /**
   * The most recently written report, whichever dataset it was about.
   *
   * The narrative mode asks for this without knowing which run produced it,
   * because it already checks a story against the loaded columns and says so
   * when they do not match — a report from another dataset lands in the
   * mismatch it has always handled, rather than needing its own path here.
   */
  latestStory(): Story | undefined {
    return this.all().find((r) => r.story?.chapters?.length)?.story;
  }

  private all(): AdvisorRun[] {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter((r) => r?.fingerprint) : [];
    } catch {
      // Unreadable or blocked. An advisor that cannot remember still works.
      return [];
    }
  }

  private write(runs: AdvisorRun[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(runs));
    } catch {
      // Full, or blocked. Nothing to do but ask again next time.
    }
  }
}

/** Small, stable, and not a secret — this only has to tell two shapes apart. */
function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
