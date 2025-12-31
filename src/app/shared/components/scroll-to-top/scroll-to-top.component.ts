import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef, NgZone, PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-scroll-to-top',
  templateUrl: './scroll-to-top.component.html',
  styleUrls: ['./scroll-to-top.component.scss']
})
export class ScrollToTopComponent implements OnInit, OnDestroy {
  isVisible = false;
  private _scrollListener: any;
  private _scrollTicking = false;
  private isBrowser = false;

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.initScrollListener();
    }
  }

  private initScrollListener() {
    this.ngZone.runOutsideAngular(() => {
      this._scrollListener = () => {
        if (this._scrollTicking) return;
        this._scrollTicking = true;
        requestAnimationFrame(() => {
          const scrollPosition = (window && window.scrollY) || document.documentElement.scrollTop || document.body.scrollTop || 0;
          const newVisible = scrollPosition > 300;
          if (this.isVisible !== newVisible) {
            this.ngZone.run(() => {
              this.isVisible = newVisible;
              this.cdr.markForCheck();
            });
          }
          this._scrollTicking = false;
        });
      };
      if (this.isBrowser && window) {
        window.addEventListener('scroll', this._scrollListener, { passive: true });
      }
    });
  }

  scrollToTop() {
    if (this.isBrowser && window && typeof window.scrollTo === 'function') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  ngOnDestroy() {
    if (this._scrollListener && this.isBrowser && window) {
      window.removeEventListener('scroll', this._scrollListener as EventListener);
    }
  }
}
