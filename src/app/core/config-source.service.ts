import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Where the runtime config files (processing.json, structure.json,
 * modes.json, mapping.json, it.json, data.csv) are loaded from.
 *
 * Default: local `assets/` for the bundled mock setup.
 *
 * The `/gh/:org/:repo[/:ref]` routes flip this to a jsDelivr URL pointing
 * at a GitHub repo, so a GestaltBI instance can be driven entirely by
 * the config files in that repo — no rebuild required.
 */
@Injectable({
  providedIn: 'root',
})
export class ConfigSourceService {
  private readonly DEFAULT = 'assets/';
  private readonly subject = new BehaviorSubject<string>(this.DEFAULT);

  /** Current base URL (always ends in `/`). */
  get base(): string {
    return this.subject.value;
  }

  /** Reactive stream of the base URL. Re-fires when setSource is called. */
  get source$(): Observable<string> {
    return this.subject.asObservable();
  }

  /**
   * Resolve a relative file path against the active base.
   * Example: cs.url('processing.json') -> 'assets/processing.json'
   *          cs.url('processing.json') -> 'https://cdn.jsdelivr.net/gh/Foo/Bar/processing.json'
   */
  url(path: string): string {
    const base = this.base.endsWith('/') ? this.base : this.base + '/';
    return base + path.replace(/^\//, '');
  }

  setSource(base: string): void {
    const normalized = base.endsWith('/') ? base : base + '/';
    if (normalized !== this.subject.value) {
      this.subject.next(normalized);
    }
  }

  reset(): void {
    if (this.subject.value !== this.DEFAULT) {
      this.subject.next(this.DEFAULT);
    }
  }

  /**
   * Build a jsDelivr base URL for a GitHub repo at an optional ref.
   * Output ends in `/`, ready to be passed to setSource.
   */
  static githubBase(org: string, repo: string, ref?: string): string {
    const refPart = ref ? `@${ref}` : '';
    return `https://cdn.jsdelivr.net/gh/${org}/${repo}${refPart}/`;
  }
}
