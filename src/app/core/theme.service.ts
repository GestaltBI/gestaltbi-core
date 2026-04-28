import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'gestaltbi-theme';

/**
 * Tracks the active visual theme. Default order:
 *   1. Stored preference (localStorage)
 *   2. OS preference (prefers-color-scheme)
 *   3. Light
 *
 * The chosen theme is reflected as `[data-theme="dark"]` (or absent) on
 * `<html>`. CSS tokens in `tokens.scss` switch on that attribute.
 */
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly _theme = signal<Theme>('light');

  /** Read-only signal for templates / components. */
  readonly theme = this._theme.asReadonly();

  init(): void {
    const stored = this.read();
    const initial: Theme =
      stored ??
      (typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    this.apply(initial, /* persist */ false);
  }

  set(theme: Theme): void {
    this.apply(theme, true);
  }

  toggle(): void {
    this.set(this._theme() === 'dark' ? 'light' : 'dark');
  }

  private apply(theme: Theme, persist: boolean): void {
    this._theme.set(theme);
    if (typeof document !== 'undefined') {
      const html = document.documentElement;
      if (theme === 'dark') {
        html.dataset['theme'] = 'dark';
      } else {
        delete html.dataset['theme'];
      }
    }
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // localStorage may be unavailable (privacy mode, etc.); ignore.
      }
    }
  }

  private read(): Theme | null {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch {
      return null;
    }
  }
}
