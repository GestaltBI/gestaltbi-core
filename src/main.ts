import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    // Angular 21's `bootstrapModule` is zoneless unless told otherwise. This app
    // is written the zone way — views assign plain fields from RxJS
    // subscriptions rather than signals — so without this every view renders its
    // initial empty state and never updates.
    applicationProviders: [provideZoneChangeDetection()],
  })
  .catch((err) => console.error(err));
