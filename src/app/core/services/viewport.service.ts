import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { rafThrottle } from 'src/app/shared/utils/raf-throttle';

/**
 * Lightweight viewport observer that avoids repeated layout reads during rapid resizes.
 * Uses a single throttled resize listener shared across the app to prevent forced reflows.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService implements OnDestroy {
  private readonly isBrowser: boolean;
  private readonly widthSubject: BehaviorSubject<number>;
  private readonly handler?: () => void;

  /** Current viewport width (0 on the server). */
  readonly width$: Observable<number>;
  /** Boolean stream for the 768px mobile breakpoint. */
  readonly isMobile$: Observable<boolean>;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    const initialWidth = this.isBrowser ? window.innerWidth : 0;
    this.widthSubject = new BehaviorSubject<number>(initialWidth);
    this.width$ = this.widthSubject.asObservable();
    this.isMobile$ = this.width$.pipe(
      map((width) => width <= 768),
      distinctUntilChanged()
    );

    if (this.isBrowser) {
      const resizeHandler = rafThrottle(() => {
        // Single layout read per frame shared app-wide
        this.widthSubject.next(window.innerWidth);
      });
      this.handler = resizeHandler;
      window.addEventListener('resize', resizeHandler, { passive: true });
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser && this.handler) {
      window.removeEventListener('resize', this.handler);
    }
    this.widthSubject.complete();
  }
}
