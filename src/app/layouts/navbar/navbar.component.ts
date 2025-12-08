import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
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
  // isMobile = window.innerWidth <= 768;
  isMobile = false;
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
    private cdr: ChangeDetectorRef
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.closeNavbar();
        });
      this.isMobile = window.innerWidth <= 768;
    }
  }

  isHomePage(): boolean {
    return this.router.url.includes('home');
  }

  ngOnInit(): void {
    this.currentLang = this.languageService.getCurrentLanguage();
    // React instantly to language toggles without waiting for navigation
    this.languageService.languageChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        if (!lang || lang === this.currentLang) return;
        this.currentLang = lang;
        this.cdr.markForCheck();
      });

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.currentLang = this.languageService.getCurrentLanguage();
          this.cdr.markForCheck();
        }
      });
    if (isPlatformBrowser(this.platformId)) {
      this.translationService
        .getTranslations()
        .pipe(takeUntil(this.destroy$))
        .subscribe((data) => {
          this.translations = data;
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

      this.sharedDataService.locations$
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.locationSection = res;
          this.cdr.markForCheck();
        });
    }
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
    const search_key = event.target.value;
    if (search_key && search_key.trim() !== '') {
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
            // handle error
          }
        );
    } else {
      this.showDropdown = false;
      this.searchResults = [];
      this.cdr.markForCheck();
    }
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

  @HostListener('window:resize')
  onResize() {
    if (isPlatformBrowser(this.platformId)) {
      this.isMobile = window.innerWidth <= 768;
      this.cdr.markForCheck();
    }
  }

  // Add a scroll listener to toggle the compact scrolled state
  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!isPlatformBrowser(this.platformId)) return;
    const offset =
      window.pageYOffset || document.documentElement.scrollTop || 0;
    // Threshold can be adjusted as needed
    this.isScrolled = offset > 60;
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
