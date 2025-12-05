import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from './product-card/product-card.component';
import { SwiperModule } from 'swiper/angular';
import { CardModule } from 'primeng/card';
import { GalleriaModule } from 'primeng/galleria';
import { AccordionModule } from 'primeng/accordion';
import { ImageModule } from 'primeng/image';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [ProductCardComponent],
  imports: [
    CommonModule,
    RouterModule,
    SwiperModule,
    CardModule,
    GalleriaModule,
    AccordionModule,
    ImageModule,
    TranslateModule,
  ],
  exports: [ProductCardComponent],
})
export class ProductUiModule {}
