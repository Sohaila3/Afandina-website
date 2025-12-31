import { Options } from '@angular-slider/ngx-slider';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { map, shareReplay, takeUntil } from 'rxjs/operators';
import { LanguageService } from 'src/app/core/services/language.service';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';
import { FilterData } from 'src/app/Models/filterData.model';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';
import { ProductService } from 'src/app/services/product/product.service';

@Component({
  selector: 'app-product-filter',
  templateUrl: './product-filter.component.html',
  styleUrls: ['./product-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFilterComponent implements OnInit, OnDestroy {
  filterData: any;
  loadingProducts = true;
  readonly pageSize = 20;
  currentIndex = 0;
  showSeeMore = false;
  private readonly destroy$ = new Subject<void>();
  private readonly carsCacheKey = '__allCars$';

  productFilterForm: FormGroup;
  activePanels: number[] = [];
  isArabic: boolean = false;
  minValue: number = 100;
  maxValue: number = 30000;
  activeIndex: number[] = [0, 1, 2, 3, 4];
  sliderOptions: Options = {
    floor: 0,                // Minimum possible value
    ceil: 30000,              // Maximum possible value
    translate: (value: number): string => {
      return `${value}`;
    }
  };
  isBrowser: boolean = false;
  translations: Record<string, string> = {};

  selectedCategories: number[] = [];
  selectedBrands: number[] = [];
  selectedColors: number[] = [];
  selectedTransmissions: number[] = [];
  allCars: any[] = [];
  filteredCars: any[] = [];
  visibleCars: any[] = [];
  productFilter?: FilterData;
  currentLang: string = 'en';
  private isAllCarsRoute = false;
  constructor(
    private productService: ProductService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private languageService: LanguageService,
    private router: Router,
    private translationService: TranslationService,
    private sharedDataService: SharedDataService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,

  ) {
    this.productFilterForm = this.fb.group({
      brand_id: [[]],
      category_id: [[]],
      color_id: [[]],
      gear_type_id: [[]],
      luggage_capacity: [null],

      daily_main_price: [[100, 30000]],
      weekly_main_price: [[100, 30000]],
      monthly_main_price: [[100, 30000]],
      word: [''],
    });
    this.isBrowser = isPlatformBrowser(this.platformId);
  }


  applyPriceFilter() {
    const filterParams = {
      min_price: this.minValue,
      max_price: this.maxValue,
    };
  }


  ngOnInit() {
    this.translationService
      .getTranslations()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.translations = data;
        this.cdr.markForCheck();
      });
    this.currentLang = this.languageService.getCurrentLanguage();
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentLang = this.languageService.getCurrentLanguage();
        this.cdr.markForCheck();
      }
    });
    // Assuming you have a dynamic panel count (e.g., from an array of data)
    const numberOfPanels = 5;
    this.activePanels = Array.from({ length: numberOfPanels }, (_, index) => index);
    
    // Check if we're on the all-cars route
    this.isAllCarsRoute = this.router.url.includes('/all-cars');
    
    if (this.isAllCarsRoute) {
      this.loadAllCars();
    } else {
      // For the search page, apply filters based on query params
      this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
        if (params['category']) {
          this.selectedCategories = [parseInt(params['category'], 10)];
        }
        if (params['brand']) {
          this.selectedBrands = [parseInt(params['brand'], 10)];
        }
        
          // Immediately show loading state to avoid empty-state flash
          this.loadingProducts = true;
          this.cdr.markForCheck();

          // Trigger the filter with the selected values
          this.submitFilter();
      });
    }

    this.getFilterData();
  }


  /**
   * trackBy function for product list to reduce re-renders
   */
  trackByCar(_index: number, item: any) {
    return item?.id ?? item?.slug ?? _index;
  }



  getFilterData() {
    this.productService.getProductFilter().subscribe((res: FilterData) => {
      this.productFilter = res;
    });
  }

  private loadAllCars(): void {
    this.loadingProducts = true;
    this.getCachedCars$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cars: any[]) => {
          this.allCars = cars;
          this.filteredCars = cars;
          this.resetPagination();
          this.appendNextPage(true);
          this.loadingProducts = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingProducts = false;
          this.cdr.markForCheck();
        },
      });
  }

  private getCachedCars$() {
    const store = this.sharedDataService as any;
    if (!store[this.carsCacheKey]) {
      const filters = { page: 1, per_page: 500 };
      store[this.carsCacheKey] = this.productService
        .getFilteredProducts({ filters })
        .pipe(
          map((res) => (Array.isArray(res?.data) ? res.data : [])),
          shareReplay(1)
        );
    }
    return store[this.carsCacheKey];
  }

  private applyFilters(): void {
    if (!this.allCars.length) {
      return;
    }
    this.filteredCars = this.allCars.filter((car) => this.matchesFilters(car));
    this.resetPagination();
    this.appendNextPage(true);
  }

  private matchesFilters(car: any): boolean {
    const matchesCategory =
      !this.selectedCategories.length ||
      this.selectedCategories.includes(Number(car?.category_id ?? car?.category?.id));
    const matchesBrand =
      !this.selectedBrands.length ||
      this.selectedBrands.includes(Number(car?.brand_id ?? car?.brand?.id));
    const matchesColor =
      !this.selectedColors.length ||
      this.selectedColors.includes(Number(car?.color_id ?? car?.color?.id));
    const matchesTransmission =
      !this.selectedTransmissions.length ||
      this.selectedTransmissions.includes(Number(car?.gear_type_id ?? car?.gear_type));
    const dailyPrice = Number(car?.daily_main_price ?? car?.daily_price ?? 0);
    const matchesPrice = dailyPrice >= this.minValue && dailyPrice <= this.maxValue;
    return (
      matchesCategory &&
      matchesBrand &&
      matchesColor &&
      matchesTransmission &&
      matchesPrice
    );
  }

  private resetPagination(): void {
    this.currentIndex = 0;
    this.visibleCars = [];
    this.showSeeMore = false;
  }

  private appendNextPage(isInitial = false): void {
    const nextIndex = Math.min(this.currentIndex + this.pageSize, this.filteredCars.length);
    const nextSlice = this.filteredCars.slice(this.currentIndex, nextIndex);
    this.visibleCars = isInitial ? nextSlice : [...this.visibleCars, ...nextSlice];
    this.currentIndex = nextIndex;
    this.showSeeMore = this.currentIndex < this.filteredCars.length;
    this.cdr.markForCheck();
  }





  updateSelectedCategories(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
        if (!this.selectedCategories.includes(id)) {
            this.selectedCategories.push(id); // Only add if not already in the array
        }
    } else {
        this.selectedCategories = this.selectedCategories.filter(item => item !== id); // Remove if unchecked
    }
    this.submitFilter();
}

