import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { LanguageService } from 'src/app/core/services/language.service';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';
import {
  Advertisements,
  AfandinaSection,
  BlogData,
  BrandsSection,
  CategoriesSection,
  DocumentSection,
  FaqsSection,
  FooterSection,
  HeaderSection,
  HomeResponse,
  InstagramSection,
  LocationSection,
  SearchTab,
  SpecialOffersSection,
  WhyChooseUsSection,
} from 'src/app/Models/home.model';
import { HomeService } from 'src/app/services/home/home.service';
import { SeoService } from 'src/app/services/seo/seo.service';
import { ActivatedRoute } from '@angular/router';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';
import type { SwiperOptions } from 'swiper/types';
import { SwiperComponent } from 'swiper/angular';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';

// Interface for Hero Slides
interface HeroSlide {
  id: string;
  media_type: 'video' | 'image';
  video_path?: string;
  image_path?: string;
  optimizedImagePath?: string;
  title?: string;
  description?: string;
  badge?: string;
  show_cta?: boolean;
  show_stats?: boolean;
}

// Interface for Location (Add this)
interface Location {
  id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  icon?: string;
  phone?: string;
  email?: string;
}

type HeroImageVariant = {
  defaultSrc: string;
  webpSrcSet: string;
  avifSrcSet?: string;
};

type DeferredSectionKey = 'categories' | 'brands' | 'specialOffers';

