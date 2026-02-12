import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="sidebar">
    <h2>SWIFTLY</h2>
    <a routerLink="/">Dashboard</a>
    <a routerLink="/requests">Requests</a>
  </div>
  `,
  styles: [`
    .sidebar {
      width:220px;
      background:#111827;
      color:white;
      padding:20px;
      display:flex;
      flex-direction:column;
      gap:15px;
    }
    a { color:#d1d5db; text-decoration:none; }
    a:hover { color:white }
  `]
})
export class SidebarComponent {}
