import { Injectable, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from 'src/app/services/storage/storage.service';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { REQUEST } from '@nguniversal/express-engine/tokens';
import { Request } from 'express';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private currentLanguage: string = 'en';
  private currentCurrency: string = '1';
  private currencyCode: string = 'AED';
  private languageChange = new BehaviorSubject<string>('');
  private readonly allowedLanguages = ['en', 'ar'];

  constructor(
    private storageService: StorageService,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() @Inject('LANGUAGE') private ssrLang: string,
    @Optional() @Inject(REQUEST) private request: Request
  ) {
    if (isPlatformServer(this.platformId)) {
      // On server, only accept supported languages from SSR injection
      this.currentLanguage =
        this.ssrLang && this.allowedLanguages.includes(this.ssrLang)
          ? this.ssrLang
          : 'en';
    } else if (isPlatformBrowser(this.platformId)) {
      const pathSegments = window.location.pathname
        .split('/')
        .filter((segment) => segment);
      if (pathSegments.length > 0 && /^[a-z]{2}$/i.test(pathSegments[0])) {
        const seg = pathSegments[0].toLowerCase();
        // If segment is supported, use it. Otherwise redirect to same path with 'en'
        if (this.allowedLanguages.includes(seg)) {
          this.currentLanguage = seg;
          this.storageService.setItem('currentLanguage', seg);
        } else {
          // replace invalid language with 'en' and redirect
          pathSegments[0] = 'en';
          const newPath = '/' + pathSegments.join('/');
          if (newPath !== window.location.pathname) {
            window.location.href = newPath;
            // stop further execution in this constructor — browser will navigate
            return;
          } else {
            // fallback
            this.currentLanguage = 'en';
            this.storageService.setItem('currentLanguage', 'en');
          }
        }
      } else {
        this.currentLanguage =
          this.storageService.getItem('currentLanguage') || 'en';
      }
    } else {
      this.currentLanguage = 'en';
    }

    this.currentCurrency =
      this.storageService.getItem('currentCurrency') || '1';
    this.currencyCode = this.storageService.getItem('currencyCode') || 'AED';
    this.currencyCodeSource.next(this.currencyCode);
  }

  private languagesSource = new BehaviorSubject<any[]>([
    { code: 'ar', name: 'العربية', direction: 'rtl' },
    { code: 'en', name: 'English', direction: 'ltr' },
  ]);
  languages$ = this.languagesSource.asObservable();
  languageChange$ = this.languageChange.asObservable();

  private currenciesSource = new BehaviorSubject<any[]>([]);
  Currency$ = this.currenciesSource.asObservable();

  private currencyCodeSource = new BehaviorSubject<string>('AED');
  currentCurrencyCode$ = this.currencyCodeSource.asObservable();

  setLanguages(languages: any[]): void {
    this.languagesSource.next(languages);
  }

  setCurrencies(currencies: any[]): void {
    this.currenciesSource.next(currencies);
  }

  getCurrentLanguage(): string {
    if (isPlatformServer(this.platformId)) {
      return this.ssrLang || 'en';
    }
    return this.currentLanguage;
  }

  setCurrentLanguage(language: string, emit: boolean = true): void {
    // Only allow switching to supported languages
    const lang = (language || '').toLowerCase();
    const target = this.allowedLanguages.includes(lang) ? lang : 'en';
    if (this.currentLanguage === target) {
      return;
    }

    this.currentLanguage = target;
    if (isPlatformBrowser(this.platformId)) {
      this.storageService.setItem('currentLanguage', target);
    }

    // notify listeners (e.g. components that need to react without reloading)
    if (emit) {
      this.languageChange.next(target);
    }
  }

  getCurrentCurrency(): string {
    return this.currentCurrency;
  }

  setCurrentCurrency(currency: string): void {
    this.currentCurrency = currency;
    this.storageService.setItem('currentCurrency', currency);
  }

  setCurrentCurrencyCode(code: string): void {
    // Keep the primitive property in sync with the observable/stateful source
    this.currencyCode = code;

    if (code !== this.currencyCodeSource.getValue()) {
      this.currencyCodeSource.next(code);
    }

    this.storageService.setItem('currencyCode', code);
  }

  getCurrentCurrencyCode(): string {
    return this.currencyCode;
  }
}