const HOME_STATE_KEY = makeStateKey<HomeResponse>('home-response');

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroSwiper') heroSwiper?: SwiperComponent;

  // ============================================
  // HERO SECTION PROPERTIES
  // ============================================
  heroSlides: HeroSlide[] = [];
  currentSlideIndex: number = 0;
  heroImageSizes: string = '(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 1280px';
  readonly skeletonPlaceholders = Array.from({ length: 6 }, (_, index) => index);
  categoriesReady = false;
  brandsReady = false;
  specialOffersReady = false;
  private intersectionObservers: IntersectionObserver[] = [];
  private belowFoldObservers: IntersectionObserver[] = [];
  private belowFoldLoads = new Map<string, boolean>();
  private readonly isBrowserEnv: boolean;
  // Tiny transparent fallback to avoid flashing a car image before real slides load
  private readonly heroFallbackImage =
    'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  private readonly heroVideoEnableDelay = 4500;
  private performanceObservers: PerformanceObserver[] = [];
  private swiperModulesRegistered = false;
  private swiperModuleInitPromise?: Promise<void>;
  private swiperStylePromise?: Promise<void>;
  private swiperStylesLoaded = false;
  private homeRequestInFlight = false;
  private homeCache = new Map<string, HomeResponse>();
  private blogsRequested = false;
  private faqsRequested = false;

  // Hero Swiper Configuration
  heroSwiperConfig: SwiperOptions = {
    slidesPerView: 1,
    speed: 1200,
    effect: 'fade',
    fadeEffect: {
      crossFade: true,
    },
    parallax: false,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    loop: true,
    grabCursor: true,
    watchSlidesProgress: true,
    observer: true,
    observeParents: true,
    on: {
      slideChange: () => {
        this.onSlideChange();
      },
    },
  };

  // ============================================
  // EXISTING PROPERTIES
  // ============================================
  searchTab!: SearchTab;
  headerSection: HeaderSection | null = null;
  brandsSection: BrandsSection | null = null;
  categoriesSection: CategoriesSection | null = null;
  onlyOnAfandinaSection!: AfandinaSection;
  specialOffersSection!: SpecialOffersSection;
  whyChooseUsSection!: WhyChooseUsSection;
  blogs!: BlogData;
  faqsSection!: any;
  locationSection!: LocationSection;
  documentSection!: DocumentSection;
  instagramSection: InstagramSection | null = null;
  instagramReady = false;
  footerSection!: FooterSection;
  advertisements!: Advertisements;
  where_find_us: any;
  currentLang: string = 'en';
  translations: Record<string, string> = {};
  isPlaying: { [key: string]: boolean } = {};
  selectedLocation: Location | null = null;
  private destroy$ = new Subject<void>();
  private heroPreloadLink?: HTMLLinkElement | null;
  motionReady = false;
  private canUseHeroVideo = true;
  heroVideoEnabled = false;
  isMobile = false;

  // Existing Swiper Configurations
  swiperConfig: any = {
    breakpoints: {
      320: { slidesPerView: 3.1 },
      480: { slidesPerView: 3.1 },
      640: { slidesPerView: 4.1 },
      768: { slidesPerView: 5.1 },
      1024: { slidesPerView: 6.1 },
      1280: { slidesPerView: 7.1 },
    },
  };

  swiperBrand: any = {
    breakpoints: {
      320: { slidesPerView: 3.1 },
      480: { slidesPerView: 3.1 },
      640: { slidesPerView: 4.1 },
      768: { slidesPerView: 5.1 },
      1024: { slidesPerView: 6.1 },
      1280: { slidesPerView: 7.1 },
    },
  };

  swiperCard: any = {
    breakpoints: {
      320: { slidesPerView: 1.1 },
      480: { slidesPerView: 2.1 },
      900: { slidesPerView: 3 },
      1100: { slidesPerView: 3.1 },
      1200: { slidesPerView: 3.1 },
      1400: { slidesPerView: 4 },
      1500: { slidesPerView: 4.1 },
      1800: { slidesPerView: 4.1 },
    },
  };

  swiperBlog: any = {
    breakpoints: {
      320: { slidesPerView: 1.1 },
      480: { slidesPerView: 1.1 },
      640: { slidesPerView: 2 },
      768: { slidesPerView: 2 },
      1024: { slidesPerView: 3 },
      1280: { slidesPerView: 4 },
    },
  };

  // ============================================
  // CONSTRUCTOR
  // ============================================
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private homeService: HomeService,
    private sharedDataService: SharedDataService,
    private languageService: LanguageService,
    private router: Router,
    private translationService: TranslationService,
    private seo: SeoService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document,
    private transferState: TransferState
  ) {
    this.isBrowserEnv = isPlatformBrowser(platformId);
    this.instagramReady = !this.isBrowserEnv;
    if (!this.isBrowserEnv) {
      this.categoriesReady = true;
      this.brandsReady = true;
      this.specialOffersReady = true;
    }
    this.prepareHeroSlides();
  }

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================
  ngOnInit() {
    this.currentLang = this.languageService.getCurrentLanguage();

    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth <= 768;
      if (this.isMobile) {
        this.heroSwiperConfig.autoplay = false;
        this.heroSwiperConfig.loop = false;
        this.heroSwiperConfig.effect = 'slide';
      }
      this.evaluateHeroVideoSupport();
    }

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.currentLang = this.languageService.getCurrentLanguage();
          this.loadTranslations();
          this.cdr.markForCheck();
        }
      });

    // React to language changes without full reloads
    this.languageService.languageChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        if (!lang || lang === this.currentLang) return;
        this.currentLang = lang;
        // Keep current content visible while new language loads
        this.resetHomeData(true);
        this.loadTranslations();
        // try cached language first, then fetch if missing
        this.getHome(false);
        this.getHome(true);
        this.getFaqs(true);
        this.getBlogs(true);
        this.cdr.markForCheck();
      });

    this.applyRouteSeo();

    if (this.isBrowserEnv) {
      // Defer Swiper lib registration to idle to cut main-thread blocking (TBT)
      this.scheduleTask(() => this.ensureSwiperModulesRegistered(), 1200);
      this.scheduleTask(() => this.loadTranslations(), 0);
      this.scheduleTask(() => this.getHome(), 0);
      this.scheduleTask(() => this.initSharedDataStreams(), 1500);
      this.scheduleTask(() => this.getFaqs(true), 2000);
      this.scheduleTask(() => this.getBlogs(true), 3000);
      this.scheduleTask(() => this.seo.updateMetadataForType('home'), 2500);
    } else {
      this.loadTranslations();
      this.prepareHeroSlides();
      this.getHome();
      this.getFaqs(true);
      this.getBlogs(true);
      this.seo.updateMetadataForType('home');
    }
  }

  private applyRouteSeo(): void {
    const seoData = this.route.snapshot.data['seo'] || {};
    const langParam =
      ((this.route.parent || this.route).snapshot.paramMap.get('lang') as 'en' | 'ar') ||
      this.currentLang ||
      'en';

    this.seo.applyStaticMeta({
      title: seoData.title || 'Afandina | Home',
      description:
        seoData.description || 'Luxury and comfort with Afandina exclusive fleet.',
      keywords:
        seoData.keywords || 'car rental, luxury cars, dubai, Afandina',
      image:
        seoData.image || 'https://afandinacarrental.com/assets/images/logo/car3-optimized.webp',
      imageAlt: seoData.imageAlt || 'Afandina Car Rental',
      canonical: seoData.canonical,
      lang: langParam,
      robots: seoData.robots || { index: 'index', follow: 'follow' },
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.muted = true;
      }

      requestAnimationFrame(() => {
        this.motionReady = true;
        this.cdr.markForCheck();
      });

      if (this.canUseHeroVideo) {
        this.scheduleTask(() => {
          this.heroVideoEnabled = true;
          this.preloadHeroMedia(this.heroSlides[0]);
          this.cdr.markForCheck();
        }, this.heroVideoEnableDelay);
      }

      if (!this.isBrowserEnv || this.isMobile) {
        this.markDeferredSectionReady('categories');
        this.markDeferredSectionReady('brands');
        this.markDeferredSectionReady('specialOffers');
      } else {
        this.setupDeferredSectionObservers();
        this.setupBelowFoldDataObservers();
        this.monitorLargestContentfulPaint();
        this.monitorLongTasks();
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.pauseAllVideos();
    if (
      this.heroPreloadLink &&
      this.document &&
      this.document.head.contains(this.heroPreloadLink)
    ) {
      this.document.head.removeChild(this.heroPreloadLink);
      this.heroPreloadLink = null;
    }
    this.disconnectDeferredSectionObservers();
    this.disconnectBelowFoldObservers();
    this.disconnectPerformanceObservers();
  }

  // ============================================
  // DATA FETCHING METHODS
  // ============================================
  private initSharedDataStreams() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.sharedDataService.categories$
      .pipe(
        filter((res): res is CategoriesSection => !!res),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.categoriesSection = res;
        if (this.isMobile && this.categoriesSection?.categories) {
          this.categoriesSection.categories = this.categoriesSection.categories.slice(0, 6);
        }
        this.cdr.markForCheck();
      });

    this.sharedDataService.brands$
      .pipe(
        filter((res): res is BrandsSection => !!res),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.brandsSection = res;
        if (this.isMobile && this.brandsSection?.brands) {
          this.brandsSection.brands = this.brandsSection.brands.slice(0, 8);
        }
        this.cdr.markForCheck();
      });

    this.sharedDataService.locations$
      .pipe(
        filter((res): res is LocationSection => !!res),
        takeUntil(this.destroy$)
      )
      .subscribe((res) => {
        this.locationSection = res;
        this.cdr.markForCheck();
      });
  }

  private getHome(force = false) {
    const lang = this.languageService.getCurrentLanguage();

    // Serve from in-memory cache per language when available
    if (!force && this.homeCache.has(lang)) {
      const cachedLangData = this.homeCache.get(lang)!;
      this.hydrateHomeResponse(cachedLangData);
      return;
    }

    if (this.homeRequestInFlight && !force) {
      return;
    }

    if (force) {
      this.homeRequestInFlight = false; // allow refetch
      this.transferState.remove(HOME_STATE_KEY);
    }

    const cached = force
      ? null
      : this.transferState.get<HomeResponse | null>(HOME_STATE_KEY, null);

    if (cached) {
      this.transferState.remove(HOME_STATE_KEY);
      this.hydrateHomeResponse(cached);
      return;
    }

    this.homeRequestInFlight = true;
    this.homeService
      .getHome()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: HomeResponse) => {
          this.transferState.set(HOME_STATE_KEY, res);
          this.homeCache.set(lang, res);
          this.hydrateHomeResponse(res);
          this.homeRequestInFlight = false;
        },
        error: () => {
          this.homeRequestInFlight = false;
        },
      });
  }

  private hydrateHomeResponse(res: HomeResponse) {
    if (!res?.data) {
      return;
    }

    const data = res.data;
    this.headerSection = data.header_section;
    this.onlyOnAfandinaSection = data.only_on_afandina_section;
    if (this.onlyOnAfandinaSection?.only_on_afandina) {
      // Remove duplicates based on id
      this.onlyOnAfandinaSection.only_on_afandina = this.onlyOnAfandinaSection.only_on_afandina.filter((item: any, index: number, self: any[]) =>
        index === self.findIndex((t: any) => t.id === item.id)
      );
      if (this.isMobile) {
        this.onlyOnAfandinaSection.only_on_afandina = this.onlyOnAfandinaSection.only_on_afandina.slice(0, 4);
      }
    }
    this.specialOffersSection = data.special_offers_section;
    if (this.specialOffersSection?.special_offers) {
      // Remove duplicates based on id
      this.specialOffersSection.special_offers = this.specialOffersSection.special_offers.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      if (this.isMobile) {
        this.specialOffersSection.special_offers = this.specialOffersSection.special_offers.slice(0, 4);
      }
    }
    this.specialOffersReady = !!this.specialOffersSection;
    this.whyChooseUsSection = data.why_choose_us_section;
    this.documentSection = data.document_section;
    this.instagramSection = data.short_videos_section;
    this.where_find_us = data.where_find_us;
    this.advertisements = data.advertisements;

    if (!this.isBrowserEnv && this.instagramSection?.short_videos?.length) {
      this.instagramReady = true;
    }

    this.prepareHeroSlides();
    this.cdr.markForCheck();
  }

  private resetHomeData(preserveVisibleContent: boolean = false) {
    // When switching languages, we can keep existing content visible to avoid blank UI
    if (!preserveVisibleContent) {
      this.headerSection = null;
      this.heroSlides = this.buildFallbackHeroSlides();
      this.categoriesSection = null;
      this.brandsSection = null;
      this.specialOffersSection = undefined as any;
      this.onlyOnAfandinaSection = undefined as any;
      this.whyChooseUsSection = undefined as any;
      this.documentSection = undefined as any;
      this.instagramSection = null;
      this.where_find_us = null;
      this.specialOffersReady = false;
      this.categoriesReady = false;
      this.brandsReady = false;
    } else {
      // keep current data while new language fetch happens
      this.specialOffersReady = !!this.specialOffersSection;
      this.categoriesReady = !!this.categoriesSection;
      this.brandsReady = !!this.brandsSection;
    }
  }

  private getFaqs(force = false) {
    if (this.faqsRequested && !force) {
      return;
    }

    this.faqsRequested = true;
    this.homeService
      .getFaqs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: FaqsSection) => {
          this.faqsSection = res;
          this.cdr.markForCheck();
        },
        error: () => {
          this.faqsRequested = false;
        },
      });
  }

  private getBlogs(force = false) {
    if (this.blogsRequested && !force) {
      return;
    }

    this.blogsRequested = true;
    this.homeService
      .getBlogs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: BlogData) => {
          this.blogs = res;
          this.cdr.markForCheck();
        },
        error: () => {
          this.blogsRequested = false;
        },
      });
  }

  // ============================================
  // HERO SECTION METHODS
  // ============================================
  private buildFallbackHeroSlides(): HeroSlide[] {
    return [
      {
        id: 'fallback-slide-1',
        media_type: 'image',
        image_path: '/assets/images/logo/car3.webp',
        optimizedImagePath: '/assets/images/logo/opt/car3-720.webp',
        title:
          this.translations['luxury_sedans_suvs'] || 'Luxury Sedans & SUVs',
        description:
          this.translations['drive_premium_vehicles'] ||
          'Drive premium vehicles at great rates',
        badge: this.translations['best_sellers'] || 'Best Sellers',
        show_cta: true,
        show_stats: false,
      },
      {
        id: 'fallback-slide-2',
        media_type: 'image',
        image_path: '/assets/images/logo/car1.webp',
        optimizedImagePath: '/assets/images/logo/opt/car1-720.webp',
        description:
          this.translations['team_help_anytime'] ||
          'Our team is here to help anytime',
        badge: this.translations['reliable'] || 'Reliable',
        show_cta: true,
        show_stats: false,
      },
      {
        id: 'fallback-slide-3',
        media_type: 'image',
        image_path: '/assets/images/logo/car2.webp',
        optimizedImagePath: '/assets/images/logo/opt/car2-720.webp',
        title: this.translations['explore_city'] || 'Explore the City',
        description:
          this.translations['discover_best_spots'] ||
          'Discover the best spots with flexible rentals',
        badge: this.translations['adventure'] || 'Adventure',
        show_cta: true,
        show_stats: false,
      },
    ];
  }

  prepareHeroSlides() {
    const slides = this.buildFallbackHeroSlides();

    if (this.headerSection) {
      const header: any = this.headerSection;
      const mediaType: 'video' | 'image' =
        header &&
        header.hero_media_type === 'video' &&
        this.canUseHeroVideo
          ? 'video'
          : 'image';

      slides.unshift({
        id: 'primary-slide',
        media_type: mediaType,
        video_path: header?.hero_header_video_path,
        image_path: header?.hero_header_image_path,
        optimizedImagePath: this.buildOptimizedPath(
          header?.hero_header_image_path
        ),
        title:
          header?.hero_header_title ||
          this.translations['premium_car_rental'] ||
          'Premium Car Rental',
        description:
          header?.hero_header_description ||
          this.translations['luxury_comfort'] ||
          'Luxury and comfort with our exclusive fleet',
        badge: this.translations['new'] || 'New',
        show_cta: true,
        show_stats: true,
      });
    }

    this.heroSlides = slides;
    if (this.isMobile) {
      this.heroSlides = this.heroSlides.slice(0, 1);
    }
    this.preloadHeroMedia(this.heroSlides[0]);
  }

  private evaluateHeroVideoSupport() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const nav = navigator as any;
    const connection =
      nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const saveData = connection?.saveData;
    const slowNetwork =
      connection?.effectiveType &&
      ['slow-2g', '2g'].includes(connection.effectiveType);
    const lowBandwidth = connection?.downlink && connection.downlink < 1.5;

    this.canUseHeroVideo = !prefersReducedMotion && !saveData && !slowNetwork && !lowBandwidth && !this.isMobile;
  }

  getHeroImageSrcSet(slide: HeroSlide): string | null {
    const variant = this.getHeroVariant(slide);
    if (variant?.webpSrcSet) {
      return variant.webpSrcSet;
    }

    if (!slide.image_path) {
      return null;
    }

    const optimized = (slide as any).optimizedImagePath;
    if (optimized) {
      return `${optimized} 720w, ${slide.image_path} 1920w`;
    }
    return slide.image_path;
  }

  getHeroAvifSrcSet(slide: HeroSlide): string | null {
    const variant = this.getHeroVariant(slide);
    return variant?.avifSrcSet || null;
  }

  private getHeroVariant(slide: HeroSlide): HeroImageVariant | null {
    const imagePath = slide.image_path;
    if (!imagePath) {
      return null;
    }

    const match = imagePath.match(/\/assets\/images\/logo\/([^./]+)(?:\.[a-zA-Z0-9]+)?$/);
    if (!match) {
      return null;
    }

    const baseName = match[1].replace('-optimized', '');
    const optDir = '/assets/images/logo/opt/';
    const buildSet = (ext: string) =>
      `${optDir}${baseName}-320.${ext} 320w, ${optDir}${baseName}-720.${ext} 720w, ${optDir}${baseName}-1280.${ext} 1280w, ${imagePath} 1920w`;

    return {
      defaultSrc: `${optDir}${baseName}-1280.webp`,
      webpSrcSet: buildSet('webp'),
      avifSrcSet: buildSet('avif'),
    };
  }

  // Hero Swiper Navigation Methods
  nextSlide() {
    if (this.heroSwiper?.swiperRef) {
      this.heroSwiper.swiperRef.slideNext();
    }
  }

  previousSlide() {
    if (this.heroSwiper?.swiperRef) {
      this.heroSwiper.swiperRef.slidePrev();
    }
  }

  goToSlide(index: number) {
    if (this.heroSwiper?.swiperRef) {
      this.heroSwiper.swiperRef.slideToLoop(index);
    }
  }

  private buildOptimizedPath(path?: string | null): string | undefined {
    if (!path) {
      return undefined;
    }

    if (path.includes('-optimized')) {
      return path;
    }

    if (!path.includes('/assets/')) {
      return undefined;
    }

    const extensionMatch = path.match(/\.[a-zA-Z0-9]+(?=($|\?))/);
    if (!extensionMatch) {
      return undefined;
    }

    const optimizedPath = path.replace(
      extensionMatch[0],
      `-optimized${extensionMatch[0]}`
    );
    return optimizedPath;
  }

  private preloadHeroMedia(slide?: HeroSlide) {
    if (!slide || !isPlatformBrowser(this.platformId) || !this.document) {
      return;
    }

    if (this.heroPreloadLink && this.document.head.contains(this.heroPreloadLink)) {
      this.document.head.removeChild(this.heroPreloadLink);
    }

    const link = this.document.createElement('link');
    link.rel = 'preload';
    link.setAttribute('data-hero-preload', 'true');

    const shouldPreloadVideo =
      slide.media_type === 'video' &&
      slide.video_path &&
      this.heroVideoEnabled &&
      this.canUseHeroVideo;

    if (shouldPreloadVideo) {
      link.as = 'video';
      link.href = slide.video_path!;
    } else if (slide.image_path) {
      const variant = this.getHeroVariant(slide);
      link.as = 'image';
      link.href =
        variant?.defaultSrc || (slide as any).optimizedImagePath || slide.image_path;
      link.setAttribute('fetchpriority', 'high');
      link.setAttribute('type', 'image/webp');
    } else {
      return;
    }

    this.document.head.appendChild(link);
    this.heroPreloadLink = link;
  }

  private scheduleTask(task: () => void, timeout = 1200) {
    if (!isPlatformBrowser(this.platformId)) {
      task();
      return;
    }

    const win = window as any;
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => task(), { timeout });
    } else {
      setTimeout(() => task(), timeout);
    }
  }

  private setupDeferredSectionObservers() {
    if (!this.isBrowserEnv || !this.document) {
      this.markDeferredSectionReady('categories');
      this.markDeferredSectionReady('brands');
      this.markDeferredSectionReady('specialOffers');
      return;
    }

    const targets: Array<{ key: DeferredSectionKey; selector: string }> = [
      { key: 'categories', selector: '[data-defer-target="categories"]' },
      { key: 'brands', selector: '[data-defer-target="brands"]' },
      {
        key: 'specialOffers',
        selector: '[data-defer-target="specialOffers"]',
      },
    ];

    targets.forEach(({ key, selector }) => {
      if (this.isDeferredSectionReady(key)) {
        return;
      }

      const element = this.document.querySelector(selector);
      if (!element) {
        this.markDeferredSectionReady(key);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.markDeferredSectionReady(key);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '250px 0px',
          threshold: 0.01,
        }
      );

      observer.observe(element);
      this.intersectionObservers.push(observer);
      this.scheduleTask(() => this.markDeferredSectionReady(key), 4500);
    });
  }

  private disconnectDeferredSectionObservers() {
    this.intersectionObservers.forEach((observer) => observer.disconnect());
    this.intersectionObservers = [];
  }
  
  private setupBelowFoldDataObservers() {
    if (!this.isBrowserEnv || !this.document) {
      this.getFaqs();
      this.getBlogs();
      this.enableInstagramSection();
      return;
    }

    const targets: Array<{
      key: 'faqs' | 'blogs' | 'instagram';
      selector: string;
      action: () => void;
    }> = [
      { key: 'faqs', selector: '[data-defer-target="faqs"]', action: () => this.getFaqs() },
      { key: 'blogs', selector: '[data-defer-target="blogs"]', action: () => this.getBlogs() },
      {
        key: 'instagram',
        selector: '[data-defer-target="instagram"]',
        action: () => this.enableInstagramSection(),
      },
    ];

    targets.forEach(({ key, selector, action }) => {
      if (this.belowFoldLoads.get(key)) {
        return;
      }

      const target = this.document.querySelector(selector);
      if (!target) {
        this.belowFoldLoads.set(key, true);
        action();
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              observer.disconnect();
              this.belowFoldLoads.set(key, true);
              action();
            }
          });
        },
        {
          rootMargin: '250px 0px',
          threshold: 0.01,
        }
      );

      observer.observe(target);
      this.belowFoldObservers.push(observer);

      this.scheduleTask(() => {
        if (this.belowFoldLoads.get(key)) {
          return;
        }
        observer.disconnect();
        this.belowFoldLoads.set(key, true);
        action();
      }, 6000);
    });
  }

  private disconnectBelowFoldObservers() {
    this.belowFoldObservers.forEach((observer) => observer.disconnect());
    this.belowFoldObservers = [];
  }

  private enableInstagramSection() {
    if (this.instagramReady) {
      return;
    }
    this.instagramReady = true;
    this.cdr.markForCheck();
  }

  private ensureSwiperModulesRegistered(): Promise<void> {
    if (!this.isBrowserEnv || this.swiperModulesRegistered) {
      return Promise.resolve();
    }

    if (!this.swiperModuleInitPromise) {
      const stylePromise = this.loadSwiperStyles();

      const modulePromise = import('swiper')
        .then(
          ({
            default: Swiper,
            Autoplay,
            EffectFade,
            Pagination,
            Navigation,
            Parallax,
          }) => {
            Swiper.use([Autoplay, EffectFade, Pagination, Navigation, Parallax]);
            this.swiperModulesRegistered = true;
          }
        )
        .catch(() => {
          this.swiperModulesRegistered = false;
        });

      this.swiperModuleInitPromise = Promise.all([modulePromise, stylePromise])
        .then(() => void 0)
        .catch(() => void 0);
    }

    return this.swiperModuleInitPromise;
  }

  private loadSwiperStyles(): Promise<void> {
    if (!this.isBrowserEnv || this.swiperStylesLoaded) {
      return Promise.resolve();
    }

    if (!this.swiperStylePromise) {
      this.swiperStylePromise = new Promise<void>((resolve, reject) => {
        const existing = this.document?.head.querySelector('link[data-swiper-style="true"]');
        if (existing) {
          this.swiperStylesLoaded = true;
          resolve();
          return;
        }

        const linkEl = this.document?.createElement('link');
        if (!linkEl) {
          resolve();
          return;
        }

        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://unpkg.com/swiper@7.0.7/swiper-bundle.min.css';
        linkEl.setAttribute('data-swiper-style', 'true');
        linkEl.onload = () => {
          this.swiperStylesLoaded = true;
          resolve();
        };
        linkEl.onerror = (err) => {
          this.swiperStylesLoaded = false;
          reject(err);
        };

        this.document?.head.appendChild(linkEl);
      }).catch(() => void 0);
    }

    return this.swiperStylePromise;
  }

  private disconnectPerformanceObservers() {
    this.performanceObservers.forEach((observer) => observer.disconnect());
    this.performanceObservers = [];
  }

  private monitorLargestContentfulPaint() {
    if (!this.isBrowserEnv || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const latest = entries[entries.length - 1] as PerformanceEntry & {
          element?: Element;
        };
        if (latest) {
          const element = latest.element as HTMLElement | undefined;
          const targetDesc = element
            ? `${element.tagName.toLowerCase()}${element.className ? '.' + element.className.split(' ').join('.') : ''}`
            : 'unknown';
          const heroFlag = element?.getAttribute('data-hero-lcp') === 'true' ? '(hero image)' : '';
          console.info(
            '[Perf] LCP candidate',
            targetDesc,
            `${latest.startTime.toFixed(0)}ms`,
            heroFlag
          );
        }
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit);
      this.performanceObservers.push(observer);
    } catch (error) {
      console.warn('[Perf] Unable to observe LCP', error);
    }
  }

  private monitorLongTasks() {
    if (!this.isBrowserEnv || typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((entryList) => {
        entryList.getEntries().forEach((entry) => {
          console.info(
            '[Perf] Long task',
            `${entry.startTime.toFixed(0)}ms`,
            `duration ${entry.duration.toFixed(0)}ms`
          );
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
      this.performanceObservers.push(observer);
    } catch (error) {
      console.warn('[Perf] Unable to observe long tasks', error);
    }
  }

  private markDeferredSectionReady(section: DeferredSectionKey) {
    let updated = false;

    switch (section) {
      case 'categories':
        if (!this.categoriesReady) {
          this.categoriesReady = true;
          updated = true;
        }
        break;
      case 'brands':
        if (!this.brandsReady) {
          this.brandsReady = true;
          updated = true;
        }
        break;
      case 'specialOffers':
        if (!this.specialOffersReady) {
          this.specialOffersReady = true;
          updated = true;
        }
        break;
    }

    if (updated) {
      this.cdr.markForCheck();
    }
  }

  private isDeferredSectionReady(section: DeferredSectionKey): boolean {
    switch (section) {
      case 'categories':
        return this.categoriesReady;
      case 'brands':
        return this.brandsReady;
      case 'specialOffers':
        return this.specialOffersReady;
      default:
        return true;
    }
  }

  shouldRenderVideo(slide: HeroSlide, index: number): boolean {
    return (
      this.heroVideoEnabled &&
      this.canUseHeroVideo &&
      slide.media_type === 'video' &&
      !!slide.video_path &&
      this.isActiveHeroSlide(index)
    );
  }

  isActiveHeroSlide(index: number): boolean {
    return this.currentSlideIndex === index;
  }

  getHeroPrimaryImage(slide: HeroSlide): string {
    const variant = this.getHeroVariant(slide);
    return (
      variant?.defaultSrc ||
      (slide as any).optimizedImagePath ||
      slide.image_path ||
      this.heroFallbackImage
    );
  }

  onSlideChange(event?: any) {
    if (this.heroSwiper?.swiperRef) {
      this.currentSlideIndex = this.heroSwiper.swiperRef.realIndex;
    }
  }

  selectLocation(location: Location) {
    this.selectedLocation = location;
    this.cdr.markForCheck();
  }

  closeLocationDetails() {
    this.selectedLocation = null;
    this.cdr.markForCheck();
  }

  navigateToLocation(location: Location) {
    const loc: any = location;
    let lat: number | undefined;
    let lng: number | undefined;

    if (loc.lat !== undefined && loc.lng !== undefined) {
      lat = Number(loc.lat);
      lng = Number(loc.lng);
    } else if (loc.latitude !== undefined && loc.longitude !== undefined) {
      lat = Number(loc.latitude);
      lng = Number(loc.longitude);
    }

    if (lat !== undefined && lng !== undefined) {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, '_blank');
      return;
    }

    if (loc.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        loc.address
      )}`;
      window.open(url, '_blank');
    }
  }

  // ============================================
  // INSTAGRAM VIDEO METHODS
  // ============================================

  /**
   * Toggle video play/pause state
   * @param videoPlayer - HTML video element
   * @param videoItem - Video data object
   */
  togglePlayPause(videoPlayer: HTMLVideoElement, videoItem: any): void {
    if (videoPlayer.paused) {
      // Pause all other videos first
      this.pauseAllVideos();

      // Play the selected video
      videoPlayer
        .play()
        .then(() => {
          this.isPlaying[videoItem.id] = true;
          this.cdr.markForCheck();
        })
        .catch((error) => {
          console.error('Error playing video:', error);
        });
    } else {
      // Pause the video
      videoPlayer.pause();
      this.isPlaying[videoItem.id] = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Pause all playing videos
   */
  private pauseAllVideos(): void {
    if (isPlatformBrowser(this.platformId)) {
      const videos = document.querySelectorAll('.instagram-section video');
      videos.forEach((video: any) => {
        if (!video.paused) {
          video.pause();
        }
      });

      // Reset all playing states
      Object.keys(this.isPlaying).forEach((key) => {
        this.isPlaying[key] = false;
      });

      this.cdr.markForCheck();
    }
  }

  // ============================================
  // TRANSLATION METHODS
  // ============================================

  private loadTranslations() {
    this.translationService
      .getTranslations()
      .pipe(take(1))
      .subscribe((translations) => {
        this.translations = translations || {};

      // Common UI translations
      if (!this.translations['previous']) {
        this.translations['previous'] =
          this.currentLang === 'ar' ? 'السابق' : 'Previous';
      }
      if (!this.translations['next']) {
        this.translations['next'] = this.currentLang === 'ar' ? 'التالي' : 'Next';
      }
      if (!this.translations['read_more']) {
        this.translations['read_more'] =
          this.currentLang === 'ar' ? 'اقرأ المزيد' : 'Read More';
      }
      if (!this.translations['view_all']) {
        this.translations['view_all'] =
          this.currentLang === 'ar' ? 'عرض الكل' : 'View All';
      }

      // Hero Section Translations
      if (!this.translations['explore_cars']) {
        this.translations['explore_cars'] =
          this.currentLang === 'ar' ? 'استكشف السيارات' : 'Explore Cars';
      }
      if (!this.translations['learn_more']) {
        this.translations['learn_more'] =
          this.currentLang === 'ar' ? 'اعرف المزيد' : 'Learn More';
      }
      if (!this.translations['cars_available']) {
        this.translations['cars_available'] =
          this.currentLang === 'ar' ? 'سيارة متاحة' : 'Cars Available';
      }
      if (!this.translations['happy_clients']) {
        this.translations['happy_clients'] =
          this.currentLang === 'ar' ? 'عميل سعيد' : 'Happy Clients';
      }
      if (!this.translations['rating']) {
        this.translations['rating'] =
          this.currentLang === 'ar' ? 'التقييم' : 'Rating';
      }
      if (!this.translations['scroll_down']) {
        this.translations['scroll_down'] =
          this.currentLang === 'ar' ? 'مرر لأسفل' : 'Scroll Down';
      }

      // Hero Slides Translations
      if (!this.translations['premium_car_rental']) {
        this.translations['premium_car_rental'] =
          this.currentLang === 'ar'
            ? 'تأجير سيارات فاخر'
            : 'Premium Car Rental';
      }
      if (!this.translations['luxury_comfort']) {
        this.translations['luxury_comfort'] =
          this.currentLang === 'ar'
            ? 'الفخامة والراحة مع أسطولنا الحصري'
            : 'Luxury and comfort with our exclusive fleet';
      }
      if (!this.translations['new']) {
        this.translations['new'] = this.currentLang === 'ar' ? 'جديد' : 'New';
      }
      if (!this.translations['luxury_sedans_suvs']) {
        this.translations['luxury_sedans_suvs'] =
          this.currentLang === 'ar'
            ? 'سيارات سيدان وSUV فاخرة'
            : 'Luxury Sedans & SUVs';
      }
      if (!this.translations['drive_premium_vehicles']) {
        this.translations['drive_premium_vehicles'] =
          this.currentLang === 'ar'
            ? 'قد سيارات فاخرة بأسعار مميزة'
            : 'Drive premium vehicles at great rates';
      }
      if (!this.translations['best_sellers']) {
        this.translations['best_sellers'] =
          this.currentLang === 'ar' ? 'الأكثر مبيعاً' : 'Best Sellers';
      }
      if (!this.translations['team_help_anytime']) {
        this.translations['team_help_anytime'] =
          this.currentLang === 'ar'
            ? 'فريقنا هنا لمساعدتك في أي وقت'
            : 'Our team is here to help anytime';
      }
      if (!this.translations['reliable']) {
        this.translations['reliable'] =
          this.currentLang === 'ar' ? 'موثوق' : 'Reliable';
      }
      if (!this.translations['explore_city']) {
        this.translations['explore_city'] =
          this.currentLang === 'ar' ? 'استكشف المدينة' : 'Explore the City';
      }
      if (!this.translations['discover_best_spots']) {
        this.translations['discover_best_spots'] =
          this.currentLang === 'ar'
            ? 'اكتشف أفضل الأماكن مع التأجير المرن'
            : 'Discover the best spots with flexible rentals';
      }
      if (!this.translations['adventure']) {
        this.translations['adventure'] =
          this.currentLang === 'ar' ? 'مغامرة' : 'Adventure';
      }

      // Re-prepare hero slides with updated translations
      if (this.headerSection) {
        this.prepareHeroSlides();
      }

      // Instagram Section Translations
      if (!this.translations['follow_us']) {
        this.translations['follow_us'] =
          this.currentLang === 'ar' ? 'تابعنا' : 'Follow Us';
      }
      if (!this.translations['instagram_videos']) {
        this.translations['instagram_videos'] =
          this.currentLang === 'ar' ? 'فيديوهات إنستجرام' : 'Instagram Videos';
      }
      if (!this.translations['instagram_description']) {
        this.translations['instagram_description'] =
          this.currentLang === 'ar'
            ? 'شاهد أحدث مغامراتنا ولحظات من وراء الكواليس'
            : 'Check out our latest adventures and behind-the-scenes moments';
      }
      if (!this.translations['view_instagram']) {
        this.translations['view_instagram'] =
          this.currentLang === 'ar' ? 'عرض على إنستجرام' : 'View on Instagram';
      }
      if (!this.translations['view_all_instagram']) {
        this.translations['view_all_instagram'] =
          this.currentLang === 'ar'
            ? 'عرض الكل على إنستجرام'
            : 'View All on Instagram';
      }
      if (!this.translations['video']) {
        this.translations['video'] =
          this.currentLang === 'ar' ? 'فيديو' : 'Video';
      }
      if (!this.translations['recent']) {
        this.translations['recent'] =
          this.currentLang === 'ar' ? 'مؤخراً' : 'Recent';
      }
      if (!this.translations['play_video']) {
        this.translations['play_video'] =
          this.currentLang === 'ar' ? 'تشغيل الفيديو' : 'Play video';
      }
      if (!this.translations['pause_video']) {
        this.translations['pause_video'] =
          this.currentLang === 'ar' ? 'إيقاف الفيديو' : 'Pause video';
      }

      // Map/Location Section Translations (NEW)
      if (!this.translations['our_locations']) {
        this.translations['our_locations'] =
          this.currentLang === 'ar' ? 'مواقعنا' : 'Our Locations';
      }
      if (!this.translations['where_to_find_us']) {
        this.translations['where_to_find_us'] =
          this.currentLang === 'ar' ? 'أين تجدنا' : 'Where to Find Us';
      }
      if (!this.translations['find_us_description']) {
        this.translations['find_us_description'] =
          this.currentLang === 'ar'
            ? 'قم بزيارة أي من فروعنا المناسبة في جميع أنحاء الإمارات'
            : 'Visit any of our convenient locations across the UAE';
      }
      if (!this.translations['all_branches']) {
        this.translations['all_branches'] =
          this.currentLang === 'ar' ? 'جميع الفروع' : 'All Branches';
      }
      if (!this.translations['get_directions']) {
        this.translations['get_directions'] =
          this.currentLang === 'ar' ? 'احصل على الاتجاهات' : 'Get Directions';
      }
      if (!this.translations['contact_us']) {
        this.translations['contact_us'] =
          this.currentLang === 'ar' ? 'اتصل بنا' : 'Contact Us';
      }
      if (!this.translations['branches']) {
        this.translations['branches'] =
          this.currentLang === 'ar' ? 'فرع' : 'Branches';
      }
      if (!this.translations['cities']) {
        this.translations['cities'] =
          this.currentLang === 'ar' ? 'مدن' : 'Cities';
      }
      if (!this.translations['availability']) {
        this.translations['availability'] =
          this.currentLang === 'ar' ? 'متاح' : 'Available';
      }
      if (!this.translations['support']) {
        this.translations['support'] =
          this.currentLang === 'ar' ? 'دعم' : 'Support';
      }
      if (!this.translations['zoom_in']) {
        this.translations['zoom_in'] =
          this.currentLang === 'ar' ? 'تكبير' : 'Zoom In';
      }
      if (!this.translations['zoom_out']) {
        this.translations['zoom_out'] =
          this.currentLang === 'ar' ? 'تصغير' : 'Zoom Out';
      }

      this.prepareHeroSlides();
      this.cdr.markForCheck();
    });
  }
}
