import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { Request, User, isOverdue } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <!-- Header row -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Requests</h1>
          <p class="page-sub">{{ allRequests.length }} total</p>
        </div>
        <button *ngIf="isAdmin" class="btn-create" (click)="showCreate = true">
          + Create
        </button>
      </div>

      <!-- Alerts -->
      <div *ngIf="successMessage" class="alert success">{{ successMessage }}</div>
      <div *ngIf="errorMessage"   class="alert error">{{ errorMessage }}</div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div><p>Loading...</p>
      </div>

      <!-- Create Modal -->
      <div *ngIf="showCreate" class="modal-overlay" (click)="cancelCreate()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>New Request</h2>
            <button class="modal-close" (click)="cancelCreate()">✕</button>
          </div>
          <input   class="field" placeholder="Title *"          [(ngModel)]="form.title" />
          <textarea class="field" rows="3" placeholder="Description *" [(ngModel)]="form.description"></textarea>
          <div class="field-row">
            <select class="field" [(ngModel)]="form.priority">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
            <input class="field" type="date" [(ngModel)]="form.dueDate" />
          </div>
          <select class="field" [(ngModel)]="form.agentId">
            <option value="">Unassigned</option>
            <option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</option>
          </select>
          <input class="field" placeholder="Tags (comma-separated)" [(ngModel)]="form.tags" />
          <div class="modal-footer">
            <button class="btn-secondary" (click)="cancelCreate()">Cancel</button>
            <button class="btn-primary" (click)="createRequest()" [disabled]="creating">
              {{ creating ? 'Creating...' : 'Create Request' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar" *ngIf="!loading">
        <input class="search-input" placeholder="Search..."
               [(ngModel)]="filters.search" (ngModelChange)="applyFilters()" />

        <div class="filter-chips">
          <select class="chip-select" *ngIf="isAdmin"
                  [(ngModel)]="filters.agent" (ngModelChange)="applyFilters()">
            <option value="">All Staff</option>
            <option value="unassigned">Unassigned</option>
            <option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</option>
          </select>

          <button *ngIf="!isAdmin" class="chip" [class.active]="filters.mineOnly"
                  (click)="filters.mineOnly = !filters.mineOnly; applyFilters()">
            My Requests
          </button>

          <select class="chip-select" [(ngModel)]="filters.status" (ngModelChange)="applyFilters()">
            <option value="">All Statuses</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Blocked</option>
            <option>Done</option>
          </select>

          <button class="chip" [class.active]="filters.overdueOnly"
                  (click)="filters.overdueOnly = !filters.overdueOnly; applyFilters()">
            Overdue
          </button>

          <select class="chip-select" [(ngModel)]="sortBy" (ngModelChange)="applyFilters()">
            <option value="updated">Recent</option>
            <option value="dueDate">Due Date</option>
            <option value="priority">Priority</option>
          </select>

          <button *ngIf="hasActiveFilters()" class="chip clear" (click)="clearFilters()">
            Clear
          </button>
        </div>
      </div>

      <!-- DESKTOP TABLE -->
      <div class="table-wrap" *ngIf="!loading && filteredRequests.length > 0">
        <table class="table">
          <thead>
            <tr>
              <th>PRIORITY</th>
              <th>REQUEST</th>
              <th>STATUS</th>
              <th>DUE DATE</th>
              <th>AGENT</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of filteredRequests"
                class="row" (click)="go(r.id)"
                [class.mine-row]="r.assignedAgentId === currentUser?.id">
              <td>
                <span class="pbadge" [ngClass]="'p-' + r.priority.toLowerCase()">{{ r.priority }}</span>
              </td>
              <td>
                <div class="req-title">{{ r.title }}</div>
                <div class="req-tags" *ngIf="r.tags?.length">#{{ r.tags!.join(' #') }}</div>
              </td>
              <td>
                <span class="sbadge" [ngClass]="sc(r.status)">{{ r.status }}</span>
              </td>
              <td>
                <span [class.ov-text]="isOv(r)">{{ r.dueDate | date:'dd MMM yy' }}</span>
                <span *ngIf="isOv(r)" class="ov-dot">!</span>
              </td>
              <td>
                <span *ngIf="r.assignedAgentId" class="agent-name">
                  {{ agentName(r.assignedAgentId) }}
                  <span *ngIf="r.assignedAgentId === currentUser?.id" class="you">you</span>
                </span>
                <span *ngIf="!r.assignedAgentId" class="unassigned">Unassigned</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- MOBILE CARD LIST -->
      <div class="card-list" *ngIf="!loading && filteredRequests.length > 0">
        <div *ngFor="let r of filteredRequests"
             class="req-card" (click)="go(r.id)"
             [class.mine-card]="r.assignedAgentId === currentUser?.id">
          <div class="card-top">
            <span class="pbadge" [ngClass]="'p-' + r.priority.toLowerCase()">{{ r.priority }}</span>
            <span class="sbadge" [ngClass]="sc(r.status)">{{ r.status }}</span>
          </div>
          <div class="card-title">{{ r.title }}</div>
          <div class="card-tags" *ngIf="r.tags?.length">#{{ r.tags!.join(' #') }}</div>
          <div class="card-meta">
            <span [class.ov-text]="isOv(r)">Due {{ r.dueDate | date:'dd MMM yy' }}</span>
            <span *ngIf="isOv(r)" class="ov-dot">!</span>
            <span class="card-agent" *ngIf="r.assignedAgentId">
              {{ agentName(r.assignedAgentId) }}
              <span *ngIf="r.assignedAgentId === currentUser?.id" class="you">you</span>
            </span>
            <span *ngIf="!r.assignedAgentId" class="unassigned">Unassigned</span>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div *ngIf="!loading && filteredRequests.length === 0" class="empty">
        <p>{{ hasActiveFilters() ? 'No requests match your filters.' : 'No requests found.' }}</p>
        <button *ngIf="hasActiveFilters()" class="btn-secondary" (click)="clearFilters()">
          Clear Filters
        </button>
      </div>

    </div>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; padding: 28px 24px; }

    /* ── HEADER ROW ───────────────────────────────────── */
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 22px; gap: 12px; flex-wrap: wrap;
    }
    .page-title { font-size: 1.9rem; font-weight: 600; color: white; }
    .page-sub   { font-size: 0.8rem; color: #7e8aa8; margin-top: 4px; }
    .btn-create {
      background: #7c3aed; color: white; border: none; border-radius: 8px;
      padding: 10px 18px; font-size: 0.88rem; font-weight: 500; cursor: pointer;
      white-space: nowrap;
    }
    .btn-create:hover { background: #6d28d9; }

    /* ── ALERTS ───────────────────────────────────────── */
    .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 0.88rem; }
    .alert.success { background: #132b1e; color: #86efac; border-left: 3px solid #10b981; }
    .alert.error   { background: #2d1a1c; color: #ff8a8a; border-left: 3px solid #ef4444; }

    /* ── LOADING ──────────────────────────────────────── */
    .loading-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 60px; color: #7e8aa8; gap: 12px;
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #2a2f3f;
      border-top-color: #7c3aed; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── MODAL ────────────────────────────────────────── */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.72);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 16px;
    }
    .modal {
      background: #1a1f30; border-radius: 16px; padding: 24px;
      width: 100%; max-width: 500px; border: 1px solid #2a2f3f;
      max-height: 90dvh; overflow-y: auto;
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
    }
    .modal-header h2 { color: white; font-size: 1.15rem; }
    .modal-close {
      background: none; border: none; color: #7e8aa8;
      font-size: 1.1rem; cursor: pointer; padding: 4px 8px;
    }
    .modal-close:hover { color: white; }
    .field {
      width: 100%; padding: 10px 12px; margin-bottom: 12px;
      background: #0f1422; border: 1px solid #2a2f3f;
      border-radius: 8px; color: white; font-size: 0.88rem; font-family: inherit;
      box-sizing: border-box;
    }
    .field:focus { border-color: #7c3aed; outline: none; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .modal-footer {
      display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; flex-wrap: wrap;
    }

    /* ── FILTERS ──────────────────────────────────────── */
    .filters-bar {
      display: flex; flex-direction: column; gap: 10px;
      margin-bottom: 18px; padding: 14px 16px;
      background: #1a1f30; border-radius: 12px; border: 1px solid #2a2f3f;
    }
    .search-input {
      width: 100%; padding: 9px 12px; background: #0f1422;
      border: 1px solid #2a2f3f; border-radius: 6px; color: white; font-size: 0.88rem;
      box-sizing: border-box;
    }
    .search-input:focus { border-color: #7c3aed; outline: none; }
    .filter-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .chip-select {
      padding: 7px 10px; background: #0f1422; border: 1px solid #2a2f3f;
      border-radius: 6px; color: white; font-size: 0.82rem; cursor: pointer;
    }
    .chip {
      padding: 7px 12px; background: #0f1422; border: 1px solid #2a2f3f;
      border-radius: 6px; color: #7e8aa8; cursor: pointer; font-size: 0.82rem;
      transition: all 0.13s; white-space: nowrap;
    }
    .chip:hover  { background: #1e2538; color: white; }
    .chip.active { background: #7c3aed; color: white; border-color: #7c3aed; }
    .chip.clear:hover { background: #2d1a1c; color: #ff8a8a; border-color: #ef4444; }

    /* ── DESKTOP TABLE (hidden on mobile) ─────────────── */
    .table-wrap {
      background: #1a1f30; border-radius: 12px;
      border: 1px solid #2a2f3f; overflow-x: auto;
    }
    .table { width: 100%; border-collapse: collapse; min-width: 600px; }
    .table th {
      text-align: left; padding: 12px 16px; color: #7e8aa8;
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; border-bottom: 1px solid #2a2f3f;
    }
    .table td {
      padding: 13px 16px; border-bottom: 1px solid #1e2538;
      color: #e2e8f0; vertical-align: middle;
    }
    .table tr:last-child td { border-bottom: none; }
    .row { cursor: pointer; transition: background 0.12s; }
    .row:hover td { background: #1e2a44; }
    .mine-row td:first-child { border-left: 3px solid #7c3aed; }

    /* ── MOBILE CARDS (hidden on desktop) ─────────────── */
    .card-list { display: none; flex-direction: column; gap: 10px; }
    .req-card {
      background: #1a1f30; border-radius: 12px; padding: 16px;
      border: 1px solid #2a2f3f; cursor: pointer; transition: all 0.15s;
    }
    .req-card:hover { border-color: #7c3aed; background: #1e2538; }
    .mine-card { border-left: 3px solid #7c3aed; }
    .card-top  { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
    .card-title { font-weight: 600; color: white; font-size: 0.95rem; margin-bottom: 4px; }
    .card-tags  { font-size: 0.72rem; color: #7e8aa8; margin-bottom: 10px; }
    .card-meta  {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 0.78rem;
    }
    .card-agent { color: #9aa4bf; }

    /* ── SHARED BADGES ────────────────────────────────── */
    .pbadge {
      display: inline-block; padding: 3px 8px; border-radius: 4px;
      font-size: 0.65rem; font-weight: 700;
    }
    .p-critical { background: #2d1a1c; color: #ff8a8a; border: 1px solid #7c3aed; }
    .p-high     { background: #2d1a1c; color: #ffb3b3; border: 1px solid #7c3aed; }
    .p-medium   { background: #1e2538; color: #a78bfa; border: 1px solid #7c3aed; }
    .p-low      { background: #132b1e; color: #86efac; border: 1px solid #7c3aed; }

    .sbadge { padding: 3px 9px; border-radius: 20px; font-size: 0.68rem; font-weight: 600; }
    .s-open        { background: #1e2538; color: #a78bfa; }
    .s-in-progress { background: #1e2538; color: #c4b5fd; }
    .s-blocked     { background: #2d1a1c; color: #ffb3b3; }
    .s-done        { background: #132b1e; color: #86efac; }

    .req-title  { font-weight: 500; color: white; }
    .req-tags   { font-size: 0.68rem; color: #7e8aa8; margin-top: 3px; }
    .ov-text    { color: #ff8a8a; font-weight: 600; }
    .ov-dot {
      display: inline-flex; align-items: center; justify-content: center;
      width: 15px; height: 15px; background: #7c3aed; color: white;
      border-radius: 50%; font-size: 0.6rem; font-weight: 700; margin-left: 4px;
    }
    .agent-name { color: #e2e8f0; }
    .you {
      font-size: 0.6rem; background: #132b1e; color: #86efac;
      border: 1px solid #10b981; padding: 1px 5px; border-radius: 10px; margin-left: 4px;
    }
    .unassigned { color: #5f6b8a; font-style: italic; font-size: 0.83rem; }

    .empty { text-align: center; padding: 60px; color: #7e8aa8; }
    .empty p { margin-bottom: 16px; }

    .btn-primary, .btn-secondary {
      padding: 10px 18px; border: none; border-radius: 7px;
      cursor: pointer; font-size: 0.88rem; font-weight: 500;
    }
    .btn-primary { background: #7c3aed; color: white; }
    .btn-primary:hover:not(:disabled) { background: #6d28d9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #0f1422; color: #e2e8f0; border: 1px solid #2a2f3f; }
    .btn-secondary:hover { background: #1e2538; }

    /* ── TABLET ───────────────────────────────────────── */
    @media (max-width: 1024px) {
      .page { padding: 22px 20px; }
    }

    /* ── MOBILE — switch table→cards ─────────────────── */
    @media (max-width: 768px) {
      .page { padding: 18px 14px; }
      .page-title { font-size: 1.5rem; }

      /* Hide table, show cards */
      .table-wrap { display: none; }
      .card-list  { display: flex; }

      .field-row { grid-template-columns: 1fr; }
    }

    /* ── SMALL MOBILE ─────────────────────────────────── */
    @media (max-width: 480px) {
      .page { padding: 14px 12px; }
      .modal { padding: 18px; }
      .filter-chips { gap: 6px; }
    }
  `]
})
export class RequestListComponent implements OnInit, OnDestroy {
  allRequests: Request[] = [];
  filteredRequests: Request[] = [];
  agents: User[] = [];
  currentUser!: User;
  isAdmin = false;
  showCreate = false;
  creating = false;
  successMessage = '';
  errorMessage = '';
  loading = true;
  sortBy: 'updated' | 'dueDate' | 'priority' = 'updated';

  filters = { search: '', status: '', agent: '', overdueOnly: false, mineOnly: false };
  form: any = { title: '', description: '', priority: 'Medium', dueDate: '', agentId: '', tags: '' };

  private userSub!: Subscription;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.userSub = this.api.user$.subscribe(u => {
      this.currentUser = u;
      this.isAdmin = u.role === 'Admin';
      this.applyFilters();
    });
    this.loadData();
  }

  ngOnDestroy(): void { this.userSub?.unsubscribe(); }

  loadData(): void {
    this.loading = true;
    this.api.getRequests().subscribe({
      next: r => { this.allRequests = r; this.applyFilters(); this.loading = false; },
      error: () => { this.errorMessage = 'Failed to load. Is the backend running?'; this.loading = false; }
    });
    this.api.getAgents().subscribe({ next: a => this.agents = a });
  }

  applyFilters(): void {
    let list = [...this.allRequests];

    if (this.filters.search) {
      const q = this.filters.search.toLowerCase();
      list = list.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    if (this.filters.status) list = list.filter(r => r.status === this.filters.status);
    if (this.isAdmin && this.filters.agent) {
      list = this.filters.agent === 'unassigned'
        ? list.filter(r => !r.assignedAgentId)
        : list.filter(r => r.assignedAgentId === this.filters.agent);
    }
    if (!this.isAdmin && this.filters.mineOnly)
      list = list.filter(r => r.assignedAgentId === this.currentUser?.id);
    if (this.filters.overdueOnly) list = list.filter(r => isOverdue(r));

    list.sort((a, b) => {
      if (this.sortBy === 'dueDate') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (this.sortBy === 'priority') {
        const o: Record<string,number> = { Critical:0, High:1, Medium:2, Low:3 };
        return o[a.priority] - o[b.priority];
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    this.filteredRequests = list;
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.agent ||
              this.filters.overdueOnly || this.filters.mineOnly);
  }

  clearFilters(): void {
    this.filters = { search: '', status: '', agent: '', overdueOnly: false, mineOnly: false };
    this.applyFilters();
  }

  isOv(r: Request): boolean { return isOverdue(r); }
  sc(status: string): string { return 's-' + status.toLowerCase().replace(' ', '-'); }
  agentName(id: string): string { return this.agents.find(a => a.id === id)?.name ?? id; }
  go(id: string): void { this.router.navigate(['/requests', id]); }

  createRequest(): void {
    if (!this.form.title || !this.form.description || !this.form.dueDate) {
      this.errorMessage = 'Title, description and due date are required.';
      setTimeout(() => this.errorMessage = '', 4000); return;
    }
    this.creating = true;
    const tags = this.form.tags
      ? this.form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

    this.api.createRequest({
      title: this.form.title, description: this.form.description,
      dueDate: this.form.dueDate, priority: this.form.priority,
      assignedAgentId: this.form.agentId || undefined, tags
    }).subscribe({
      next: r => {
        this.successMessage = '"' + r.title + '" created.';
        this.creating = false; this.cancelCreate(); this.loadData();
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: () => {
        this.errorMessage = 'Failed to create request.'; this.creating = false;
        setTimeout(() => this.errorMessage = '', 4000);
      }
    });
  }

  cancelCreate(): void {
    this.showCreate = false;
    this.form = { title: '', description: '', priority: 'Medium', dueDate: '', agentId: '', tags: '' };
  }
}