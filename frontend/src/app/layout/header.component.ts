import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { LayoutService } from '../services/layout.service';
import { User } from '../models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">

      <!-- Left: hamburger (mobile) + page title -->
      <div class="header-left">
        <button class="hamburger" (click)="toggleSidebar()" aria-label="Open menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div class="page-title">Internal Work Request Manager</div>
      </div>

      <!-- Right: user profile pill + dropdown -->
      <div class="header-right">
        <div class="user-profile" (click)="toggleDropdown($event)">
          <div class="user-avatar">{{ getInitials(currentUser.name) }}</div>
          <div class="user-details">
            <span class="user-name">{{ currentUser.name }}</span>
            <span class="user-role">{{ currentUser.role }}</span>
          </div>
          <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        <!-- Profile switcher dropdown -->
        <div *ngIf="open" class="dropdown">
          <div class="dropdown-label">Switch Profile</div>

          <button class="dropdown-item" [class.active]="currentUser.role === 'Admin'"
                  (click)="switchToAdmin()">
            <div class="item-av">SA</div>
            <div class="item-info">
              <span class="item-name">System Admin</span>
              <span class="item-sub">Administrator — Full Access</span>
            </div>
            <span *ngIf="currentUser.role === 'Admin'" class="check">&#10003;</span>
          </button>

          <div class="dropdown-label" style="margin-top:4px;">Agent Profiles</div>
          <button *ngFor="let agent of agents"
                  class="dropdown-item"
                  [class.active]="currentUser.role === 'Agent' && currentUser.id === agent.id"
                  (click)="switchToAgent(agent)">
            <div class="item-av">{{ getInitials(agent.name) }}</div>
            <div class="item-info">
              <span class="item-name">{{ agent.name }}</span>
              <span class="item-sub">{{ agent.id }}</span>
            </div>
            <span *ngIf="currentUser.role === 'Agent' && currentUser.id === agent.id"
                  class="check">&#10003;</span>
          </button>
        </div>
      </div>
    </header>

    <div *ngIf="open" class="backdrop" (click)="open = false"></div>
  `,
  styles: [`
    .header {
      height: 64px;
      min-height: 64px;
      background: #0f1422;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      border-bottom: 1px solid #2a2f3f;
      position: relative;
      z-index: 200;
      gap: 12px;
    }

    /* ── LEFT ─────────────────────────────────────────── */
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    /* Hamburger — hidden on desktop, shown on mobile */
    .hamburger {
      display: none;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      min-width: 38px;
      background: #1a1f30;
      border: 1px solid #2a2f3f;
      border-radius: 8px;
      color: #9aa4bf;
      cursor: pointer;
      transition: all 0.15s;
    }
    .hamburger:hover { background: #252b40; color: white; border-color: #7c3aed; }

    .page-title {
      font-size: 0.85rem;
      color: #7e8aa8;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── RIGHT ────────────────────────────────────────── */
    .header-right {
      position: relative;
      flex-shrink: 0;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 14px;
      background: #1a1f30;
      border-radius: 40px;
      cursor: pointer;
      border: 1px solid #2a2f3f;
      transition: all 0.15s;
      user-select: none;
    }
    .user-profile:hover { background: #252b40; border-color: #7c3aed; }

    .user-avatar {
      width: 32px;
      height: 32px;
      min-width: 32px;
      background: #7c3aed;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.75rem;
      color: white;
    }
    .user-details { display: flex; flex-direction: column; }
    .user-name  { font-size: 0.85rem; font-weight: 600; color: white; line-height: 1.2; }
    .user-role  { font-size: 0.65rem; color: #7e8aa8; }
    .chevron    { color: #7e8aa8; flex-shrink: 0; }

    /* ── DROPDOWN ─────────────────────────────────────── */
    .dropdown {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 300px;
      background: #1a1f30;
      border: 1px solid #2a2f3f;
      border-radius: 14px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.55);
      z-index: 300;
      overflow: hidden;
      animation: popIn 0.15s ease;
    }
    @keyframes popIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .dropdown-label {
      padding: 10px 16px 6px;
      font-size: 0.65rem;
      font-weight: 700;
      color: #5f6b8a;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s;
      border-bottom: 1px solid #1e2538;
    }
    .dropdown-item:last-child { border-bottom: none; }
    .dropdown-item:hover  { background: #232940; }
    .dropdown-item.active { background: #252d45; }

    .item-av {
      width: 34px;
      height: 34px;
      min-width: 34px;
      background: #7c3aed;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.72rem;
      color: white;
    }
    .item-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .item-name { font-size: 0.85rem; font-weight: 600; color: white; }
    .item-sub  { font-size: 0.68rem; color: #7e8aa8; }
    .check     { color: #7c3aed; font-size: 1rem; font-weight: 700; flex-shrink: 0; }

    .backdrop {
      position: fixed;
      inset: 0;
      z-index: 199;
    }

    /* ── TABLET (≤ 1024px) ────────────────────────────── */
    @media (max-width: 1024px) {
      .header { padding: 0 20px; }
    }

    /* ── MOBILE (≤ 768px) ─────────────────────────────── */
    @media (max-width: 768px) {
      .header { padding: 0 16px; height: 60px; min-height: 60px; }

      /* Show hamburger */
      .hamburger { display: flex; }

      /* Hide text label to save space — avatar is enough */
      .user-details { display: none; }
      .chevron      { display: none; }

      /* Make dropdown full-width on very small screens */
      .dropdown {
        position: fixed;
        top: 68px;
        right: 12px;
        left: 12px;
        width: auto;
      }
    }

    /* ── SMALL MOBILE (≤ 480px) ───────────────────────── */
    @media (max-width: 480px) {
      .page-title { font-size: 0.75rem; }

      .user-profile { padding: 7px 10px; }
    }
  `]
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser!: User;
  agents: User[] = [];
  open = false;

  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private layout: LayoutService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.api.user$.subscribe(user => { this.currentUser = user; }),
      this.api.getAgents().subscribe({ next: a => this.agents = a })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  toggleSidebar(): void {
    this.layout.toggle();
  }

  toggleDropdown(e: Event): void {
    e.stopPropagation();
    this.open = !this.open;
  }

  switchToAdmin(): void {
    if (this.currentUser.role === 'Admin') { this.open = false; return; }
    this.api.setUser({ id: 'admin-1', name: 'System Admin', role: 'Admin' });
    this.open = false;
    this.router.navigate(['/dashboard']);
  }

  switchToAgent(agent: User): void {
    if (this.currentUser.role === 'Agent' && this.currentUser.id === agent.id) {
      this.open = false; return;
    }
    this.api.setUser({ id: agent.id, name: agent.name, role: 'Agent' });
    this.open = false;
    this.router.navigate(['/dashboard']);
  }
}