import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-card',
  template: `
    <div class="card-stub">
      <a [routerLink]="['/', 'en', 'product', carData?.slug]">
        <img [src]="carData?.thumbnail_image || '../../../../assets/images/placeholder-car.jpg'" alt="{{carData?.name}}" loading="lazy" decoding="async" style="width:100%;height:auto;object-fit:cover;aspect-ratio:16/9" />
      </a>
      <div class="card-stub-body">
        <h4>{{ carData?.name }}</h4>
        <p>{{ carData?.currency?.name }} - {{ carData?.daily_discount_price }}</p>
      </div>
    </div>
  `,
  styles: [
    `
      .card-stub{border:1px solid #eee;padding:8px;border-radius:6px}
      .card-stub img{display:block;border-radius:4px}
      .card-stub-body{padding-top:8px}
    `,
  ],
})
export class CardStubComponent {
  @Input() carData: any;
}
