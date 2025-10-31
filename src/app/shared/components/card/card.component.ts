import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import SwiperCore, { Pagination, Autoplay, Navigation } from 'swiper';

// Services
import { LanguageService } from 'src/app/core/services/language.service';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';

// Activate Swiper modules
SwiperCore.use([Pagination, Autoplay, Navigation]);

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
})
export class CardComponent implements OnInit, OnDestroy {
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

  constructor(
    private languageService: LanguageService,
    private sharedDataService: SharedDataService,
    private sanitizer: DomSanitizer,
    private router: Router,
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize browser-specific data
    if (isPlatformBrowser(this.platformId)) {
      this.currency_name = localStorage.getItem('currency_name');
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

  ngOnInit(): void {
    this.initializeComponent();
  }

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
}
