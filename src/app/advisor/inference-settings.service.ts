import { Injectable } from '@angular/core';

const KEY = 'gestaltbi.openrouter.key';
const MODEL = 'gestaltbi.openrouter.model';
const SAMPLES = 'gestaltbi.openrouter.samples';

/**
 * Where the user's own OpenRouter credentials live.
 *
 * The key goes in **sessionStorage**, so it dies with the tab: a shared machine
 * does not keep it, and there is no server here to keep it either. That is the
 * deliberate trade — it has to be re-entered each visit.
 *
 * The chosen model and the sampling preference are not secrets and persist
 * normally. Nothing here is ever sent anywhere except by
 * `@gestaltbi/inference`, straight to OpenRouter.
 */
@Injectable({ providedIn: 'root' })
export class InferenceSettingsService {
  get apiKey(): string {
    return this.read(sessionStorage, KEY);
  }

  set apiKey(value: string) {
    this.write(sessionStorage, KEY, value?.trim() ?? '');
  }

  get model(): string {
    return this.read(localStorage, MODEL);
  }

  set model(value: string) {
    this.write(localStorage, MODEL, value ?? '');
  }

  /** Whether to include example values from dimensions. Off unless chosen. */
  get sampleValues(): boolean {
    return this.read(localStorage, SAMPLES) === 'true';
  }

  set sampleValues(value: boolean) {
    this.write(localStorage, SAMPLES, value ? 'true' : 'false');
  }

  get configured(): boolean {
    return !!this.apiKey && !!this.model;
  }

  forget(): void {
    this.write(sessionStorage, KEY, '');
  }

  // Storage throws in a private window with site data blocked, and an advisor
  // that cannot remember a key is still usable — one that crashes is not.
  private read(store: Storage, key: string): string {
    try {
      return store.getItem(key) ?? '';
    } catch {
      return '';
    }
  }

  private write(store: Storage, key: string, value: string): void {
    try {
      if (value) store.setItem(key, value);
      else store.removeItem(key);
    } catch {
      /* nothing to do: the session simply will not be remembered */
    }
  }
}
