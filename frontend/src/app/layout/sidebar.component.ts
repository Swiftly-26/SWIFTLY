import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription, filter } from 'rxjs';
import { ApiService } from '../services/api.service';
import { LayoutService } from '../services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <!-- Mobile overlay backdrop -->
    <div class="mobile-backdrop"
         [class.visible]="isOpen"
         (click)="closeMenu()">
    </div>

    <aside class="sidebar" [class.open]="isOpen">

      <!-- Mobile close button -->
      <button class="mobile-close" (click)="closeMenu()" aria-label="Close menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div class="logo">
        <div class="logo-icon">S</div>
        <div class="logo-text-wrap">
          <span class="logo-text">SWIFTLY</span>
          <span class="logo-sub">Internal Work Request</span>
        </div>
      </div>

      <nav class="nav">
        <a routerLink="/dashboard"
           routerLinkActive="active"
           [routerLinkActiveOptions]="{ exact: true }"
           class="nav-item"
           (click)="closeMenu()">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </span>
          <span class="nav-label">Dashboard</span>
        </a>

        <a routerLink="/requests"
           routerLinkActive="active"
           class="nav-item"
           (click)="closeMenu()">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </span>
          <span class="nav-label">Requests</span>
        </a>

        <a *ngIf="isAdmin"
           routerLink="/agents"
           routerLinkActive="active"
           class="nav-item"
           (click)="closeMenu()">
          <span class="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <span class="nav-label">Manage Agents</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div class="copyright">Internal Operations Tool</div>
      </div>
    </aside>
  `,
  styles: [`
    /* ── DESKTOP SIDEBAR ─────────────────────────────── */
    .sidebar {
      width: 240px;
      min-width: 240px;
      background: #0f1422;
      display: flex;
      flex-direction: column;
      height: 100vh;
      border-right: 1px solid #2a2f3f;
      position: relative;
      z-index: 100;
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mobile-backdrop {
      display: none;
    }

    .mobile-close {
      display: none;
    }

    /* ── LOGO ─────────────────────────────────────────── */
    .logo {
      padding: 24px 20px;
      border-bottom: 1px solid #2a2f3f;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      min-width: 36px;
      background: #7c3aed;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      color: white;
    }
    .logo-text-wrap {
      display: flex;
      flex-direction: column;
    }
    .logo-text {
      font-size: 1.2rem;
      font-weight: 700;
      color: white;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .logo-sub {
      font-size: 0.68rem;
      color: #7e8aa8;
      margin-top: 2px;
    }

    /* ── NAV ─────────────────────────────────────────── */
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
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      color: #9aa4bf;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.15s ease;
      white-space: nowrap;
    }
    .nav-item:hover  { background: #1e2538; color: white; }
    .nav-item.active { background: #7c3aed; color: white; }
    .nav-icon { display: flex; align-items: center; color: #5f6b8a; flex-shrink: 0; }
    .nav-item.active .nav-icon { color: white; }

    /* ── FOOTER ──────────────────────────────────────── */
    .sidebar-footer {
      padding: 20px;
      border-top: 1px solid #2a2f3f;
    }
    .copyright {
      font-size: 0.65rem;
      color: #5f6b8a;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ── TABLET (≤ 1024px) — narrower sidebar ─────────── */
    @media (max-width: 1024px) {
      .sidebar {
        width: 200px;
        min-width: 200px;
      }
    }

    /* ── MOBILE (≤ 768px) — off-canvas drawer ─────────── */
    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        width: 280px;
        min-width: 280px;
        height: 100dvh;
        z-index: 500;
        transform: translateX(-100%);
        box-shadow: 4px 0 24px rgba(0, 0, 0, 0.6);
      }

      .sidebar.open {
        transform: translateX(0);
      }

      /* Semi-transparent backdrop behind open drawer */
      .mobile-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0);
        z-index: 499;
        pointer-events: none;
        transition: background 0.28s ease;
      }
      .mobile-backdrop.visible {
        background: rgba(0, 0, 0, 0.65);
        pointer-events: auto;
      }

      /* X button inside drawer */
      .mobile-close {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        background: #1e2538;
        border: 1px solid #2a2f3f;
        border-radius: 8px;
        color: #9aa4bf;
        cursor: pointer;
        transition: all 0.15s;
        z-index: 1;
      }
      .mobile-close:hover { background: #2a2f3f; color: white; }

      .logo {
        padding-right: 56px; /* space for close button */
      }

      .nav-item {
        padding: 14px 16px;
        font-size: 1rem;
      }
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  isAdmin = false;
  isOpen = false;

  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private layout: LayoutService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.api.user$.subscribe(user => {
        this.isAdmin = user.role === 'Admin';
      }),
      this.layout.sidebarOpen.subscribe(open => {
        this.isOpen = open;
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  closeMenu(): void {
    this.layout.close();
  }
}