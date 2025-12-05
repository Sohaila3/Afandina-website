import { Injectable } from '@angular/core';
import {

  HttpRequest,

  HttpHandler,

  HttpEvent,

  HttpInterceptor

} from '@angular/common/http';

import { finalize, Observable } from 'rxjs';

import { LoaderService } from '../../services/loader/loader.service';



@Injectable()

export class LoaderInterceptor implements HttpInterceptor {

  private readonly silentEndpoints = [
    '/api/contact-us/send-message',
    '/api/search',
    // backend filter endpoints - avoid showing global overlay for product list/filter calls
    'advanced-search',
    'advanced-search-setting',
  ];



  constructor(private loaderService: LoaderService) {}



  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    const shouldBypass = this.silentEndpoints.some((endpoint) => req.url.includes(endpoint));

    // allow callers to explicitly opt-out of the global loader by sending this header
    const hasSkipHeader = req.headers ? req.headers.has('x-skip-loader') : false;

    const shouldShowLoader = req.method !== 'GET' && !shouldBypass && !hasSkipHeader;



    if (shouldShowLoader) {

      this.loaderService.show();

    }



    return next.handle(req).pipe(

      finalize(() => {

        if (shouldShowLoader) {

          this.loaderService.hide();

        }

      })

    );

  }

}