// Update functions for brands
updateSelectedBrands(id: number, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
      if (!this.selectedBrands.includes(id)) {
          this.selectedBrands.push(id); // Add brand ID if not already selected
      }
  } else {
      this.selectedBrands = this.selectedBrands.filter(item => item !== id); // Remove brand ID if unchecked
  }
  this.submitFilter();

}

// Update for Colors
updateSelectedColors(id: number, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
      if (!this.selectedColors.includes(id)) {
          this.selectedColors.push(id); // Add color ID if not already selected
      }
  } else {
      this.selectedColors = this.selectedColors.filter(item => item !== id); // Remove color ID if unchecked
  }
  this.submitFilter();

}

// Update for Transmissions
updateSelectedTransmissions(id: number, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
      if (!this.selectedTransmissions.includes(id)) {
          this.selectedTransmissions.push(id); // Add transmission ID if not already selected
      }
  } else {
      this.selectedTransmissions = this.selectedTransmissions.filter(item => item !== id); // Remove transmission ID if unchecked
  }
  this.submitFilter();
}


  onPriceChange() {
    this.submitFilter();
  }

  submitFilter() {
    const filters = {
      category_id: this.selectedCategories,
      brand_id: this.selectedBrands,
      color_id: this.selectedColors,
      gear_type_id: this.selectedTransmissions,
      daily_main_price: [this.minValue, this.maxValue],
      page: 1,
      per_page: 500,
    };

    this.loadingProducts = true;
    this.productService.getFilteredProducts({ filters }).subscribe(
      (res) => {
        const list = Array.isArray(res.data) ? res.data : [];

        if (this.isAllCarsRoute) {
          // server-side filtered list for all-cars page, then paginate client-side
          this.allCars = list;
          this.filteredCars = list;
          this.resetPagination();
          this.appendNextPage(true);
        } else {
          this.visibleCars = list;
          this.showSeeMore = false;
        }

        this.loadingProducts = false;
        this.cdr.markForCheck();
      },
      () => {
        this.loadingProducts = false;
        this.cdr.markForCheck();
      }
    );
  }

  clearFilter() {
    this.selectedCategories = [];
    this.selectedBrands = []; 
    this.selectedColors = []; 
    this.selectedTransmissions = []; 
    this.minValue = 100;
    this.maxValue = 30000;

    this.submitFilter();
  }

  showMore(): void {
    this.appendNextPage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  

}
