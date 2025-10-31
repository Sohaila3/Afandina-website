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
import { GoogleMapsModule, GoogleMap } from '@angular/google-maps';

// Declare google maps
declare var google: any;

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

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroSwiper') heroSwiper?: SwiperComponent;
  @ViewChild('googleMap') googleMap?: GoogleMap;

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
  // MAP PROPERTIES (NEW)
  // ============================================
  mapCenter = { lat: 25.2048, lng: 55.2708 }; // Dubai coordinates
  mapZoom = 11;
  mapMarkers: any[] = [];
  selectedLocation: Location | null = null;

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

      // Initialize map (NEW)
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.initializeMap(), 100);
      }
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
  // MAP METHODS (NEW)
  // ============================================

  /**
   * Initialize Google Maps with markers
   */
  initializeMap() {
    if (this.where_find_us?.locations) {
      // Build markers robustly: locations may come with lat/lng numbers, or
      // a coords string, or under a nested position object. Handle common shapes.
      this.mapMarkers = this.where_find_us.locations
        .map((location: any) => {
          // Try a few patterns to extract lat/lng
          let lat: number | undefined;
          let lng: number | undefined;

          if (location.lat !== undefined && location.lng !== undefined) {
            lat = Number(location.lat);
            lng = Number(location.lng);
          } else if (
            location.latitude !== undefined &&
            location.longitude !== undefined
          ) {
            lat = Number(location.latitude);
            lng = Number(location.longitude);
          } else if (location.position && location.position.lat !== undefined) {
            lat = Number(location.position.lat);
            lng = Number(location.position.lng);
          } else if (location.coords && typeof location.coords === 'string') {
            // coords may be "lat,lng" or a string with whitespace
            const parts = location.coords
              .split(/[\s,]+/)
              .map((p: string) => p.trim())
              .filter(Boolean);
            if (parts.length >= 2) {
              lat = Number(parts[0]);
              lng = Number(parts[1]);
            }
          }

          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            return {
              position: { lat, lng },
              label: {
                text: location.name || '',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
              },
              title: location.name,
              icon: {
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMTgiIGZpbGw9IiNGRkQzMDAiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSI0Ii8+CjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjgiIGZpbGw9IiMwMDAwMDAiLz4KPC9zdmc+',
                scaledSize: { width: 40, height: 40 },
              },
              data: location,
            };
          }

          // Skip invalid locations (no coordinates)
          return null;
        })
        .filter((m: any) => m !== null);

      // Calculate center based on all markers
      if (this.mapMarkers.length > 0) {
        const avgLat =
          this.mapMarkers.reduce((sum, m) => sum + m.position.lat, 0) /
          this.mapMarkers.length;
        const avgLng =
          this.mapMarkers.reduce((sum, m) => sum + m.position.lng, 0) /
          this.mapMarkers.length;
        this.mapCenter = { lat: avgLat, lng: avgLng };
      }
    }
  }

  /**
   * Handle marker click event
   * @param marker - The clicked marker
   */
  onMarkerClick(marker: any) {
    this.selectedLocation = marker.data;
  }

  /**
   * Close location details modal
   */
  closeLocationDetails() {
    this.selectedLocation = null;
  }

  /**
   * Navigate to location in Google Maps
   * @param location - Location to navigate to
   */
  navigateToLocation(location: Location) {
    // Accept either a location object, or a marker-like object with position,
    // or a coords string. Build a directions URL to open Google Maps with
    // destination set to lat,lng when possible; otherwise fall back to a search by name.
    let lat: number | undefined;
    let lng: number | undefined;
    const loc: any = location;

    if (loc.lat !== undefined && loc.lng !== undefined) {
      lat = Number(loc.lat);
      lng = Number(loc.lng);
    } else if (loc.latitude !== undefined && loc.longitude !== undefined) {
      lat = Number(loc.latitude);
      lng = Number(loc.longitude);
    } else if (loc.position && loc.position.lat !== undefined) {
      lat = Number(loc.position.lat);
      lng = Number(loc.position.lng);
    } else if (loc.coords && typeof loc.coords === 'string') {
      const parts = loc.coords
        .split(/[\s,]+/)
        .map((p: string) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        lat = Number(parts[0]);
        lng = Number(parts[1]);
      }
    }

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      // Pan the inline google-map to the selected location and zoom in
      this.mapCenter = { lat: lat!, lng: lng! };
      this.mapZoom = Math.max(this.mapZoom, 14);

      // If we have a ViewChild reference to the GoogleMap, call panTo
      try {
        if (this.googleMap && typeof this.googleMap.panTo === 'function') {
          this.googleMap.panTo({ lat: lat!, lng: lng! });
        }
      } catch (err) {
        // ignore pan failures; mapCenter/zoom update will still reposition map
        console.warn('googleMap.panTo failed', err);
      }

      // Find matching marker and open its details in the sidebar/modal
      const found = this.mapMarkers.find(
        (m) => m.position && m.position.lat === lat && m.position.lng === lng
      );
      if (found) {
        this.onMarkerClick(found);
      } else {
        // Set selected location to provided data so modal shows details
        this.selectedLocation = loc;
      }
    } else {
      // fallback: search by name or address in a new tab
      const q = encodeURIComponent(
        loc.name || loc.address || 'Afandina Car Rental'
      );
      const url = `https://www.google.com/maps/search/?api=1&query=${q}`;
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
    });
  }
}
