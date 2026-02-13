// frontend/src/app/layout/sidebar.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <aside class="sidebar">
      <!-- Logo -->
      <div class="logo">
        <div class="logo-icon">O</div>
        <span class="logo-text">OpsFlow</span>
      </div>

      <!-- Navigation -->
      <nav class="nav">
        <a routerLink="/"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: true }"
           class="nav-item">
          <span class="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </span>
          Dashboard
        </a>

        <a routerLink="/requests"
           routerLinkActive="active"
           class="nav-item">
          <span class="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </span>
          Requests
        </a>

        <!-- Agents link - COMPLETELY HIDDEN from non-Admin users -->
        <a *ngIf="isAdmin"
           routerLink="/agents"
           routerLinkActive="active"
           class="nav-item">
          <span class="nav-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          Agents
        </a>
      </nav>

      <!-- Footer label -->
      <div class="sidebar-footer">Internal Operations Tool</div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 220px;
      min-width: 220px;
      background: #0a0f1c;
      color: #cbd5e1;
      display: flex;
      flex-direction: column;
      padding: 0;
      height: 100vh;
      border-right: 1px solid #2d2f3e;
    }

    /* Logo */
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 20px 24px;
      border-bottom: 1px solid #2d2f3e;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background: #7c3aed;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: white;
      font-family: 'Georgia', serif;
    }
    .logo-text {
      font-size: 1.1rem;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.02em;
    }

    /* Nav */
    .nav {
      display: flex;
      flex-direction: column;
      padding: 16px 12px;
      gap: 4px;
      flex: 1;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.15s ease;
    }
    .nav-item:hover {
      background: #1e293b;
      color: #f1f5f9;
    }
    .nav-item.active {
      background: #7c3aed;
      color: white;
    }
    .nav-item.active .nav-icon {
      color: white;
    }
    .nav-icon {
      display: flex;
      align-items: center;
      color: #64748b;
      transition: color 0.15s;
    }
    .nav-item:hover .nav-icon {
      color: #94a3b8;
    }

    /* Footer */
    .sidebar-footer {
      padding: 16px 20px;
      font-size: 0.7rem;
      color: #475569;
      border-top: 1px solid #2d2f3e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `]
})
export class SidebarComponent implements OnInit {
  isAdmin = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.isAdmin = this.api.getCurrentUser().role === 'Admin';
  }
}
