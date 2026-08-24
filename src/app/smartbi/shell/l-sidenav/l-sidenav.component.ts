import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ToolEntry } from './../../../sbi-registry/registry.service';
import { SmartbiService } from './../../smartbi.service';

@Component({
  standalone: false,
  selector: 'sbi-l-sidenav',
  templateUrl: './l-sidenav.component.html',
  styleUrls: ['./l-sidenav.component.scss'],
})
export class LSidenavComponent implements OnInit {
  modes$: Observable<any>;

  /**
   * Tools that appear whether or not the configuration mentions them.
   *
   * Anything the config already lists is left where the config put it, so a
   * repo that does name the advisor keeps its own ordering.
   */
  tools$: Observable<ToolEntry[]>;

  constructor(public sbi: SmartbiService) {}

  ngOnInit(): void {
    const declared$ = this.sbi.getModes();
    this.modes$ = declared$.pipe(map((modes: any[]) => this.renderable(modes)));
    this.tools$ = declared$.pipe(
      map((modes: any[]) => {
        const listed = new Set((modes ?? []).map((m) => m?.id).filter(Boolean));
        return this.sbi.tools.filter((t) => !listed.has(t.id));
      }),
    );
  }

  /**
   * Drop what cannot be opened, and tidy up after it.
   *
   * A mode with no views left — none registered, or all of them excluded by the
   * configuration — has nowhere to link to, so listing it only offers a dead
   * end. Removing one can strand the divider that separated its group, so
   * separators that no longer separate anything go too.
   */
  private renderable(modes: any[]): any[] {
    const kept = (modes ?? []).filter((link) => link?.type !== 'button' || this.sbi.viewsFor(link.id).length > 0);

    const out: any[] = [];
    for (const link of kept) {
      const isDivider = link?.type === 'divider';
      if (isDivider && (!out.length || out[out.length - 1]?.type === 'divider')) continue;
      out.push(link);
    }
    while (out.length && out[out.length - 1]?.type === 'divider') out.pop();
    return out;
  }

  onPick() {
    // Routing happens via the routerLink directive on the row itself.
    // We just close the sidenav once the user has made a choice.
    this.sbi.throwToggleLeft();
  }
}
