import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutUsComponent } from './about-us/about-us.component';

const routes: Routes = [
  {
    path: '',
    component: AboutUsComponent,
    data: {
      seo: {
        title: 'Afandina | About',
        description: 'About Afandina car rental services in UAE.',
        keywords: 'about afandina, car rental, dubai',
        image: 'https://afandinacarrental.com/assets/images/logo/car3-optimized.webp'
      }
    }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AboutRoutingModule { }
