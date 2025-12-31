import { NgModule, isDevMode, NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LayoutsModule } from './layouts/layouts.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  HttpClientModule,
  HttpClient,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { createTranslateLoader } from './translate/translate-loader';
import { SharedModule } from './shared/shared.module';
import { SwiperModule } from 'swiper/angular';
import { LanguageCurrencyInterceptor } from './core/interceptors/language-currency.interceptor';
import { RouterModule } from '@angular/router';
import { LoaderInterceptor } from './core/interceptors/loader/loader.interceptor';
import { LoaderService } from './core/services/loader/loader.service';
import { LanguageService } from './core/services/language.service';
import { TranslationService } from './core/services/Translation/translation.service';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { NotFoundInterceptor } from './core/interceptors/not-found.interceptor';
import { AllCarsComponent } from './pages/all-cars/all-cars.component';

// Load a minimal translation file before bootstrap to avoid showing fallback text
export function loadInitialTranslationsFactory(http: HttpClient, ts: TranslationService) {
  return () =>
    http
      .get<Record<string, string>>('/assets/i18n/en.json')
      .toPromise()
      .then((data) => {
        ts.setTranslations(data || {});
        ts.setCurrentLang('en');
      })
      .catch(() => { });
}

@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
    AllCarsComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    LayoutsModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    }),
    SharedModule,
    SwiperModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LanguageCurrencyInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoaderInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: NotFoundInterceptor,
      multi: true,
    },
    LoaderService,
    LanguageService,
    TranslationService,
    {
      provide: APP_INITIALIZER,
      useFactory: loadInitialTranslationsFactory,
      deps: [HttpClient, TranslationService],
      multi: true,
    },
  ],
  schemas: [NO_ERRORS_SCHEMA, CUSTOM_ELEMENTS_SCHEMA],
  bootstrap: [AppComponent],
})
export class AppModule { }
