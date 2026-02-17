import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { Request, User, isOverdue } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">

      <div class="greeting">
        <h1 class="greeting-title">Hello, {{ currentUser?.name }}</h1>
        <p class="greeting-sub" *ngIf="currentUser?.role === 'Agent'">
          Your dashboard — tasks assigned to you are highlighted below.
        </p>
        <p class="greeting-sub" *ngIf="currentUser?.role === 'Admin'">
          Organisation-wide operational overview.
        </p>
      </div>

      <div *ngIf="errorMessage" class="alert-danger">
        <span>{{ errorMessage }}</span>
        <button (click)="errorMessage = ''">✕</button>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <ng-container *ngIf="!loading">

        <!-- Stats grid: 4 cols desktop → 2 cols tablet → 2 cols mobile -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">OPEN</div>
            <div class="stat-value">{{ statCount('Open') }}</div>
            <div class="stat-ctx">{{ currentUser?.role === 'Admin' ? 'Org-wide' : 'Assigned to me' }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">IN PROGRESS</div>
            <div class="stat-value">{{ statCount('In Progress') }}</div>
            <div class="stat-ctx">{{ currentUser?.role === 'Admin' ? 'Org-wide' : 'My workload' }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">BLOCKED</div>
            <div class="stat-value">{{ statCount('Blocked') }}</div>
            <div class="stat-ctx">{{ currentUser?.role === 'Admin' ? 'Org-wide' : 'Needs attention' }}</div>
          </div>
          <div class="stat-card overdue-card">
            <div class="stat-label">OVERDUE</div>
            <div class="stat-value text-danger">{{ overdueCount() }}</div>
            <div class="stat-ctx">{{ currentUser?.role === 'Admin' ? 'Across all staff' : 'My overdue' }}</div>
          </div>
        </div>

        <!-- Status Distribution -->
        <div class="panel">
          <h2 class="panel-title">Status Distribution</h2>
          <div class="dist-grid">
            <div class="dist-item" *ngFor="let s of ['Open','In Progress','Blocked','Done']">
              <span class="dist-label">{{ s }}</span>
              <span class="dist-value">{{ statCount(s) }}</span>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="panel">
          <h2 class="panel-title">
            {{ currentUser?.role === 'Admin' ? 'Recent Activity' : 'My Recent Activity' }}
          </h2>

          <div *ngIf="recentItems().length === 0" class="empty-state">
            <p>{{ currentUser?.role === 'Agent' ? 'No requests assigned to you yet.' : 'No requests yet.' }}</p>
          </div>

          <div *ngFor="let r of recentItems()"
               class="activity-item"
               (click)="viewRequest(r.id)">
            <div class="activity-top">
              <span class="badge" [ngClass]="'p-' + r.priority.toLowerCase()">{{ r.priority }}</span>
              <span class="activity-title">{{ r.title }}</span>
              <span *ngIf="r.assignedAgentId === currentUser?.id" class="mine-badge">Mine</span>
            </div>
            <p class="activity-desc">{{ r.description | slice:0:120 }}...</p>
            <div class="activity-meta">
              <span class="activity-date">Due {{ r.dueDate | date:'dd MMM yyyy' }}</span>
              <span *ngIf="isOv(r)" class="overdue-pill">OVERDUE</span>
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .dashboard {
      max-width: 1400px;
      margin: 0 auto;
      padding: 28px 24px;
    }

    /* ── GREETING ─────────────────────────────────────── */
    .greeting { margin-bottom: 28px; }
    .greeting-title { font-size: 1.9rem; font-weight: 600; color: white; margin-bottom: 6px; }
    .greeting-sub   { font-size: 0.88rem; color: #7e8aa8; }

    /* ── ALERTS ───────────────────────────────────────── */
    .alert-danger {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; border-radius: 10px; margin-bottom: 20px;
      background: #2d1a1c; border-left: 4px solid #ef4444; color: #ffcdd2;
    }
    .alert-danger button { background: none; border: none; color: #7e8aa8; cursor: pointer; font-size: 1rem; }

    /* ── LOADING ──────────────────────────────────────── */
    .loading-state {
      display: flex; flex-direction: column;
      align-items: center; padding: 60px; color: #7e8aa8; gap: 16px;
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #2a2f3f;
      border-top-color: #7c3aed; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── STATS GRID ───────────────────────────────────── */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #1a1f30;
      border-radius: 14px;
      padding: 20px;
      border: 1px solid #2a2f3f;
      transition: border-color 0.15s;
    }
    .stat-card:hover { border-color: #7c3aed; }
    .stat-label {
      font-size: 0.68rem; font-weight: 700; color: #7e8aa8;
      text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 8px;
    }
    .stat-value {
      font-size: 2.2rem; font-weight: 700; color: white;
      line-height: 1; margin-bottom: 6px;
    }
    .text-danger { color: #ff6b6b !important; }
    .stat-ctx { font-size: 0.7rem; color: #5f6b8a; }

    /* ── PANEL ────────────────────────────────────────── */
    .panel {
      background: #1a1f30;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid #2a2f3f;
    }
    .panel-title {
      font-size: 1rem; font-weight: 600; color: white;
      margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #2a2f3f;
    }

    /* ── DIST GRID ────────────────────────────────────── */
    .dist-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .dist-item {
      background: #0f1422; border-radius: 10px; padding: 14px;
      display: flex; flex-direction: column; gap: 6px; border: 1px solid #2a2f3f;
    }
    .dist-label { color: #7e8aa8; font-size: 0.82rem; }
    .dist-value { color: white; font-weight: 700; font-size: 1.4rem; }

    /* ── ACTIVITY ─────────────────────────────────────── */
    .activity-item {
      padding: 14px 16px; border-radius: 12px; background: #0f1422;
      margin-bottom: 10px; cursor: pointer; transition: all 0.15s;
      border: 1px solid transparent;
    }
    .activity-item:last-child { margin-bottom: 0; }
    .activity-item:hover {
      border-color: #7c3aed; background: #1a2040;
      transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.15);
    }
    .activity-top {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 8px; flex-wrap: wrap;
    }
    .activity-title {
      font-weight: 600; color: white; font-size: 0.93rem;
      flex: 1; min-width: 0; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .mine-badge {
      font-size: 0.62rem; background: #132b1e; color: #86efac;
      border: 1px solid #10b981; padding: 2px 7px; border-radius: 20px;
      font-weight: 600; flex-shrink: 0;
    }
    .activity-desc {
      font-size: 0.82rem; color: #9aa4bf; margin-bottom: 10px;
      line-height: 1.5; display: -webkit-box;
      -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .activity-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .activity-date  { font-size: 0.72rem; color: #7e8aa8; }
    .overdue-pill {
      font-size: 0.62rem; background: #7c3aed; color: white;
      padding: 2px 7px; border-radius: 20px; font-weight: 600;
    }

    /* Priority badges */
    .badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 0.62rem; font-weight: 700; white-space: nowrap; flex-shrink: 0;
    }
    .p-critical { background: #2d1a1c; color: #ff8a8a; border: 1px solid #7c3aed; }
    .p-high     { background: #2d1a1c; color: #ffb3b3; border: 1px solid #7c3aed; }
    .p-medium   { background: #1e2538; color: #a78bfa; border: 1px solid #7c3aed; }
    .p-low      { background: #132b1e; color: #86efac; border: 1px solid #7c3aed; }

    .empty-state { text-align: center; padding: 32px; color: #7e8aa8; }

    /* ── TABLET (≤ 1024px) ────────────────────────────── */
    @media (max-width: 1024px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .dist-grid  { grid-template-columns: repeat(2, 1fr); }
    }

    /* ── MOBILE (≤ 768px) ─────────────────────────────── */
    @media (max-width: 768px) {
      .dashboard { padding: 20px 16px; }
      .greeting-title { font-size: 1.5rem; }
      .stat-value { font-size: 1.8rem; }
    }

    /* ── SMALL MOBILE (≤ 480px) ───────────────────────── */
    @media (max-width: 480px) {
      .dashboard { padding: 16px 12px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .stat-card  { padding: 14px; }
      .greeting-title { font-size: 1.3rem; }
      .dist-grid  { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  allRequests: Request[] = [];
  currentUser!: User;
  errorMessage = '';
  loading = true;

  private userSub!: Subscription;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.userSub = this.api.user$.subscribe(u => { this.currentUser = u; });
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  loadRequests(): void {
    this.loading = true;
    this.api.getRequests().subscribe({
      next: r  => { this.allRequests = r; this.loading = false; },
      error: () => {
        this.errorMessage = 'Failed to load. Is the backend running on port 3000?';
        this.loading = false;
      }
    });
  }

  private scoped(): Request[] {
    if (!this.currentUser) return this.allRequests;
    if (this.currentUser.role === 'Admin') return this.allRequests;
    return this.allRequests.filter(r => r.assignedAgentId === this.currentUser.id);
  }

  statCount(status: string): number {
    return this.scoped().filter(r => r.status === status).length;
  }

  overdueCount(): number {
    return this.scoped().filter(r => isOverdue(r)).length;
  }

  recentItems(): Request[] {
    const sorted = [...this.allRequests]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    if (!this.currentUser || this.currentUser.role === 'Admin') return sorted.slice(0, 5);
    const mine   = sorted.filter(r => r.assignedAgentId === this.currentUser.id);
    const others = sorted.filter(r => r.assignedAgentId !== this.currentUser.id);
    return [...mine, ...others].slice(0, 5);
  }

  isOv(r: Request): boolean { return isOverdue(r); }

  viewRequest(id: string): void { this.router.navigate(['/requests', id]); }
}