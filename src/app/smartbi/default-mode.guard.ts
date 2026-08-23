import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { RegistryService } from '../sbi-registry/registry.service';
import { SmartbiService } from './smartbi.service';

/**
 * Send a bare `/data` or `/gh/<org>/<repo>` to a mode this configuration
 * actually offers.
 *
 * It used to redirect to `sync/map` outright. That is fine for the bundled
 * sample and wrong for everything else: a config whose menu never mentions
 * `sync`, on a dataset with no geography, opened on an empty map of Italy —
 * a landing page that is not in its own sidebar.
 */
export const defaultModeGuard: CanActivateFn = () => {
  const sbi = inject(SmartbiService);
  const reg = inject(RegistryService);
  const router = inject(Router);

  const to = (mode: string, view: string) => router.createUrlTree([...sbi.prefix, mode, view]);
  // Last resort if modes.json is missing or empty: the historical default.
  const fallback = () => to('sync', 'map');

  return sbi.getModes().pipe(
    map((modes: any[]) => {
      const first = (modes ?? []).find((m) => m?.type === 'button' && reg.viewsFor(m.id).length > 0);
      return first ? to(first.id, reg.viewsFor(first.id)[0]) : fallback();
    }),
    catchError(() => of(fallback())),
  );
};
