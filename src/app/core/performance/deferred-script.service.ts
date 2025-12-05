import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from 'src/environments/environment';

interface ScriptAttributes {
  [key: string]: string;
}

@Injectable({ providedIn: 'root' })
export class DeferredScriptService {
  private hasInitialized = false;
  private deferredScriptsExecuted = false;
  private interactionCleanups: Array<() => void> = [];
  private readonly interactionEvents: Array<keyof WindowEventMap> = [
    'pointerdown',
    'touchstart',
    'keydown',
    'mousemove',
    'scroll',
  ];
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  init(): void {
    if (this.hasInitialized || !this.isBrowser) {
      return;
    }

    this.hasInitialized = true;
    this.initializeGlobalStubs();
    this.scheduleDeferredExecution();
  }

  private initializeGlobalStubs(): void {
    if (!this.isBrowser) {
      return;
    }

    const win = window as any;
    win.dataLayer = win.dataLayer || [];
    win.gtag =
      win.gtag ||
      function () {
        win.dataLayer.push(arguments);
      };

    win.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    win.clarity =
      win.clarity ||
      function () {
        (win.clarity.q = win.clarity.q || []).push(arguments);
      };
  }

  private scheduleDeferredExecution(): void {
    if (!this.isBrowser) {
      return;
    }

    const execute = () => this.executeDeferredScripts();
    this.registerInteractionTriggers(execute);

    const idleCallback = (window as any).requestIdleCallback;
    if (typeof idleCallback === 'function') {
      idleCallback(() => execute(), { timeout: 5000 });
    } else {
      setTimeout(() => execute(), 5000);
    }
  }

  private registerInteractionTriggers(callback: () => void): void {
    const handler = () => {
      this.removeInteractionTriggers();
      callback();
    };

    this.interactionEvents.forEach((eventName) => {
      const listener = handler as EventListener;
      window.addEventListener(eventName, listener, {
        passive: true,
        once: true,
      });
      this.interactionCleanups.push(() =>
        window.removeEventListener(eventName, listener)
      );
    });
  }

  private removeInteractionTriggers(): void {
    this.interactionCleanups.forEach((cleanup) => cleanup());
    this.interactionCleanups = [];
  }

  private executeDeferredScripts(): void {
    if (this.deferredScriptsExecuted || !this.isBrowser) {
      return;
    }

    this.deferredScriptsExecuted = true;
    this.removeInteractionTriggers();

    this.injectGTag();
    this.injectGTM();
    this.injectClarity();
    this.loadBootstrapBundle();
  }

  private injectGTag(): void {
    if (!environment.gtagId) {
      return;
    }

    this.loadScript(
      `https://www.googletagmanager.com/gtag/js?id=${environment.gtagId}`,
      { async: 'true', defer: 'true' }
    ).then(() => {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.gtag =
        w.gtag ||
        function () {
          w.dataLayer.push(arguments);
        };

      w.gtag('js', new Date());
      w.gtag('config', environment.gtagId, {
        transport_type: 'beacon',
        anonymize_ip: true,
      });

      if (environment.adWordsId) {
        w.gtag('config', environment.adWordsId);
      }
    });
  }

  private injectGTM(): void {
    if (!environment.gtmId) {
      return;
    }

    if (document.querySelector(`script[data-gtm-id="${environment.gtmId}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-gtm-id', environment.gtmId);
    script.defer = true;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${environment.gtmId}`;
    document.head.appendChild(script);
  }

  private injectClarity(): void {
    if (!environment.clarityId) {
      return;
    }

    this.loadScript('https://www.clarity.ms/tag/' + environment.clarityId, {
      async: 'true',
      defer: 'true',
      'data-clarity': environment.clarityId,
    });
  }

  private loadBootstrapBundle(): void {
    if (!this.isBrowser) {
      return;
    }

    import('bootstrap/dist/js/bootstrap.bundle.min.js').catch(() => {
      /* no-op */
    });
  }

  private loadScript(src: string, attrs: ScriptAttributes = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;

      Object.entries(attrs).forEach(([key, value]) => {
        script.setAttribute(key, value);
      });

      script.onload = () => resolve();
      script.onerror = () => reject();

      document.head.appendChild(script);
    });
  }
}
