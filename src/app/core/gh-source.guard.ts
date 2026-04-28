import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { SmartbiService } from '../smartbi/smartbi.service';
import { ConfigSourceService } from './config-source.service';

/**
 * Activated when the user lands on `/gh/:org/:repo[/:ref]/...`.
 *
 * Points the ConfigSourceService at the matching jsDelivr URL so all
 * runtime config files (processing.json, structure.json, modes.json,
 * mapping.json, it.json, data.csv) load from the GitHub repo. Also sets
 * the SmartbiService route prefix so sidebar / view-switcher links keep
 * the `/gh/...` segment when the user navigates between modes.
 */
export const ghSourceGuard: CanActivateFn = (route) => {
  const cs = inject(ConfigSourceService);
  const sbi = inject(SmartbiService);

  const org = route.paramMap.get('org');
  const repo = route.paramMap.get('repo');
  const ref = route.paramMap.get('ref') ?? undefined;

  if (!org || !repo) return true;

  cs.setSource(ConfigSourceService.githubBase(org, repo, ref));
  sbi.setPrefix(ref ? ['/gh', org, repo, ref] : ['/gh', org, repo]);

  return true;
};
