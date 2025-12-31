// product-show.component.ts
import { Component, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { LanguageService } from 'src/app/core/services/language.service';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';
import { ProductResource } from 'src/app/Models/product.model';
import { ProductService } from 'src/app/services/product/product.service';
import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { SeoService } from 'src/app/services/seo/seo.service';
import { isPlatformBrowser } from '@angular/common';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';
import { ViewportService } from 'src/app/core/services/viewport.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-product-show',
  templateUrl: './product-show.component.html',
  styleUrls: ['./product-show.component.scss'],
})
export class ProductShowComponent implements OnDestroy {
  ProductSlug: string | undefined;
  productDetails: ProductResource | null = null;
  images: any[] | undefined;
  currentLang: string = 'en';
  numVisible: number = 5;
  responsiveOptions: any[];
  translations: Record<string, string> = {};
  activeIndex = 0;
  contactData: any;

  // Full screen gallery properties
  isFullScreen: boolean = false;
  currentImageIndex: number = 0;
  // Description expand/collapse
  isDescriptionExpanded: boolean = false;

  private destroy$ = new Subject<void>();

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

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private languageService: LanguageService,
    private router: Router,
    private translationService: TranslationService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private seo: SeoService,
    private sharedDataService: SharedDataService,
    private viewport: ViewportService
  ) {
    this.responsiveOptions = [
      {
        breakpoint: '320',
        numVisible: 3,
        slidesPerView: 1,
      },
      {
        breakpoint: '480',
        numVisible: 3,
        slidesPerView: 1,
      },
      {
        breakpoint: '900',
        numVisible: 3,
        slidesPerView: 1,
      },
      {
        breakpoint: '1100',
        numVisible: 4,
        slidesPerView: 1,
      },
    ];
  }

  ngOnInit(): void {
    this.currentLang = this.languageService.getCurrentLanguage();
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.currentLang = this.languageService.getCurrentLanguage();
        }
      });
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.ProductSlug = this.route.snapshot.params['slug'];
        this.getProductBySlug();
      });
    this.translationService
      .getTranslations()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.translations = data;
      });
    this.sharedDataService.currentWhatsapp
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.contactData = data || {};
      });
    this.updateNumVisible(window.innerWidth);

    // react to viewport width changes via shared service (single listener app-wide)
    this.viewport.width$
      .pipe(takeUntil(this.destroy$))
      .subscribe((width) => this.updateNumVisible(width));
  }

  get whatsappUrl(): string {
    const message = `${this.translations['whatsapp_text_one']} https://www.afandinacarrental.com  ${this.translations['whatsapp_text_two']} ${this.productDetails?.data.name} \n https://www.afandinacarrental.com/${this.currentLang}/product/${this.productDetails?.data.slug}`;
    return `https://wa.me/${
      this.contactData.whatsapp
    }?text=${encodeURIComponent(message)}`;
  }

  getBrandSlug(brandName: string | undefined): string {
    if (!brandName) return '';
    return brandName.toLowerCase().replace(/\s+/g, '-');
  }

  getCategorySlug(categoryName: string | undefined): string {
    if (!categoryName) return '';
    return categoryName.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Generate SEO-optimized H1 title (max 70 characters)
   * Priority: Brand + Model + Year + Category
   */
  generateOptimizedH1(): string {
    if (!this.productDetails?.data) return '';

    const data = this.productDetails.data;
    const name = data.name || '';
    const brand = data.brand || '';
    const category = data.category || '';
    const year = data.year ? data.year.toString() : '';
    const model = data.car_model || '';

    // Try to create optimized title with key information
    let optimizedTitle = '';

    if (brand && year) {
      // Format: "Brand Model Year - Category"
      optimizedTitle = brand;

      if (model && optimizedTitle.length + model.length + 1 <= 50) {
        optimizedTitle += ` ${model}`;
      } else {
        // Extract first word from name if no model
        const firstWord = name.split(' ')[1] || name.split(' ')[0];
        if (
          firstWord &&
          firstWord !== brand &&
          optimizedTitle.length + firstWord.length + 1 <= 50
        ) {
          optimizedTitle += ` ${firstWord}`;
        }
      }

      if (year && optimizedTitle.length + year.length + 1 <= 60) {
        optimizedTitle += ` ${year}`;
      }

      if (category && optimizedTitle.length + category.length + 3 <= 70) {
        optimizedTitle += ` - ${category}`;
      }
    } else {
      // Fallback: truncate name
      optimizedTitle = this.getTruncatedTitle(name, 70);
    }

    return optimizedTitle || name;
  }

  /**
   * Truncate text at word boundary
   */
  getTruncatedTitle(title: string, maxLength: number = 70): string {
    if (!title) return '';
    if (title.length <= maxLength) return title;

    // Cut at last space before maxLength to avoid breaking words
    const truncated = title.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 0
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Get full product name for meta/schema
   */
  getFullProductName(): string {
    return this.productDetails?.data?.name || '';
  }

  /**
   * Generate rich product description for meta tags
   */
  getMetaDescription(): string {
    if (!this.productDetails?.data) return '';

    const data = this.productDetails.data;
    const parts: string[] = [];

    if (data.brand) parts.push(data.brand);
    if (data.name) parts.push(data.name);
    if (data.year) parts.push(data.year.toString());
    if (data.category) parts.push(data.category);

    let description = parts.join(' - ');

    if (data.description) {
      const shortDesc = data.description.substring(0, 100);
      description += `. ${shortDesc}`;
    }

    // Add key features
    if (data.passenger_capacity) {
      description += `. ${data.passenger_capacity} Passengers`;
    }

    // Truncate to 160 characters for optimal meta description
    return this.getTruncatedTitle(description, 160);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.isFullScreen) return;

    if (event.key === 'Escape') {
      this.closeFullScreen();
    } else if (event.key === 'ArrowLeft') {
      this.previousImage();
    } else if (event.key === 'ArrowRight') {
      this.nextImage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateNumVisible(width: number) {
    if (width < 576) {
      this.numVisible = 1;
    } else if (width >= 576 && width < 768) {
      this.numVisible = 2;
    } else if (width >= 768 && width < 992) {
      this.numVisible = 3;
    } else if (width >= 992 && width < 1200) {
      this.numVisible = 4;
    } else {
      this.numVisible = 5;
    }
  }

  // Full screen gallery methods

  openFullScreen(indexOrItem?: number | any): void {
    let idx: number | undefined;

    if (typeof indexOrItem === 'number') {
      idx = indexOrItem;
    } else if (indexOrItem != null && this.images) {
      // try to find exact object reference first, then by file_path fallback
      idx = this.images.findIndex((img) => img === indexOrItem);
      if (idx === -1) {
        idx = this.images.findIndex(
          (img) =>
            img.file_path &&
            indexOrItem.file_path &&
            img.file_path === indexOrItem.file_path
        );
      }
    }

    // If we couldn't resolve a valid index, fall back to 0
    if (idx == null || idx < 0 || Number.isNaN(idx)) {
      idx = 0;
    }

    this.currentImageIndex = idx;
    this.isFullScreen = true;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  openFullScreenFromGalleria(item: any): void {
    this.openFullScreen(item);
  }

  closeFullScreen(): void {
    this.isFullScreen = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'auto';
    }
  }

  nextImage(): void {
    if (this.images && this.images.length > 0) {
      this.currentImageIndex =
        (this.currentImageIndex + 1) % this.images.length;
    }
  }

  previousImage(): void {
    if (this.images && this.images.length > 0) {
      this.currentImageIndex =
        this.currentImageIndex === 0
          ? this.images.length - 1
          : this.currentImageIndex - 1;
    }
  }

  // Toggle description expand/collapse
  toggleDescription(): void {
    this.isDescriptionExpanded = !this.isDescriptionExpanded;
  }

  getProductBySlug() {
    if (this.ProductSlug) {
      this.productService.getProductDetails(this.ProductSlug).subscribe(
        (res: ProductResource) => {
          if (!res || !res.data) {
            const lang = this.currentLang || 'en';
            this.router.navigate([`/${lang}/404`]);
            return;
          }
          this.productDetails = res;
          this.images = (res.data.images || []).filter(
            (item) => item.type === 'image'
          );

          // Enhanced SEO Meta Tags
          if (isPlatformServer(this.platformId)) {
            this.setSeoMetaTags();
          }
          if (isPlatformBrowser(this.platformId)) {
            this.setSeoMetaTags();
          }
        },
        (error) => {
          const lang = this.currentLang || 'en';
          try {
            this.router.navigate([`/${lang}/404`]);
          } catch (e) {
            window.location.href = `/${lang}/404`;
          }
        }
      );
    }
  }

  /**
   * Set comprehensive SEO meta tags
   */
  private setSeoMetaTags(): void {
    if (!this.productDetails?.data) return;

    // Use existing SEO service for base tags
    this.seo.setMetaTags(this.productDetails.data.seo_data, 'product-show');
    this.seo.og_property_product(this.productDetails.data);

    // Add enhanced meta description
    const metaDescription = this.getMetaDescription();
    this.seo.updateTag({
      name: 'description',
      content: metaDescription,
    });

    // Add Twitter Card meta tags
    this.seo.updateTag({
      name: 'twitter:card',
      content: 'summary_large_image',
    });
    this.seo.updateTag({
      name: 'twitter:title',
      content: this.generateOptimizedH1(),
    });
    this.seo.updateTag({
      name: 'twitter:description',
      content: metaDescription,
    });

    if (this.images && this.images.length > 0) {
      const mainImage = `https://admin.afandinacarrental.com/storage/${this.images[0].file_path}`;
      this.seo.updateTag({
        name: 'twitter:image',
        content: mainImage,
      });
    }

    // Update canonical URL
    const canonicalUrl = `https://www.afandinacarrental.com/${this.currentLang}/product/${this.productDetails.data.slug}`;
    this.seo.updateTag({
      rel: 'canonical',
      href: canonicalUrl,
    });
  }
}
