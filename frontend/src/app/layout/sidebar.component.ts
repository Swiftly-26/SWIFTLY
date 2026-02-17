import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-icon">S</div>
        <span class="logo-text">SWIFTLY</span>
        <span class="logo-sub">Internal Work Request</span>
      </div>

      <nav class="nav">
        <a routerLink="/dashboard"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: true }"
           class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </span>
          Dashboard
        </a>

        <a routerLink="/requests"
           routerLinkActive="active"
           class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          Requests
        </a>

        <a *ngIf="isAdmin"
           routerLink="/agents"
           routerLinkActive="active"
           class="nav-item">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          Manage Agents
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="copyright">Internal Operations Tool</div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      min-width: 240px;
      background: #0f1422;
      display: flex;
      flex-direction: column;
      height: 100vh;
      border-right: 1px solid #2a2f3f;
    }

    .logo {
      padding: 24px 20px;
      border-bottom: 1px solid #2a2f3f;
    }
    .logo-icon {
      width: 36px; height: 36px;
      background: #7c3aed;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 18px; color: white;
      margin-bottom: 12px;
    }
    .logo-text {
      font-size: 1.2rem; font-weight: 700;
      color: white; display: block; letter-spacing: -0.02em;
    }
    .logo-sub {
      font-size: 0.7rem; color: #7e8aa8;
      display: block; margin-top: 2px;
    }

    .nav {
      display: flex; flex-direction: column;
      padding: 16px 12px; gap: 4px; flex: 1;
    }
    .nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      color: #9aa4bf; text-decoration: none;
      font-size: 0.9rem; font-weight: 500;
      transition: all 0.15s ease;
    }
    .nav-item:hover { background: #1e2538; color: white; }
    .nav-item.active { background: #7c3aed; color: white; }
    .nav-item.active .nav-icon { color: white; }
    .nav-icon { display: flex; align-items: center; color: #5f6b8a; }

    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid #2a2f3f;
    }
    .copyright {
      font-size: 0.65rem; color: #5f6b8a;
      text-align: center; text-transform: uppercase; letter-spacing: 0.05em;
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  isAdmin = false;
  private sub!: Subscription;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // React instantly when user switches roles
    this.sub = this.api.user$.subscribe(user => {
      this.isAdmin = user.role === 'Admin';
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}