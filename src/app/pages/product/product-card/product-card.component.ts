import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SwiperComponent } from 'swiper/angular';

// Services
import { LanguageService } from 'src/app/core/services/language.service';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: [
    '../../../shared/components/card/card.component.scss',
    './product-card.component.scss',
  ],
})
export class ProductCardComponent implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @Input() carData: any;

  currentLang: string = 'en';
  contactData: any = {
    whatsapp: '',
    phone: '',
    email: '',
  };
  translations: Record<string, string> = {};
  currency_name: string | null = null;

  private destroy$ = new Subject<void>();
  @ViewChild('productSwiper', { static: false })
  productSwiper?: SwiperComponent;

  maxVisibleDots = 4;
  startIndex = 0;
  endIndex = 0;
  currentIndex = 0;
  private visibilityObserver?: IntersectionObserver;

  constructor(
    private languageService: LanguageService,
    private sharedDataService: SharedDataService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private elRef: ElementRef
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.currency_name = localStorage.getItem('currency_name');
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      try {
        const swiperRef = this.productSwiper?.swiperRef;
        const active = swiperRef?.realIndex ?? swiperRef?.activeIndex ?? 0;
        this.currentIndex = active;
        this.updateWindow();
      } catch (err) {
        this.currentIndex = 0;
        this.updateWindow();
      }
    }, 150);
    // Defer heavy initialization until the card is near the viewport
    this.initVisibilityObserver();
  }

  ngOnInit(): void {
    this.initializeComponent();
    // Swiper modules registration will be deferred until the card is visible
  }

  private initVisibilityObserver() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      // If already registered globally, only ensure media is loaded
      if ((window as any).__swiper_registered) {
        this.loadVideoSources();
        return;
      }

      this.visibilityObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.ensureSwiperModulesRegistered();
              this.loadVideoSources();
              if (this.visibilityObserver) {
                this.visibilityObserver.disconnect();
                this.visibilityObserver = undefined;
              }
              break;
            }
          }
        },
        { root: null, rootMargin: '300px', threshold: 0.01 }
      );

      if (this.elRef?.nativeElement) {
        this.visibilityObserver.observe(this.elRef.nativeElement);
      }
    } catch (e) {
      // ignore
    }
  }

  private loadVideoSources() {
    try {
      const el: HTMLElement = this.elRef.nativeElement;
      const sources = el.querySelectorAll('video source[data-src]');
      sources.forEach((s) => {
        const dataSrc = (s as HTMLElement).getAttribute('data-src');
        if (dataSrc) {
          (s as HTMLSourceElement).src = dataSrc;
          const video = s.parentElement as HTMLVideoElement | null;
          if (video && typeof video.load === 'function') {
            try {
              video.load();
            } catch (err) {
              // ignore
            }
          }
        }
      });
    } catch (e) {
      // ignore
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (changes['carData'] && this.carData) {
      try {
        console.info('[debug] ProductCard carData snapshot:', this.carData?.id || this.carData?.slug || '(no id)');
        const imgs = this.carData?.images || [];
        console.info('[debug] images count:', imgs.length);
        imgs.forEach((img: any, idx: number) => {
          const candidates = [img.thumbnail_path, img.file_path, img.thumbnail_image, img.file];
          const chosen = candidates.find((c: any) => !!c) || '(none)';
          const url = chosen && chosen !== '(none)' ? `https://admin.afandinacarrental.com/storage/${chosen}` : '(no-url)';
          console.info(`[debug] image[${idx}] chosen:`, chosen, 'url:', url);
        });
      } catch (e) {
        console.warn('[debug] failed to inspect carData images', e);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get whatsappUrl(): string {
    const baseUrl = 'https://www.afandinacarrental.com';
    const productUrl = `${baseUrl}/${this.currentLang}/product/${this.carData.slug}`;

    const message = `${this.translations['whatsapp_text_one'] || 'Check out'} ${baseUrl}  ${this.translations['whatsapp_text_two'] || 'this car:'} ${this.carData.name}\n${productUrl}`;

    return `https://wa.me/${this.contactData.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  private initializeComponent(): void {
    this.currentLang = this.languageService.getCurrentLanguage();

    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentLang = this.languageService.getCurrentLanguage();
        this.cdr.detectChanges();
      }
    });

    this.sharedDataService.currentWhatsapp.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      if (data) {
        this.contactData = data;
        this.cdr.detectChanges();
      }
    });

    this.loadTranslations();
  }

  private async ensureSwiperModulesRegistered() {
    try {
      const mod: any = await import('swiper');
      const SwiperCore: any = mod?.default || mod?.Swiper || (window as any).Swiper;
      const Pagination = mod?.Pagination;
      const Autoplay = mod?.Autoplay;
      const Navigation = mod?.Navigation;
      if (SwiperCore && SwiperCore.use) {
        SwiperCore.use([Pagination, Autoplay, Navigation]);
        (window as any).__swiper_registered = true;
      }
    } catch (e) {
      // ignore
    }
  }

  private loadTranslations(): void {
    this.translationService.getTranslations().pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.translations = data;
      this.cdr.detectChanges();
    });
  }

  hasDiscount(): boolean {
    return (
      this.carData.discount_rate &&
      this.carData.discount_rate !== '.' &&
      this.carData.discount_rate !== '0' &&
      parseFloat(this.carData.discount_rate) > 0
    );
  }

  hasNoDeposit(): boolean {
    return this.carData.no_deposit === '1' || this.carData.no_deposit === '١';
  }

  formatPrice(price: any): string {
    if (!price) return '0';
    return parseFloat(price).toLocaleString();
  }

  trackByImageIndex(index: number, item: any): number {
    return index;
  }

  trackByImage(index: number, item: any): any {
    return item && (item.file_path || item.thumbnail_path) ? (item.file_path || item.thumbnail_path) : index;
  }

  onImageError(event: any): void {
    event.target.src = '../../../../assets/images/placeholder-car.jpg';
  }

  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.sanitize(1, url) || '';
  }

  private updateWindow(): void {
    const total = this.carData?.images?.length || 0;
    if (total <= this.maxVisibleDots) {
      this.startIndex = 0;
      this.endIndex = total;
      this.cdr.detectChanges();
      return;
    }

    const half = Math.floor(this.maxVisibleDots / 2);
    let start = this.currentIndex - half;
    if (start < 0) start = 0;
    if (start > total - this.maxVisibleDots) start = total - this.maxVisibleDots;
    this.startIndex = start;
    this.endIndex = start + this.maxVisibleDots;
    this.cdr.detectChanges();
  }

  visibleIndexes(): number[] {
    const total = this.carData?.images?.length || 0;
    const result: number[] = [];
    for (let i = this.startIndex; i < Math.min(this.endIndex, total); i++) result.push(i);
    return result;
  }

  goToSlide(index: number): void {
    try {
      if (this.productSwiper?.swiperRef?.slideToLoop) {
        this.productSwiper?.swiperRef?.slideToLoop(index);
      } else {
        this.productSwiper?.swiperRef?.slideTo(index);
      }
      // DO NOT set currentIndex immediately on hover/click — wait for swiper to update
      // ensure state sync after navigation (some swiper builds update index after transition)
      setTimeout(() => {
        try {
          const swiperRef = this.productSwiper?.swiperRef;
          const active = swiperRef?.realIndex ?? swiperRef?.activeIndex ?? this.currentIndex;
          // update currentIndex after transition completes
          this.currentIndex = active;
          this.updateWindow();
        } catch (e) {
          // ignore
        }
      }, 120);
    } catch (err) {
      // ignore
    }
  }

  onSlideChange(): void {
    try {
      const swiperRef = this.productSwiper?.swiperRef;
      const active = swiperRef?.realIndex ?? swiperRef?.activeIndex ?? 0;
      this.currentIndex = active;
      this.updateWindow();
    } catch (err) {
      // ignore
    }
  }
}
