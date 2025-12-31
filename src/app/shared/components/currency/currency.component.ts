import { Component, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from 'src/app/core/services/language.service';
import { HomeService } from 'src/app/services/home/home.service';
import { isPlatformBrowser } from '@angular/common';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-currency',
  templateUrl: './currency.component.html',
  styleUrls: ['./currency.component.scss']
})
export class CurrencyComponent implements OnDestroy {
  currencies: any;
  currentCurrency: string | null = null;
  isBrowser: boolean;
  currentLang: string = 'en';
  private subs: Subscription[] = [];

  constructor(
    private languageService: LanguageService,
    private router: Router,
    private homeService: HomeService,
    private sharedDataService: SharedDataService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.currentCurrency = localStorage.getItem('currencyCode');
    }
  }

  ngOnInit(): void {
    this.currentLang = this.languageService.getCurrentLanguage();

    if (this.isBrowser) {
      this.currentCurrency = localStorage.getItem('currencyCode');
    }
    if (isPlatformBrowser(this.platformId)) {
      this.subs.push(
        this.sharedDataService.crruncies$.subscribe((res) => {
          if (res && res.currencies) {
            this.currencies = res.currencies;
            this.getCurrencies();
          }
        })
      );

      // keep currentCurrency in sync with LanguageService observable
      this.subs.push(
        this.languageService.currentCurrencyCode$.subscribe((code) => {
          if (code) {
            this.currentCurrency = code;
            if (this.isBrowser) {
              localStorage.setItem('currencyCode', code);
            }
          }
        })
      );
    }
  }

  getCurrencies() {
    const storedCurrencyId = this.isBrowser
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

    if (currencyToUse) {
      this.languageService.setCurrentCurrency(currencyToUse.id.toString());
      this.languageService.setCurrentCurrencyCode(currencyToUse.code);

      if (this.isBrowser) {
        localStorage.setItem('currentCurrency', currencyToUse.id.toString());
        localStorage.setItem('currencyCode', currencyToUse.code);
        localStorage.setItem('currency_name', currencyToUse.name);
      }
    }
    this.languageService.setCurrencies(this.currencies);
  }

  changeCurrency(newCurrency: string, code: string, currency_name: string) {
    this.languageService.setCurrentCurrency(newCurrency);
    this.languageService.setCurrentCurrencyCode(code);
    if (this.isBrowser) {
      // keep localStorage in sync immediately
      localStorage.setItem('currency_name', currency_name);
      localStorage.setItem('currencyCode', code);
      localStorage.setItem('currentCurrency', newCurrency.toString());
    }
    const currentUrl = this.router.url;
    // this.router.navigateByUrl(currentUrl);
    if (this.isBrowser && typeof window !== 'undefined') {
      window.location.href = currentUrl;
    } else {
      // server: no-op (navigation won't happen on server)
    }
  }

  resetToDirham() {
    if (!this.currencies || !this.currencies.length) return;
    let dirham = this.currencies.find(
      (c: any) => (c.code && c.code.toUpperCase() === 'AED') || (c.name && c.name.includes('درهم'))
    );
    if (!dirham) {
      dirham = this.currencies.find((c: any) => c.is_default === 1) || this.currencies[0];
    }
    if (dirham) {
      this.changeCurrency(dirham.id.toString(), dirham.code, dirham.name);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
