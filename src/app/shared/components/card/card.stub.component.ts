import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    <div class="card-stub">
      <a [routerLink]="['/', 'en', 'product', carData?.slug]">
        <img [src]="carData?.thumbnail_image || '../../../../assets/images/placeholder-car.jpg'" alt="{{carData?.name}}" loading="lazy" decoding="async" style="width:100%;height:auto;object-fit:cover;aspect-ratio:16/9" />
      </a>
      <div class="card-stub-body">
        <h4 class="card-title">{{ carData?.name }}</h4>
        <p class="card-sub">{{ carData?.currency?.name }} - {{ carData?.daily_discount_price }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .card-stub{border:1px solid #eee;padding:8px;border-radius:6px;display:flex;flex-direction:column;height:100%}
      .card-stub img{display:block;border-radius:4px;height:220px;object-fit:cover}
      .card-stub-body{padding-top:12px;display:flex;flex-direction:column;flex:1}
      .card-title{font-size:20px;margin:0 0 6px;line-height:1.2;color:#171717;font-weight:400}
      .card-sub{margin:0;color:#525252;font-weight:500}
    `,
  ],
})
export class CardStubComponent {
  @Input() carData: any;
}
