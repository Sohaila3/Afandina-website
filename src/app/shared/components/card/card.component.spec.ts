import { CommonModule } from '@angular/common';
import { PLATFORM_ID, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CardModule } from 'primeng/card';
import { of } from 'rxjs';
import { SwiperModule } from 'swiper/angular';
import { LanguageService } from 'src/app/core/services/language.service';
import { SharedDataService } from 'src/app/services/SharedDataService/shared-data-service.service';
import { TranslationService } from 'src/app/core/services/Translation/translation.service';

import { CardComponent } from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  const mockLanguageService = {
    getCurrentLanguage: () => 'en',
  } as Partial<LanguageService>;

  const mockSharedDataService = {
    currentWhatsapp: of({ whatsapp: '123', phone: '123', email: 'test@example.com' }),
  } as Partial<SharedDataService>;

  const translationMock = {
    sale: 'Sale',
    no_deposit: 'No deposit',
    per_day: 'per day',
    per_month: 'per month',
    km: 'km',
    free_delivery: 'Free delivery',
    insurance_included: 'Insurance included',
    crypto_payment_accepted: 'Crypto payment accepted',
    whatsapp: 'Whatsapp',
    call_us: 'Call us',
    whatsapp_text_one: 'Check out',
    whatsapp_text_two: 'this car:',
  } as Record<string, string>;

  const mockTranslationService = {
    getTranslations: () => of(translationMock),
  } as Partial<TranslationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, RouterTestingModule, SwiperModule, CardModule],
      declarations: [CardComponent],
      providers: [
        { provide: LanguageService, useValue: mockLanguageService },
        { provide: SharedDataService, useValue: mockSharedDataService },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;

    component.carData = {
      images: [{ type: 'image', thumbnail_path: 'thumb.jpg', file_path: 'file.mp4' }],
      slug: 'test-car',
      name: 'Test Car',
      category_name: 'SUV',
      passenger_capacity: '4',
      door_count: '4',
      discount_rate: '0',
      daily_discount_price: '100',
      daily_main_price: '120',
      monthly_discount_price: '2000',
      monthly_main_price: '2200',
      currency: { name: 'USD' },
      daily_mileage_included: '100',
      monthly_mileage_included: '3000',
      no_deposit: '0',
      free_delivery: '0',
      insurance_included: '0',
      crypto_payment_accepted: '0',
      thumbnail_image: 'thumb.jpg',
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
