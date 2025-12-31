import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule, {
    ngZoneEventCoalescing: true,
    ngZoneRunCoalescing: true,
  })
  .then((moduleRef) => {
    // Defer loading Bootstrap JS (vendor) until browser is idle/after first paint
    try {
      const win: any = window as any;
      const loadBootstrap = () => import('bootstrap/dist/js/bootstrap.bundle.min.js').catch(() => {});
      if (typeof win.requestIdleCallback === 'function') {
        win.requestIdleCallback(() => loadBootstrap(), { timeout: 2000 });
      } else {
        // fallback: give the app a moment to render
        setTimeout(() => loadBootstrap(), 1500);
      }
    } catch (e) {
      // ignore in non-browser environments
    }
  })
  .catch((err) => console.error(err));
