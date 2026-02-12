import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar.component';
import { HeaderComponent } from './layout/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
  <div class="app-container">
    <app-sidebar></app-sidebar>

    <div class="main">
      <app-header></app-header>
      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .app-container { display:flex; height:100vh; font-family:Arial }
    .main { flex:1; display:flex; flex-direction:column }
    .content { padding:20px; overflow:auto; background:#f8fafc }
  `]
})
export class AppComponent {}
