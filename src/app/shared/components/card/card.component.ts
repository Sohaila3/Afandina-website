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

// Swiper modules are registered lazily to avoid bundling at build time.

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit, AfterViewInit, OnDestroy {
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

  // pagination window settings
  maxVisibleDots = 4;
  startIndex = 0;
  endIndex = 0;
  currentIndex = 0;

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
    // Initialize browser-specific data
    if (isPlatformBrowser(this.platformId)) {
      this.currency_name = localStorage.getItem('currency_name');
    }
  }

  ngAfterViewInit(): void {
    // Initialize pagination window based on current swiper index
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
  }

  ngOnInit(): void {
    this.initializeComponent();
    // Ensure swiper modules are registered lazily on browser
    if (isPlatformBrowser(this.platformId)) {
      this.ensureSwiperModulesRegistered();
    }
  }

  /**
   * Generates WhatsApp sharing URL with car details
   */
  get whatsappUrl(): string {
    const baseUrl = 'https://www.afandinacarrental.com';
    const productUrl = `${baseUrl}/${this.currentLang}/product/${this.carData.slug}`;

    const message = `${
      this.translations['whatsapp_text_one'] || 'Check out'
    } ${baseUrl}  ${this.translations['whatsapp_text_two'] || 'this car:'} ${
      this.carData.name
    }\n${productUrl}`;

    return `https://wa.me/${
      this.contactData.whatsapp
    }?text=${encodeURIComponent(message)}`;
  }

  // ngOnInit is implemented above to initialize component and register swiper lazily

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize component data and subscriptions
   */
  private initializeComponent(): void {
    // Get current language
    this.currentLang = this.languageService.getCurrentLanguage();

    // Subscribe to route changes for language updates
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentLang = this.languageService.getCurrentLanguage();
        this.cdr.detectChanges();
      }
    });

    // Subscribe to contact data updates
    this.sharedDataService.currentWhatsapp
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data) {
          this.contactData = data;
          this.cdr.detectChanges();
        }
      });

    // Load translations
    this.loadTranslations();
  }

  /**
   * Dynamically import and register Swiper modules to avoid bundling them into main chunk.
   */
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
      // ignore errors - swiper features will still work where available
    }
  }

  /**
   * Load and subscribe to translations
   */
  private loadTranslations(): void {
    this.translationService
      .getTranslations()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.translations = data;
        this.cdr.detectChanges();
      });
  }

  /**
   * Check if discount is valid and should be displayed
   */
  hasDiscount(): boolean {
    return (
      this.carData.discount_rate &&
      this.carData.discount_rate !== '.' &&
      this.carData.discount_rate !== '0' &&
      parseFloat(this.carData.discount_rate) > 0
    );
  }

  /**
   * Check if no deposit badge should be shown
   */
  hasNoDeposit(): boolean {
    return this.carData.no_deposit === '1' || this.carData.no_deposit === '١';
  }

  /**
   * Format price display
   */
  formatPrice(price: any): string {
    if (!price) return '0';
    return parseFloat(price).toLocaleString();
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByImageIndex(index: number, item: any): number {
    return index;
  }

  /**
   * Handle image load error
   */
  onImageError(event: any): void {
    event.target.src = '../../../../assets/images/placeholder-car.jpg';
  }

  /**
   * Sanitize external URLs
   */
  sanitizeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.sanitize(1, url) || '';
  }

  /**
   * Update pagination window (startIndex/endIndex) based on currentIndex
   */
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
    if (start > total - this.maxVisibleDots)
      start = total - this.maxVisibleDots;
    this.startIndex = start;
    this.endIndex = start + this.maxVisibleDots;
    this.cdr.detectChanges();
  }

  /**
   * Return array of visible slide indexes for ngFor
   */
  visibleIndexes(): number[] {
    const total = this.carData?.images?.length || 0;
    const result: number[] = [];
    for (let i = this.startIndex; i < Math.min(this.endIndex, total); i++)
      result.push(i);
    return result;
  }

  /**
   * Navigate to a slide (called on hover or click)
   */
  goToSlide(index: number): void {
    try {
      // prefer slideToLoop when loop is enabled to map correctly
      if (this.productSwiper?.swiperRef?.slideToLoop) {
        this.productSwiper?.swiperRef?.slideToLoop(index);
      } else {
        this.productSwiper?.swiperRef?.slideTo(index);
      }
      this.currentIndex = index;
      this.updateWindow();
    } catch (err) {
      // ignore errors
    }
  }

  /**
   * Called by Swiper when active slide changes
   */
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
