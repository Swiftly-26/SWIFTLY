// frontend/src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Request, Status, User } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">

      <!-- Success Message for real-time feedback -->
      <div *ngIf="successMessage" class="alert alert-success">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>{{ successMessage }}</span>
        <button class="close-btn" (click)="successMessage = ''">✕</button>
      </div>

      <!-- ════════════════════════════════════════
           ADMIN DASHBOARD
      ════════════════════════════════════════ -->
      <ng-container *ngIf="currentUser.role === 'Admin'">

        <div class="page-header">
          <div>
            <h1 class="page-title">Dashboard</h1>
            <p class="page-sub">Overview of all work requests</p>
          </div>
          <a routerLink="/requests" class="btn btn-primary">View All Requests</a>
        </div>

        <!-- Overdue Banner -->
        <div *ngIf="overdue().length > 0" class="alert alert-danger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            <strong>{{ overdue().length }} overdue request{{ overdue().length > 1 ? 's' : '' }}</strong>
            <span *ngIf="escalated().length > 0"> — {{ escalated().length }} auto-escalated to Critical</span>
          </span>
        </div>

        <!-- Stat Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">OPEN REQUESTS</div>
            <div class="stat-value">{{ count('Open') }}</div>
            <div class="stat-icon stat-icon--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">IN PROGRESS</div>
            <div class="stat-value">{{ count('In Progress') }}</div>
            <div class="stat-icon stat-icon--indigo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">BLOCKED</div>
            <div class="stat-value">{{ count('Blocked') }}</div>
            <div class="stat-icon stat-icon--amber">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">DONE</div>
            <div class="stat-value">{{ count('Done') }}</div>
            <div class="stat-icon stat-icon--green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">OVERDUE</div>
            <div class="stat-value text-danger">{{ overdue().length }}</div>
            <div class="stat-icon stat-icon--red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">CRITICAL</div>
            <div class="stat-value text-danger">{{ criticalCount() }}</div>
            <div class="stat-icon stat-icon--red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Status Distribution -->
        <div class="panel">
          <h2 class="panel-title">Status Distribution</h2>
          <div class="dist-bar">
            <div class="dist-segment dist-open"     [style.flex]="count('Open')"        [title]="'Open: '        + count('Open')"></div>
            <div class="dist-segment dist-progress" [style.flex]="count('In Progress')" [title]="'In Progress: ' + count('In Progress')"></div>
            <div class="dist-segment dist-blocked"  [style.flex]="count('Blocked')"     [title]="'Blocked: '     + count('Blocked')"></div>
            <div class="dist-segment dist-done"     [style.flex]="count('Done')"        [title]="'Done: '        + count('Done')"></div>
            <div *ngIf="requests.length === 0" class="dist-segment dist-empty" style="flex:1"></div>
          </div>
          <div class="dist-legend">
            <span class="legend-item"><span class="legend-dot dot-open"></span>Open <strong>({{ count('Open') }})</strong></span>
            <span class="legend-item"><span class="legend-dot dot-progress"></span>In Progress <strong>({{ count('In Progress') }})</strong></span>
            <span class="legend-item"><span class="legend-dot dot-blocked"></span>Blocked <strong>({{ count('Blocked') }})</strong></span>
            <span class="legend-item"><span class="legend-dot dot-done"></span>Done <strong>({{ count('Done') }})</strong></span>
          </div>
        </div>

        <!-- All Requests Table (Shows immediately) -->
        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title" style="margin:0">All Requests</h2>
            <span class="count-badge">{{ requests.length }} total</span>
          </div>

          <div *ngIf="requests.length === 0" class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No requests yet.</p>
            <a routerLink="/requests" class="btn btn-primary btn-sm">Create your first request</a>
          </div>

          <table *ngIf="requests.length > 0" class="table">
            <thead>
              <tr>
                <th>PRIORITY</th>
                <th>TITLE</th>
                <th>DESCRIPTION</th>
                <th>STATUS</th>
                <th>CREATED</th>
                <th>DUE DATE</th>
                <th>ASSIGNED AGENT</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of recentRequests()"
                  [class.overdue-row]="isOverdue(r)"
                  (click)="navigateToDetail(r.id)"
                  style="cursor: pointer;"
                  class="request-row">
                <td><span class="badge" [ngClass]="'priority-' + r.priority.toLowerCase()">{{ r.priority }}</span></td>
                <td>
                  <div class="req-title">{{ r.title }}</div>
                  <div *ngIf="r.tags?.length" class="req-tags">{{ r.tags!.join(', ') }}</div>
                </td>
                <td class="desc-cell">{{ r.description }}</td>
                <td>
                  <span class="badge" [ngClass]="'status-' + r.status.toLowerCase().split(' ').join('-')">{{ r.status }}</span>
                  <span *ngIf="isOverdue(r)" class="overdue-tag">OVERDUE</span>
                </td>
                <td class="date-cell">{{ r.createdAt | date:'MMM d, y' }}</td>
                <td class="date-cell" [class.text-danger]="isOverdue(r)">{{ r.dueDate | date:'MMM d, y' }}</td>
                <td>
                  <div *ngIf="r.assignedAgentId" class="agent-chip">
                    <div class="avatar-sm">{{ agentInitials(r.assignedAgentId) }}</div>
                    <span>{{ agentName(r.assignedAgentId) }}</span>
                  </div>
                  <span *ngIf="!r.assignedAgentId" class="unassigned">Unassigned</span>
                </td>
                <td><a [routerLink]="['/requests', r.id]" class="action-btn">View</a></td>
              </tr>
            </tbody>
          </table>
        </div>

      </ng-container>

      <!-- ════════════════════════════════════════
           AGENT DASHBOARD
      ════════════════════════════════════════ -->
      <ng-container *ngIf="currentUser.role === 'Agent'">

        <div class="page-header">
          <div>
            <h1 class="page-title">My Assignments</h1>
            <p class="page-sub">Requests assigned to you, {{ currentUser.name }}</p>
          </div>
        </div>

        <!-- Agent overdue alert -->
        <div *ngIf="myOverdue().length > 0" class="alert alert-danger">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>You have <strong>{{ myOverdue().length }}</strong> overdue request{{ myOverdue().length > 1 ? 's' : '' }} that need attention.</span>
        </div>

        <!-- Agent stat cards -->
        <div class="stats-grid" style="grid-template-columns: repeat(3, 1fr)">
          <div class="stat-card">
            <div class="stat-label">MY OPEN</div>
            <div class="stat-value">{{ myCount('Open') }}</div>
            <div class="stat-icon stat-icon--blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">IN PROGRESS</div>
            <div class="stat-value">{{ myCount('In Progress') }}</div>
            <div class="stat-icon stat-icon--indigo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-label">OVERDUE</div>
            <div class="stat-value text-danger">{{ myOverdue().length }}</div>
            <div class="stat-icon stat-icon--red">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Agent request cards -->
        <div class="panel">
          <h2 class="panel-title">My Requests</h2>

          <div *ngIf="myRequests().length === 0" class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            </svg>
            <p>No requests assigned to you yet.</p>
          </div>

          <div *ngIf="myRequests().length > 0" class="request-cards">
            <div *ngFor="let r of myRequests()"
                 [routerLink]="['/requests', r.id]"
                 class="request-card"
                 [class.request-card--overdue]="isOverdue(r)">
              <div class="rc-header">
                <span class="badge" [ngClass]="'priority-' + r.priority.toLowerCase()">{{ r.priority }}</span>
                <span class="badge" [ngClass]="'status-' + r.status.toLowerCase().split(' ').join('-')">{{ r.status }}</span>
                <span *ngIf="isOverdue(r)" class="overdue-tag">OVERDUE</span>
              </div>
              <h3 class="rc-title">{{ r.title }}</h3>
              <p class="rc-desc">{{ r.description }}</p>
              <div class="rc-meta">
                <span class="rc-date">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Due {{ r.dueDate | date:'MMM d, y' }}
                </span>
                <span class="rc-created">Created {{ r.createdAt | date:'MMM d, y' }}</span>
              </div>
              <div class="rc-footer">View details →</div>
            </div>
          </div>
        </div>

      </ng-container>

    </div>
  `,
  styles: [`
    .dashboard { max-width: 1300px; }

    /* Success Message */
    .alert-success { 
      background: #f0fdf4; 
      border-left: 4px solid #22c55e; 
      color: #14532d; 
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      position: relative;
    }
    .alert-success svg { 
      color: #22c55e; 
      flex-shrink: 0; 
    }
    .close-btn {
      position: absolute;
      right: 12px;
      top: 12px;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }
    .close-btn:hover {
      color: #0f172a;
    }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title  { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.02em; }
    .page-sub    { font-size: 0.8rem; color: #64748b; }

    /* Alert */
    .alert {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 20px;
    }
    .alert-danger { background: #fef2f2; border-left: 4px solid #ef4444; color: #7f1d1d; }
    .alert-danger svg { color: #ef4444; flex-shrink: 0; }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: white; border-radius: 12px; padding: 18px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06); position: relative; overflow: hidden;
    }
    .stat-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
    .stat-value { font-size: 1.9rem; font-weight: 700; color: #0f172a; line-height: 1; }
    .text-danger { color: #ef4444 !important; }
    .stat-icon {
      position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center;
    }
    .stat-icon--blue   { background: #eff6ff; color: #3b82f6; }
    .stat-icon--indigo { background: #eef2ff; color: #6366f1; }
    .stat-icon--amber  { background: #fffbeb; color: #f59e0b; }
    .stat-icon--green  { background: #f0fdf4; color: #22c55e; }
    .stat-icon--red    { background: #fef2f2; color: #ef4444; }

    /* Panel */
    .panel { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 24px; overflow: hidden; }
    .panel-header { display: flex; align-items: center; gap: 10px; padding: 20px 24px 16px; }
    .panel-title  { font-size: 1rem; font-weight: 600; color: #1e293b; padding: 20px 24px 16px; margin: 0; }
    .count-badge  { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }

    /* Distribution */
    .dist-bar { display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: #f1f5f9; margin: 0 24px 14px; gap: 2px; }
    .dist-segment { transition: flex 0.4s; min-width: 0; }
    .dist-open { background: #818cf8; } .dist-progress { background: #6366f1; }
    .dist-blocked { background: #f59e0b; } .dist-done { background: #22c55e; } .dist-empty { background: #e2e8f0; }
    .dist-legend { display: flex; gap: 24px; flex-wrap: wrap; padding: 0 24px 20px; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #64748b; }
    .legend-item strong { color: #1e293b; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-open { background: #818cf8; } .dot-progress { background: #6366f1; }
    .dot-blocked { background: #f59e0b; } .dot-done { background: #22c55e; }

    /* Table */
    .table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .table th {
      text-align: left; padding: 10px 14px;
      font-size: 0.65rem; font-weight: 700; color: #94a3b8;
      letter-spacing: 0.07em; text-transform: uppercase; border-bottom: 1px solid #f1f5f9;
    }
    .table td { padding: 12px 14px; border-bottom: 1px solid #f8fafc; color: #334155; vertical-align: middle; }
    .table tbody tr:last-child td { border-bottom: none; }
    .request-row:hover td { background: #fafbff; }
    .overdue-row td { background: #fff9f9; }
    .overdue-row:hover td { background: #fef2f2 !important; }

    .req-title { font-weight: 600; color: #1e293b; max-width: 180px; }
    .req-tags  { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }
    .desc-cell { color: #64748b; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .date-cell { color: #64748b; white-space: nowrap; }
    .agent-chip { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #374151; }
    .avatar-sm  { width: 24px; height: 24px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; flex-shrink: 0; }
    .unassigned { color: #94a3b8; font-style: italic; font-size: 0.8rem; }

    /* Badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.68rem; font-weight: 700; white-space: nowrap; }
    .priority-critical { background: #fef2f2; color: #dc2626; }
    .priority-high     { background: #fff7ed; color: #ea580c; }
    .priority-medium   { background: #fefce8; color: #ca8a04; }
    .priority-low      { background: #f0fdf4; color: #16a34a; }
    .status-open        { background: #eef2ff; color: #4f46e5; }
    .status-in-progress { background: #f5f3ff; color: #7c3aed; }
    .status-blocked     { background: #fef2f2; color: #dc2626; }
    .status-done        { background: #f0fdf4; color: #16a34a; }
    .overdue-tag { display: inline-block; margin-left: 4px; padding: 1px 6px; background: #fef2f2; color: #dc2626; border-radius: 999px; font-size: 0.65rem; font-weight: 700; }

    .action-btn { display: inline-block; padding: 5px 12px; background: #f1f5f9; color: #4f46e5; border-radius: 6px; font-size: 0.78rem; font-weight: 600; text-decoration: none; }
    .action-btn:hover { background: #e0e7ff; }
    .link { color: #4f46e5; font-weight: 600; }
    .empty-state { display: flex; flex-direction: column; align-items: center; padding: 48px; color: #94a3b8; gap: 10px; font-size: 0.875rem; }

    /* Agent cards */
    .request-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 16px; padding: 0 24px 24px; }
    .request-card {
      border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;
      cursor: pointer; transition: all 0.15s;
    }
    .request-card:hover { border-color: #6366f1; box-shadow: 0 4px 14px rgba(99,102,241,0.12); transform: translateY(-1px); }
    .request-card--overdue { border-color: #fca5a5; background: #fff9f9; }
    .request-card--overdue:hover { border-color: #ef4444; box-shadow: 0 4px 14px rgba(239,68,68,0.12); }
    .rc-header  { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
    .rc-title   { font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 6px; line-height: 1.4; }
    .rc-desc    { font-size: 0.8rem; color: #64748b; line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .rc-meta    { display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8; margin-bottom: 10px; }
    .rc-date    { display: flex; align-items: center; gap: 4px; }
    .rc-footer  { font-size: 0.75rem; font-weight: 600; color: #4f46e5; text-align: right; }

    /* Button */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 7px; border: none; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; text-decoration: none; font-family: inherit; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #4338ca; }
    .btn-sm { padding: 6px 14px; font-size: 0.78rem; }

    @media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 700px)  { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  `]
})
export class DashboardComponent implements OnInit {
  requests: Request[] = [];
  agents: User[] = [];
  currentUser!: User;
  successMessage = '';

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();
    this.loadData();
    
    // Listen for request updates from other components
    this.api.getRequests().subscribe({
      next: r => {
        this.requests = r;
        console.log('Dashboard - Requests loaded:', r.length);
      },
      error: (err) => console.error('Dashboard - Error loading requests:', err)
    });
  }

  loadData(): void {
    // Load requests immediately without loading state
    this.api.getRequests().subscribe({ 
      next: r => {
        this.requests = r;
        console.log('Dashboard - Requests loaded immediately:', r.length);
      },
      error: (err) => {
        console.error('Dashboard - Error loading requests:', err);
        this.requests = [];
      }
    });
    
    // Load agents immediately
    this.api.getAgents().subscribe({ 
      next: a => {
        this.agents = a;
        console.log('Dashboard - Agents loaded immediately:', a.length);
      },
      error: (err) => {
        console.error('Dashboard - Error loading agents:', err);
        this.agents = [];
      }
    });
  }

  // ── Admin helpers ──────────────────────────────────────────────────────────
  count(status: Status): number {
    return this.requests.filter(r => r.status === status).length;
  }
  
  criticalCount(): number {
    return this.requests.filter(r => r.priority === 'Critical' && r.status !== 'Done').length;
  }
  
  overdue(): Request[] {
    return this.requests.filter(r => r.status !== 'Done' && new Date(r.dueDate) < new Date());
  }
  
  escalated(): Request[] {
    return this.overdue().filter(r => {
      const days = (Date.now() - new Date(r.dueDate).getTime()) / 86400000;
      return days > 3 && r.priority === 'Critical';
    });
  }
  
  isOverdue(r: Request): boolean {
    return r.status !== 'Done' && new Date(r.dueDate) < new Date();
  }
  
  recentRequests(): Request[] {
    if (!this.requests || this.requests.length === 0) {
      return [];
    }
    return [...this.requests]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10); // Show only 10 most recent requests
  }
  
  agentName(id: string): string {
    if (!this.agents || this.agents.length === 0) {
      return id;
    }
    return this.agents.find(a => a.id === id)?.name ?? id;
  }
  
  agentInitials(id: string): string {
    const name = this.agentName(id);
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  navigateToDetail(id: string): void {
    this.router.navigate(['/requests', id]);
  }

  // ── Agent helpers ──────────────────────────────────────────────────────────
  myRequests(): Request[] {
    return this.requests.filter(r => r.assignedAgentId === this.currentUser.id);
  }
  
  myCount(status: Status): number {
    return this.myRequests().filter(r => r.status === status).length;
  }
  
  myOverdue(): Request[] {
    return this.myRequests().filter(r => this.isOverdue(r));
  }
}