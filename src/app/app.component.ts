import {
  Component,
  Inject,
  PLATFORM_ID,
  Optional,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { BrandsSection, CategoriesSection } from './Models/home.model';

import { HomeService } from './services/home/home.service';

import { SharedDataService } from './services/SharedDataService/shared-data-service.service';

import { MainSetting } from './Models/setting.models';

import { LanguageService } from './core/services/language.service';

import { LoaderService } from './core/services/loader/loader.service';

import { TranslationService } from './core/services/Translation/translation.service';

import { ActivatedRoute, Router } from '@angular/router';

import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',

  templateUrl: './app.component.html',

  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Afandina';

  private readonly defaultLogo = '/assets/images/logo/logo.svg';

  brandsSection!: BrandsSection;

  categoriesSection!: CategoriesSection;

  settings!: MainSetting;

  languages: any[] = [];

  currencies: any[] = [];

  currentLang: string = 'en';

  dark_logo: string = this.defaultLogo;

  light_logo: string = this.defaultLogo;

  black_logo: string = this.defaultLogo;

  isScrolled = false;

  favicon!: string;

  // Phone number as a number type to match the component binding
  phoneNumber!: number;

  contactData: any;

  isLoading$ = this.loaderService.loading$;

  private destroy$ = new Subject<void>();
  private settingsCache = new Map<string, any>();
  private settingsRequestInFlight = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,

    @Optional() @Inject('LANGUAGE') private ssrLang: string,

    private homeService: HomeService,

    private sharedDataService: SharedDataService,

    private languageService: LanguageService,

    private loaderService: LoaderService,

    private translationService: TranslationService,

    private route: ActivatedRoute,

    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Get current language - this will handle both SSR and browser cases

    const currentLang = this.languageService.getCurrentLanguage();

    // Apply language settings

    this.applyLanguageSettings(currentLang);

    // Prime translations immediately for the current language
    this.loadTranslationsForLang(currentLang);

    // Keep UI in sync when language changes without full page reloads
    this.languageService.languageChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((lang) => {
        if (!lang || lang === this.currentLang) return;
        this.currentLang = lang;
        this.applyLanguageSettings(lang);
        this.loadTranslationsForLang(lang, true);
        this.getSettings(true);
      });

    // Load settings immediately on the client to avoid double render caused by delayed fetch
    if (isPlatformBrowser(this.platformId)) {
      this.getSettings();
    }
  }

  private loadTranslationsForLang(lang: string, showLoader: boolean = false) {
    // fetch lightweight locale file from assets to avoid waiting on settings API
    if (showLoader) {
      this.loaderService.show(800);
    }

    this.http
      .get<Record<string, string>>(`/assets/i18n/${lang}.json`)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          if (showLoader) {
            this.loaderService.hide();
          }
        })
      )
      .subscribe(
        (data) => {
          this.translationService.setTranslations(data || {});
          this.translationService.setCurrentLang(lang);
        },
        () => {
          // fallback: keep existing translations but still update current lang
          this.translationService.setCurrentLang(lang);
        }
      );
  }

  applyLanguageSettings(newLang: any) {
    // Only run in browser
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const bo = document.querySelector('body');

    const el = document.querySelector('html');

    if (el && bo) {
      if (newLang === 'ar') {
        el.setAttribute('lang', 'ar');

        el.setAttribute('direction', 'rtl');

        el.setAttribute('dir', 'rtl');

        bo.classList.add('arabic');

        el.classList.add('arabic');
      } else {
        el.setAttribute('lang', 'en');

        el.setAttribute('direction', 'ltr');

        el.setAttribute('dir', 'ltr');

        bo.classList.remove('arabic');

        el.classList.remove('arabic');
      }
    }
  }

  getSettings(force: boolean = false) {
    const lang = this.languageService.getCurrentLanguage();

    if (!force && this.settingsCache.has(lang)) {
      this.applySettings(this.settingsCache.get(lang));
      return;
    }

    if (this.settingsRequestInFlight && !force) {
      return;
    }

    this.settingsRequestInFlight = true;

    this.homeService
      .getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (res: any) => {
          this.settingsRequestInFlight = false;
          this.settingsCache.set(lang, res);
          this.applySettings(res);
        },
        () => {
          this.settingsRequestInFlight = false;
        }
      );
  }

  private applySettings(res: any) {
    if (!res?.data?.main_setting) return;

    this.settings = res;
    this.dark_logo = res.data.main_setting.dark_logo || this.defaultLogo;
    this.light_logo = res.data.main_setting.light_logo || this.defaultLogo;
    this.black_logo = res.data.main_setting.black_logo || this.defaultLogo;
    this.favicon = res.data.main_setting.favicon;
    this.phoneNumber = res.data.main_setting.contact_data.phone;

    this.languages = res.data.main_setting.languages;
    this.contactData = res.data.main_setting.contact_data;

    this.currencies = res.data.main_setting.currencies || [];

    this.languageService.setLanguages(this.languages);
    this.sharedDataService.contactData(this.contactData);

    const translationData = res.data.main_setting.translation_data;
    this.translationService.setTranslations(translationData);

    if (isPlatformBrowser(this.platformId)) {
      this.updateIconHref();
    }

    const storedCurrencyId = isPlatformBrowser(this.platformId)
      ? localStorage.getItem('currentCurrency')
      : null;

    const storedCurrency = storedCurrencyId
      ? this.currencies.find(
          (currency: any) => currency.id.toString() === storedCurrencyId
        )
      : null;

    const defaultCurrency = this.currencies.find(
      (currency: any) => currency.is_default === 1
    );

    const currencyToUse = storedCurrency || defaultCurrency;

    if (currencyToUse && isPlatformBrowser(this.platformId)) {
      localStorage.setItem('currentCurrency', currencyToUse.id.toString());
      localStorage.setItem('currencyCode', currencyToUse.code);
      localStorage.setItem('currency_name', currencyToUse.name);

      this.languageService.setCurrentCurrency(currencyToUse.id.toString());
      this.languageService.setCurrentCurrencyCode(currencyToUse.code);
    }
  }

  updateIconHref() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const iconUrl = `${this.favicon}`;

    const link =
      document.querySelector("link[rel*='icon']") ||
      document.createElement('link');

    link.setAttribute('rel', 'icon');

    link.setAttribute('type', 'image/x-icon');

    link.setAttribute('href', iconUrl);

    if (!document.head.contains(link)) {
      document.head.appendChild(link);
    }
  }

  // مراقبة حدث التمرير
  @HostListener('window:scroll')
  onWindowScroll() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    // ظهور الزر عندما يتجاوز التمرير 300 بكسل
    const scrollPosition =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    this.isScrolled = scrollPosition > 300;
  }

  // وظيفة التمرير لأعلى الصفحة
  scrollToTop() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private scheduleIdleTask(task: () => void, timeout = 1200) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const win = window as any;
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => task(), { timeout });
    } else {
      setTimeout(() => task(), timeout);
    }
  }
}
