import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { LanguageService } from 'src/app/core/services/language.service';
import { Subscription } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

interface Language {
  code: string;
  name: string;
  direction?: string; // 'rtl' or 'ltr'
}

@Component({
  selector: 'app-language',
  templateUrl: './language.component.html',
  styleUrls: ['./language.component.scss'],
})
export class LanguageComponent implements OnInit, OnDestroy {
  currentLang: string = 'en';
  currentLangName: string = 'English';
  languages: Language[] = [];
  private isBrowser: boolean;
  private subscription = new Subscription();

  constructor(
    private languageService: LanguageService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Get current language and apply settings
    this.currentLang = this.languageService.getCurrentLanguage();
    this.updateCurrentLangName();
    if (this.isBrowser) {
      this.applyLanguageSettings(this.currentLang);
    }

    // Subscribe to languages list updates
    this.subscription.add(
      this.languageService.languages$.subscribe((languages: Language[]) => {
        if (languages && languages.length > 0) {
          this.languages = languages;
          // If current language exists, apply its settings
          if (this.currentLang && this.isBrowser) {
            const currentLangData = this.languages.find(
              (l) => l.code === this.currentLang
            );
            if (currentLangData) {
              this.applyLanguageSettings(this.currentLang);
            }
          }
          this.updateCurrentLangName();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private updateCurrentLangName(): void {
    const langData = this.languages.find((l) => l.code === this.currentLang);
    this.currentLangName = langData ? langData.name : this.currentLang;
  }

  get nextLanguageCode(): string {
    return this.currentLang === 'ar' ? 'en' : 'ar';
  }

  get nextLanguageName(): string {
    const target = this.nextLanguageCode;
    const langData = this.languages.find((l) => l.code === target);
    return langData ? langData.name : target;
  }

  getLanguageUrl(langCode: string): string {
    if (!this.isBrowser) return '';

    const currentPath = this.router.url;
    const segments = currentPath.split('/').filter((s) => s);

    // If first segment is a language code, replace it
    if (segments.length > 0 && /^[a-z]{2}$/i.test(segments[0])) {
      segments[0] = langCode;
    } else {
      // Otherwise, add language code at the beginning
      segments.unshift(langCode);
    }

    // Preserve query parameters if they exist
    const [path, query] = currentPath.split('?');
    const newPath = '/' + segments.join('/');
    return query ? `${newPath}?${query}` : newPath;
  }

  changeLanguage(newLang: string): void {
    if (!this.isBrowser || this.currentLang === newLang) return;

    // Build target URL and perform a single hard reload; do not pre-apply language to avoid double render
    const newUrl = this.getLanguageUrl(newLang);
    // Persist choice silently for future sessions; no emit to avoid mid-flight updates
    this.languageService.setCurrentLanguage(newLang, false);
    window.location.replace(newUrl);
  }

  toggleLanguage(): void {
    if (!this.isBrowser) return;
    const newLang = this.nextLanguageCode;

    // Prevent no-op
    if (newLang === this.currentLang) return;

    // Use the same flow as manual selection
    this.changeLanguage(newLang);
  }

  private applyLanguageSettings(langCode: string): void {
    if (!this.isBrowser) return;

    const bo = document.querySelector('body');
    const el = document.querySelector('html');

    if (!el || !bo) return;

    // Find language data
    const langData = this.languages.find((l) => l.code === langCode);
    if (!langData) return;

    // Get direction from language data, default to 'ltr' if not specified
    const direction = langData.direction || (langCode === 'ar' ? 'rtl' : 'ltr');

    // Set language and direction attributes
    el.setAttribute('lang', langCode);
    el.setAttribute('direction', direction);
    el.setAttribute('dir', direction);
    el.style.direction = direction;

    // Toggle direction-specific classes
    if (direction === 'rtl') {
      bo.classList.add('rtl');
      el.classList.add('rtl');
    } else {
      bo.classList.remove('rtl');
      el.classList.remove('rtl');
    }
  }
}
