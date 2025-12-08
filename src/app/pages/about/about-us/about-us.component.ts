import { Component } from '@angular/core';
import { NavigationEnd, Router, ActivatedRoute } from '@angular/router';
import { LanguageService } from 'src/app/core/services/language.service';
import { AboutUsResponse } from 'src/app/Models/about.model';
import { AboutUsService } from 'src/app/services/about-us/about-us.service';
import { SeoService } from 'src/app/services/seo/seo.service';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-about-us',
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss']
})
export class AboutUsComponent {

  aboutUsData: AboutUsResponse | null = null;
  currentLang: string = 'en';
  constructor(
    private aboutUsService: AboutUsService,
    private languageService: LanguageService,
    private router: Router,
    private route: ActivatedRoute,
    private seo:SeoService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ){}

  ngOnInit(): void {
    this.currentLang = this.languageService.getCurrentLanguage();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentLang = this.languageService.getCurrentLanguage();
      }
    });
    this.aboutUsService.getAboutUsData().subscribe(
      (res) => {
        this.aboutUsData = res;
      },
      (error) => {
      }
    );
    this.applyRouteSeo();
    if (isPlatformServer(this.platformId)) {
      this.seo.updateMetadataForType('about_us');
    }
    if (isPlatformBrowser(this.platformId)) {
      this.seo.updateMetadataForType('about_us');
    }
  }

  private applyRouteSeo(): void {
    const seoData = this.route.snapshot.data['seo'] || {};
    const langParam =
      ((this.route.parent || this.route).snapshot.paramMap.get('lang') as 'en' | 'ar') ||
      this.currentLang ||
      'en';

    this.seo.applyStaticMeta({
      title: seoData.title || 'Afandina | About',
      description: seoData.description || 'About Afandina car rental services.',
      keywords: seoData.keywords || 'about afandina, car rental, dubai',
      image: seoData.image || 'https://afandinacarrental.com/assets/images/logo/car3-optimized.webp',
      imageAlt: seoData.imageAlt || 'Afandina Car Rental',
      canonical: seoData.canonical,
      lang: langParam,
      robots: seoData.robots || { index: 'index', follow: 'follow' },
    });
  }

}
