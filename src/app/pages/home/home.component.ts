import {
  Component,
  Input,
  OnInit,
  ViewChild,
  AfterViewInit,
  OnDestroy,
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
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';
import SwiperCore, {
  Autoplay,
  EffectFade,
  Pagination,
  Navigation,
  Parallax,
} from 'swiper';
import { SwiperOptions } from 'swiper';
import { SwiperComponent } from 'swiper/angular';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';

// Install Swiper modules
SwiperCore.use([Autoplay, EffectFade, Pagination, Navigation, Parallax]);

// Interface for Hero Slides
interface HeroSlide {
  id: string;
  media_type: 'video' | 'image';
  video_path?: string;
  image_path?: string;
  title?: string;
  description?: string;
  badge?: string;
  show_cta?: boolean;
  show_stats?: boolean;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroSwiper') heroSwiper?: SwiperComponent;

  // ============================================
  // HERO SECTION PROPERTIES
  // ============================================
  heroSlides: HeroSlide[] = [];
  currentSlideIndex: number = 0;

  // Hero Swiper Configuration
  heroSwiperConfig: SwiperOptions = {
    slidesPerView: 1,
    speed: 1200,
    effect: 'fade',
    fadeEffect: {
      crossFade: true,
    },
    parallax: true,
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    loop: true,
    grabCursor: true,
    watchSlidesProgress: true,
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
  headerSection!: HeaderSection;
  brandsSection!: BrandsSection;
  categoriesSection!: CategoriesSection;
  onlyOnAfandinaSection!: AfandinaSection;
  specialOffersSection!: SpecialOffersSection;
  whyChooseUsSection!: WhyChooseUsSection;
  blogs!: BlogData;
  faqsSection!: any;
  locationSection!: LocationSection;
  documentSection!: DocumentSection;
  instagramSection!: InstagramSection;
  footerSection!: FooterSection;
  advertisements!: Advertisements;
  where_find_us: any;
  currentLang: string = 'en';
  translations: Record<string, string> = {};
  isPlaying: { [key: string]: boolean } = {};

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
    private seo: SeoService
  ) {}

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================
  ngOnInit() {
    this.currentLang = this.languageService.getCurrentLanguage();

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentLang = this.languageService.getCurrentLanguage();
        this.loadTranslations();
      }
    });

    this.loadTranslations();
    this.getHome();

    if (isPlatformBrowser(this.platformId)) {
      this.sharedDataService.categories$.subscribe((res) => {
        this.categoriesSection = res;
      });

      this.sharedDataService.brands$.subscribe((res) => {
        this.brandsSection = res;
      });

      this.sharedDataService.locations$.subscribe((res) => {
        this.locationSection = res;
      });
    }

    this.getFaqs();
    this.getBlogs();

    if (isPlatformServer(this.platformId)) {
      this.seo.updateMetadataForType('home');
    }
    if (isPlatformBrowser(this.platformId)) {
      this.seo.updateMetadataForType('home');
    }
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      const videoElement = document.querySelector('video');
      if (videoElement) {
        videoElement.muted = true;
      }
    }
  }

  ngOnDestroy() {
    // Pause all videos on component destroy
    this.pauseAllVideos();
  }

  // ============================================
  // DATA FETCHING METHODS
  // ============================================
  getHome() {
    this.homeService.getHome().subscribe((res: HomeResponse) => {
      this.headerSection = res.data.header_section;
      this.onlyOnAfandinaSection = res.data.only_on_afandina_section;
      this.specialOffersSection = res.data.special_offers_section;
      this.whyChooseUsSection = res.data.why_choose_us_section;
      this.documentSection = res.data.document_section;
      this.instagramSection = res.data.short_videos_section;
      this.where_find_us = res.data.where_find_us;
      this.advertisements = res.data.advertisements;

      // Prepare hero slides from header section
      this.prepareHeroSlides();
    });
  }

  getFaqs() {
    this.homeService.getFaqs().subscribe((res: FaqsSection) => {
      this.faqsSection = res;
    });
  }

  getBlogs() {
    this.homeService.getBlogs().subscribe((res: BlogData) => {
      this.blogs = res;
    });
  }

  // ============================================
  // HERO SECTION METHODS
  // ============================================
  prepareHeroSlides() {
    // Create slides from header section data
    if (this.headerSection) {
      const header: any = this.headerSection;
      const mediaType: 'video' | 'image' =
        header && header.hero_media_type === 'video' ? 'video' : 'image';
      this.heroSlides = [
        {
          id: 'slide-1',
          media_type: mediaType,
          video_path: header?.hero_header_video_path,
          image_path: header?.hero_header_image_path,
          title: header?.hero_header_title || 'Premium Car Rental',
          description:
            header?.hero_header_description ||
            'Luxury and comfort with our exclusive fleet',
          badge: 'New',
          show_cta: true,
          show_stats: true,
        },
        {
          id: 'slide-2',
          media_type: 'image',
          image_path: '../../../assets/images/logo/car3.jpg',
          title: 'Luxury Sedans & SUVs',
          description: 'Drive premium vehicles at great rates',
          badge: 'Best Sellers',
          show_cta: true,
          show_stats: false,
        },
        {
          id: 'slide-3',
          media_type: 'image',
          image_path: '../../../assets/images/logo/car1 (1).jpg',
          description: 'Our team is here to help anytime',
          badge: 'Reliable',
          show_cta: true,
          show_stats: false,
        },
        {
          id: 'slide-4',
          media_type: 'image',
          image_path: '../../../assets/images/logo/car2.jpg',
          title: 'Explore the City',
          description: 'Discover the best spots with flexible rentals',
          badge: 'Adventure',
          show_cta: true,
          show_stats: false,
        },
      ];
    }
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

  onSlideChange(event?: any) {
    if (this.heroSwiper?.swiperRef) {
      this.currentSlideIndex = this.heroSwiper.swiperRef.realIndex;
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
        })
        .catch((error) => {
          console.error('Error playing video:', error);
        });
    } else {
      // Pause the video
      videoPlayer.pause();
      this.isPlaying[videoItem.id] = false;
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
    }
  }

  // ============================================
  // TRANSLATION METHODS
  // ============================================

  private loadTranslations() {
    this.translationService.getTranslations().subscribe((translations) => {
      this.translations = translations;

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
    });
  }
}
