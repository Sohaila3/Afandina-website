import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';
import { LanguageService } from 'src/app/core/services/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-card-blog',
  templateUrl: './card-blog.component.html',
  styleUrls: ['./card-blog.component.scss']
})
export class CardBlogComponent implements OnInit, OnDestroy {
  @Input() blogData: any;
  translations: Record<string, string> = {};
  currentLang: string = 'en';
  private translationsSubscription: Subscription | undefined;
  private readonly storageBase = 'https://admin.afandinacarrental.com/storage/';
  private readonly fallbackImage = '/assets/images/logo/car3-optimized.webp';

  constructor(
    private translationService: TranslationService,
    private languageService: LanguageService
  ) {
    this.currentLang = this.languageService.getCurrentLanguage();
  }

  ngOnInit() {
    this.translationsSubscription = this.translationService.getTranslations().subscribe((data) => {
      this.translations = data;
    });
  }

  ngOnDestroy() {
    if (this.translationsSubscription) {
      this.translationsSubscription.unsubscribe();
    }
  }

  getBlogImage(): string {
    if (!this.blogData) return this.fallbackImage;

    const candidate =
      this.blogData.image_path ||
      this.blogData.image ||
      this.blogData.featured_image ||
      this.blogData.thumbnail ||
      this.blogData.cover ||
      this.blogData?.data?.image_path ||
      this.blogData?.data?.image ||
      '';

    if (!candidate) return this.fallbackImage;

    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }

    const normalized = (candidate as string).replace(/^\/+/, '');

    // If backend already returns a path under storage/, avoid double prefixing
    if (normalized.startsWith('storage/')) {
      return `https://admin.afandinacarrental.com/${normalized}`;
    }

    return this.storageBase + normalized;
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (target && target.src !== window.location.origin + this.fallbackImage) {
      target.src = this.fallbackImage;
    }
  }
}
