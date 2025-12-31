import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  HostListener,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  NgZone,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { LanguageService } from 'src/app/core/services/language.service';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';
import { HomeService } from 'src/app/services/home/home.service';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';
import { isPlatformBrowser } from '@angular/common';
import {
  BrandsSection,
  CategoriesSection,
  LocationSection,
} from 'src/app/Models/home.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { rafThrottle } from 'src/app/shared/utils/raf-throttle';
import { ViewportService } from 'src/app/core/services/viewport.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnDestroy {
  @Input() brands: any;
  brandsSection: BrandsSection | null = null;
  categoriesSection: CategoriesSection | null = null;
  locationSection: LocationSection | null = null;

  @Input() light_logo!: string;
  @Input() dark_logo!: string;
  @Input() black_logo!: string;

  readonly defaultLogo = '/assets/images/logo/logo.svg';

  currentLang: string = 'en'; // Default to 'en'
  @ViewChild('navbarCollapse') navbarCollapse!: ElementRef;
  isBrandDropdownVisible = false;
  isCategoryDropdownVisible = false;
  isLocationDropdownVisible = false;
  @Input() languages: any[] = [];
  searchResults: any = {};
  showDropdown = false;
  isDropdownVisible = false;
  search: boolean = false;
  translations: Record<string, string> = {};
  translationsReady: boolean = false;
  // isMobile = window.innerWidth <= 768;
  isMobile = false;
  private _rafSearch!: (...args: any[]) => void;
  // whether the nav is scrolled (used to apply compact/sticky styles)
  isScrolled: boolean = false;

  locations: any;
  private destroy$ = new Subject<void>();
  constructor(
    private router: Router,
    private languageService: LanguageService,
    private homeService: HomeService,
    private translationService: TranslationService,
    @Inject(PLATFORM_ID) private platformId: Object,
    public sharedDataService: SharedDataService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private viewport: ViewportService
  ) {
      if (isPlatformBrowser(this.platformId)) {
        this.router.events
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.closeNavbar();
        });
      // subscribe once to shared viewport stream to avoid multiple window listeners
      this.viewport.isMobile$
        .pipe(takeUntil(this.destroy$))
        .subscribe((isMobile) => {
          this.isMobile = isMobile;
          this.cdr.markForCheck();
        });
    }
  }
  private _scrollListener: any;
  private _scrollTicking = false;

  isHomePage(): boolean {
    return this.router.url.includes('home');
  }

  ngOnInit(): void {
    // Prefer the language reported by TranslationService (set after translations load),
    // fallback to LanguageService if not available yet. This avoids rendering old
    // translation strings briefly when the user switches language.
    // Prefer the language derived from the URL / storage (LanguageService),
    // fall back to TranslationService's reported lang. This avoids briefly
    // showing English when translation service defaults to 'en' before payload arrives.
    this.currentLang = this.languageService.getCurrentLanguage() || this.translationService.getCurrentLang();

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          // prefer the language from URL/storage (LanguageService)
          this.currentLang = this.languageService.getCurrentLanguage() || this.translationService.getCurrentLang();
          this.cdr.markForCheck();
        }
      });
    if (isPlatformBrowser(this.platformId)) {
      this.translationService
        .getTranslations()
        .pipe(takeUntil(this.destroy$))
        .subscribe((data) => {
          this.translations = data || {};
          // mark translationsReady only when translations belong to current language
          const hasData = this.translations && Object.keys(this.translations).length > 0;
          const translationsLang = this.translationService.getCurrentLang();
          this.translationsReady = hasData && translationsLang === this.currentLang;
          this.cdr.markForCheck();
        });

      // also listen for translation service language changes to reset readiness
      this.translationService
        .onLangChange()
        .pipe(takeUntil(this.destroy$))
        .subscribe((lang) => {
          // When language changes, wait until translations for that language arrive
          this.translationsReady = false;
          // Update currentLang only when translation service reports it
          if (lang) {
            this.currentLang = lang;
          }
          this.cdr.markForCheck();
        });

      this.sharedDataService.categories$
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.categoriesSection = res;
          this.cdr.markForCheck();
        });

      this.sharedDataService.brands$
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.brandsSection = res;
          this.cdr.markForCheck();
        });

      // raf-throttled search executor: performs the actual HTTP call
      this._rafSearch = rafThrottle((search_key: string) => {
        this.homeService
          .getSearch({ query: search_key })
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (res: any) => {
              this.searchResults = res.data;
              this.showDropdown = true;
              this.cdr.markForCheck();
            },
            () => {
              // handle error silently
            }
          );
      });

      this.sharedDataService.locations$
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.locationSection = res;
          this.cdr.markForCheck();
        });
    }
    this.initScrollListener();
  }

  getLocationList() {
    this.homeService.getAllLocation().subscribe((res: any) => {
      this.locations = res.locations;
    });
  }

  // toggleDropdown(type: 'brand' | 'category' | 'location') {
  //   if (type === 'brand') {
  //     this.isBrandDropdownVisible = !this.isBrandDropdownVisible;
  //     this.isCategoryDropdownVisible = false;
  //     this.isLocationDropdownVisible = false;
  //   } else if (type === 'category') {
  //     this.isCategoryDropdownVisible = !this.isCategoryDropdownVisible;
  //     this.isBrandDropdownVisible = false;
  //     this.isLocationDropdownVisible = false;
  //   } else if (type === 'location') {
  //     this.isLocationDropdownVisible = !this.isLocationDropdownVisible;
  //     this.isBrandDropdownVisible = false;
  //     this.isCategoryDropdownVisible = false;
  //   }
  // }

  toggleDropdown(type: 'brand' | 'category' | 'location') {
    if (type === 'brand') {
      this.isBrandDropdownVisible = !this.isBrandDropdownVisible;
      this.isCategoryDropdownVisible = false;
      this.isLocationDropdownVisible = false;
    } else if (type === 'category') {
      this.isCategoryDropdownVisible = !this.isCategoryDropdownVisible;
      this.isBrandDropdownVisible = false;
      this.isLocationDropdownVisible = false;
    } else if (type === 'location') {
      this.isLocationDropdownVisible = !this.isLocationDropdownVisible;
      this.isBrandDropdownVisible = false;
      this.isCategoryDropdownVisible = false;
    }
  }

  closeNavbar(event?: Event) {
    if (event) {
      event.preventDefault();
    }
    // ensure custom mega-menus close whenever nav collapses
    this.isBrandDropdownVisible = false;
    this.isCategoryDropdownVisible = false;
    this.isLocationDropdownVisible = false;
    if (
      isPlatformBrowser(this.platformId) &&
      this.navbarCollapse?.nativeElement
    ) {
      if (this.navbarCollapse.nativeElement.classList.contains('show')) {
        this.navbarCollapse.nativeElement.classList.remove('show');
        this.isDropdownVisible = false;
      }
    }
    // trigger OnPush check
    this.cdr.markForCheck();
  }

  // closeNavbar() {
  //   if (isPlatformBrowser(this.platformId) && this.navbarCollapse?.nativeElement) {
  //     if (this.navbarCollapse.nativeElement.classList.contains('show')) {
  //       this.navbarCollapse.nativeElement.classList.remove('show');
  //       this.isDropdownVisible = false;
  //     }
  //   }
  // }

  showDialog() {
    this.search = true;
  }

  close() {
    this.search = false;
  }

  Search(event: any): void {
    const search_key = (event.target.value || '').toString();
    // clear immediately on empty input to avoid stale dropdown
    if (!search_key || search_key.trim() === '') {
      this.showDropdown = false;
      this.searchResults = [];
      this.cdr.markForCheck();
      return;
    }
    // schedule throttled search via rAF — reduces layout/read/write thrash
    this._rafSearch(search_key);
  }

  onFocus() {
    this.showDropdown = !!this.searchResults.length;
  }

  onBlur() {
    setTimeout(() => (this.showDropdown = false), 200);
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isOutside =
      !target.closest('.search-results') && !target.closest('.input-group');
    if (isOutside) {
      this.showDropdown = false;
    }
  }

  // Add a scroll listener to toggle the compact scrolled state
  private initScrollListener() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.ngZone.runOutsideAngular(() => {
      this._scrollListener = () => {
        if (this._scrollTicking) return;
        this._scrollTicking = true;
        requestAnimationFrame(() => {
          const offset =
            window.pageYOffset || document.documentElement.scrollTop || 0;
          const newScrolled = offset > 60;
          if (this.isScrolled !== newScrolled) {
            this.ngZone.run(() => {
              this.isScrolled = newScrolled;
              this.cdr.markForCheck();
            });
          }
          this._scrollTicking = false;
        });
      };
      window.addEventListener('scroll', this._scrollListener, { passive: true });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this._scrollListener) {
      window.removeEventListener('scroll', this._scrollListener as EventListener);
    }
  }
}
