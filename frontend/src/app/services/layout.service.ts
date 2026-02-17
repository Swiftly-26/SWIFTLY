import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private sidebarOpen$ = new BehaviorSubject<boolean>(false);
  sidebarOpen = this.sidebarOpen$.asObservable();

  toggle(): void {
    this.sidebarOpen$.next(!this.sidebarOpen$.getValue());
  }

  close(): void {
    this.sidebarOpen$.next(false);
  }

  open(): void {
    this.sidebarOpen$.next(true);
  }
}