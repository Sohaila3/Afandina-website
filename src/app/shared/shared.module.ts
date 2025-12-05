import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// CardComponent moved to product UI module to avoid pulling heavy libs into root bundle.
// lightweight stub component will be provided instead (see CardStubComponent).
import { CardModule } from 'primeng/card';
import { BannerHeadComponent } from './components/banner-head/banner-head.component';
import { CardBlogComponent } from './components/card-blog/card-blog.component';
import { CardStubComponent } from './components/card/card.stub.component';
import { CarouselModule } from 'primeng/carousel';
import { RouterModule } from '@angular/router';
import { LanguageComponent } from './components/language/language.component';
import { SearchComponent } from './components/search/search.component';
import { GalleriaModule } from 'primeng/galleria';
import { CurrencyComponent } from './components/currency/currency.component';
// removed SwiperModule from shared to avoid bundling it in the root/vender chunk
import { ScrollToTopComponent } from './components/scroll-to-top/scroll-to-top.component';
import { AccordionModule } from 'primeng/accordion';

@NgModule({
  declarations: [
    BannerHeadComponent,
    CardBlogComponent,
    CardStubComponent,
    LanguageComponent,
    SearchComponent,
    CurrencyComponent,
    ScrollToTopComponent,
  ],
  imports: [
    CommonModule,
    CardModule,
    CarouselModule,
    RouterModule,
    GalleriaModule,
    AccordionModule,
  ],
  exports: [
    CommonModule,
    RouterModule,
    AccordionModule,
    // expose lightweight card stub as `app-card` for non-product routes
    CardStubComponent,
    BannerHeadComponent,
    CardBlogComponent,
    LanguageComponent,
    SearchComponent,
    CurrencyComponent,
    ScrollToTopComponent,
  ],
})
export class SharedModule {}
