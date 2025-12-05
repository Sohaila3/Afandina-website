import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';



@Injectable({

  providedIn: 'root'

})

export class LoaderService {



  private loadingSubject = new BehaviorSubject<boolean>(false);

  loading$ = this.loadingSubject.asObservable();



  show(durationMs: number = 1000): void {
    this.loadingSubject.next(true);

    if (durationMs > 0) {
      setTimeout(() => {
        this.hide();
      }, durationMs);
    }
  }



  hide(): void {

    this.loadingSubject.next(false);

  }

}

