// frontend/src/app/requests/request-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, switchMap } from 'rxjs';
import { ApiService } from '../services/api.service';
import { Request, User, Status, Priority } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="requests-page">

      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Requests</h1>
          <p class="page-sub">{{ filtered().length }} of {{ requests.length }} requests</p>
        </div>
        <button *ngIf="isAdmin" class="btn btn-primary" (click)="showCreate = !showCreate">
          {{ showCreate ? '✕ Cancel' : '+ Create Request' }}
        </button>
      </div>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="alert alert-success">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>{{ successMessage }}</span>
        <button class="close-btn" (click)="successMessage = ''">✕</button>
      </div>

      <!-- ── Create Form (Admin only) ── -->
      <div *ngIf="showCreate && isAdmin" class="create-panel">
        <h2 class="form-title">New Request</h2>

        <div class="form-grid">
          <div class="form-group span-2">
            <label class="form-label">Title <span class="required">*</span></label>
            <input class="form-control" placeholder="Short, descriptive title" [(ngModel)]="form.title" />
          </div>
          <div class="form-group span-2">
            <label class="form-label">Description <span class="required">*</span></label>
            <textarea class="form-control" rows="3" placeholder="Detailed description of the request" [(ngModel)]="form.description"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-control" [(ngModel)]="form.priority">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Initial Status</label>
            <select class="form-control" [(ngModel)]="form.status">
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
            </select>
            <span class="hint">Requests cannot be created as Done</span>
          </div>
          <div class="form-group">
            <label class="form-label">Due Date <span class="required">*</span></label>
            <input class="form-control" type="date" [(ngModel)]="form.dueDate" />
          </div>
          <div class="form-group">
            <label class="form-label">Assign Agent</label>
            <select class="form-control" [(ngModel)]="form.agentId">
              <option value="">— Unassigned —</option>
              <option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tags <span class="hint">(comma-separated)</span></label>
            <input class="form-control" placeholder="e.g. IT, Finance, Urgent" [(ngModel)]="form.tags" />
          </div>
        </div>

        <div *ngIf="createError" class="form-error">⚠ {{ createError }}</div>

        <div class="form-actions">
          <button class="btn btn-primary" (click)="createRequest()" [disabled]="creating">
            {{ creating ? 'Creating…' : 'Create Request' }}
          </button>
          <button class="btn btn-ghost" (click)="cancelCreate()">Cancel</button>
        </div>
      </div>

      <!-- ── Filters & Search ── -->
      <div class="filters-bar">
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input class="search-input" placeholder="Search title, description or tags…" [(ngModel)]="filters.search" />
        </div>
        <select class="filter-select" [(ngModel)]="filters.status">
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Done">Done</option>
        </select>
        <select class="filter-select" [(ngModel)]="filters.priority">
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select *ngIf="isAdmin" class="filter-select" [(ngModel)]="filters.agent">
          <option value="">All Agents</option>
          <option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</option>
        </select>
        <button class="filter-toggle" [class.filter-active]="filters.overdueOnly" (click)="filters.overdueOnly = !filters.overdueOnly">
          ⏰ Overdue Only
        </button>
        <select class="filter-select" [(ngModel)]="sortBy">
          <option value="updated">Last Updated</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due Date</option>
        </select>
        <button *ngIf="hasActiveFilters()" class="btn-clear" (click)="clearFilters()">Clear filters</button>
      </div>

      <!-- ── Table ── -->
      <div class="panel">

        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading requests...</p>
        </div>

        <div *ngIf="!loading && filtered().length === 0" class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p>No requests matching your filters.</p>
          <button *ngIf="hasActiveFilters()" class="btn btn-ghost btn-sm" (click)="clearFilters()">Clear filters</button>
          <button *ngIf="!hasActiveFilters() && isAdmin" class="btn btn-primary btn-sm" (click)="showCreate = true">
            Create your first request
          </button>
        </div>

        <table *ngIf="!loading && filtered().length > 0" class="table">
          <thead>
            <tr>
              <th>PRIORITY</th>
              <th>TITLE</th>
              <th>DESCRIPTION</th>
              <th>STATUS</th>
              <th>CREATED</th>
              <th>DUE DATE</th>
              <th>ASSIGNED AGENT</th>
              <th *ngIf="isAdmin">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of filtered()"
                [class.overdue-row]="isOverdue(r)"
                (click)="navigateToDetail(r.id)"
                style="cursor: pointer;"
                class="request-row">
              <td>
                <span class="badge" [ngClass]="'priority-' + r.priority.toLowerCase()">{{ r.priority }}</span>
              </td>
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
              <td *ngIf="isAdmin" (click)="$event.stopPropagation()">
                <button class="btn-delete" (click)="confirmDelete($event, r)" title="Delete request">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="deleteTarget" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Delete Request</h3>
          <p class="modal-text">Are you sure you want to delete <strong>{{ deleteTarget.title }}</strong>? This action cannot be undone.</p>
          <div class="modal-actions">
            <button class="btn btn-danger" (click)="executeDelete()" [disabled]="deleting">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
            <button class="btn btn-ghost" (click)="cancelDelete()">Cancel</button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .requests-page { max-width: 1300px; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title  { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin-bottom: 4px; letter-spacing: -0.02em; }
    .page-sub    { font-size: 0.8rem; color: #64748b; }

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

    /* Create panel */
    .create-panel {
      background: white; border-radius: 12px; padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 20px;
      border-top: 3px solid #4f46e5;
    }
    .form-title { font-size: 1rem; font-weight: 700; color: #1e293b; margin-bottom: 18px; }
    .form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 20px; margin-bottom: 16px; }
    .span-2     { grid-column: span 2; }
    .form-group { display: flex; flex-direction: column; gap: 5px; }
    .form-label { font-size: 0.78rem; font-weight: 600; color: #374151; }
    .required   { color: #ef4444; }
    .hint       { color: #94a3b8; font-weight: 400; }
    .form-error { color: #dc2626; font-size: 0.8rem; background: #fef2f2; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; }
    .form-actions { display: flex; gap: 10px; }

    .form-control {
      width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 7px;
      font-size: 0.875rem; color: #1e293b; outline: none; font-family: inherit;
      background: white; transition: border-color 0.15s, box-shadow 0.15s;
    }
    .form-control:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    textarea.form-control { resize: vertical; }

    /* Filters */
    .filters-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
    .search-wrap { position: relative; flex: 1; min-width: 220px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; }
    .search-input {
      width: 100%; padding: 8px 12px 8px 32px; border: 1px solid #d1d5db;
      border-radius: 7px; font-size: 0.85rem; outline: none; font-family: inherit; background: white;
    }
    .search-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .filter-select {
      padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 7px;
      font-size: 0.82rem; outline: none; font-family: inherit; background: white; color: #374151; cursor: pointer;
    }
    .filter-select:focus { border-color: #6366f1; }
    .filter-toggle {
      padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 7px;
      font-size: 0.82rem; font-weight: 500; cursor: pointer; background: white;
      color: #64748b; transition: all 0.15s; font-family: inherit;
    }
    .filter-active { background: #fef2f2; border-color: #fca5a5; color: #dc2626; font-weight: 600; }
    .btn-clear { background: none; border: none; font-size: 0.8rem; color: #94a3b8; cursor: pointer; font-family: inherit; padding: 0; }
    .btn-clear:hover { color: #ef4444; }

    /* Panel & Table */
    .panel { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; min-height: 200px; }
    .table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .table th {
      text-align: left; padding: 10px 14px;
      font-size: 0.65rem; font-weight: 700; color: #94a3b8;
      letter-spacing: 0.07em; text-transform: uppercase; border-bottom: 1px solid #f1f5f9;
    }
    .table td { padding: 13px 14px; border-bottom: 1px solid #f8fafc; color: #334155; vertical-align: middle; }
    .request-row:hover td { background: #fafbff; }
    .table tbody tr:last-child td { border-bottom: none; }
    .overdue-row td { background: #fff9f9; }
    .overdue-row:hover td { background: #fef2f2 !important; }

    .req-title  { font-weight: 600; color: #1e293b; }
    .req-tags   { font-size: 0.72rem; color: #94a3b8; margin-top: 2px; }
    .desc-cell  { color: #64748b; max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .date-cell  { color: #64748b; white-space: nowrap; }
    .text-danger { color: #ef4444; font-weight: 600; }
    .agent-chip { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; }
    .avatar-sm  { width: 24px; height: 24px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; flex-shrink: 0; }
    .unassigned { color: #94a3b8; font-style: italic; font-size: 0.8rem; }

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

    .loading-state, .empty-state { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center;
      padding: 48px; 
      color: #94a3b8; 
      gap: 16px; 
      font-size: 0.875rem; 
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f1f5f9;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin { 
      to { transform: rotate(360deg); } 
    }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 7px; border: none; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #4338ca; }
    .btn-ghost { background: white; color: #374151; border: 1px solid #d1d5db; }
    .btn-ghost:hover { background: #f9fafb; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-sm { padding: 6px 14px; font-size: 0.78rem; }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .btn-delete {
      padding: 6px; border: none; background: #fef2f2; color: #dc2626;
      border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center;
      justify-content: center; transition: all 0.15s;
    }
    .btn-delete:hover { background: #fee2e2; }

    /* Modal */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
      z-index: 1000; animation: fadeIn 0.15s;
    }
    .modal {
      background: white; border-radius: 12px; padding: 24px;
      max-width: 450px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
      animation: slideUp 0.2s;
    }
    .modal-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .modal-text { font-size: 0.875rem; color: #64748b; margin-bottom: 20px; line-height: 1.6; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class RequestListComponent implements OnInit, OnDestroy {
  requests: Request[] = [];
  agents: User[] = [];
  currentUser!: User;
  isAdmin = false;
  showCreate = false;
  creating = false;
  createError = '';
  successMessage = '';
  loading = true;
  deleteTarget?: Request;
  deleting = false;
  sortBy: 'updated' | 'priority' | 'dueDate' = 'updated';
  
  private refreshSubscription?: Subscription;

  filters = { search: '', status: '', priority: '', agent: '', overdueOnly: false };
  form: { 
    title: string; 
    description: string; 
    status: Status; 
    priority: Priority; 
    dueDate: string; 
    agentId: string; 
    tags: string 
  } = {
    title: '', 
    description: '', 
    status: 'Open',
    priority: 'Medium', 
    dueDate: '', 
    agentId: '', 
    tags: ''
  };

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();
    this.isAdmin = this.currentUser.role === 'Admin';
    this.loadData();
    this.startRealTimeUpdates();
  }

  ngOnDestroy(): void {
    this.stopRealTimeUpdates();
  }

  loadData(): void {
    this.loading = true;
    this.api.getRequests().subscribe({ 
      next: r => { 
        this.requests = r; 
        this.loading = false; 
      },
      error: () => { 
        this.loading = false;
        this.createError = 'Failed to load requests.';
      }
    });
    this.api.getAgents().subscribe({ 
      next: a => this.agents = a, 
      error: () => {} 
    });
  }

  startRealTimeUpdates(): void {
    // Poll for updates every 10 seconds
    this.refreshSubscription = interval(10000).pipe(
      switchMap(() => this.api.getRequests())
    ).subscribe({
      next: (updatedRequests) => {
        this.requests = updatedRequests;
      },
      error: () => {}
    });
  }

  stopRealTimeUpdates(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  filtered(): Request[] {
    const s = this.filters.search.toLowerCase();
    let result = this.requests.filter(r => {
      if (s && !r.title.toLowerCase().includes(s)
             && !r.description.toLowerCase().includes(s)
             && !(r.tags ?? []).some(t => t.toLowerCase().includes(s))) return false;
      if (this.filters.status   && r.status   !== this.filters.status)   return false;
      if (this.filters.priority && r.priority !== this.filters.priority) return false;
      if (this.filters.agent    && r.assignedAgentId !== this.filters.agent) return false;
      if (this.filters.overdueOnly && !this.isOverdue(r)) return false;
      return true;
    });

    // Sort
    return result.sort((a, b) => {
      if (this.sortBy === 'priority') {
        const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (this.sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || this.filters.priority || this.filters.agent || this.filters.overdueOnly);
  }

  clearFilters(): void {
    this.filters = { search: '', status: '', priority: '', agent: '', overdueOnly: false };
  }

  isOverdue(r: Request): boolean {
    return r.status !== 'Done' && new Date(r.dueDate) < new Date();
  }

  agentName(id: string): string { 
    return this.agents.find(a => a.id === id)?.name ?? id; 
  }
  
  agentInitials(id: string): string {
    return this.agentName(id).split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  navigateToDetail(id: string): void {
    this.router.navigate(['/requests', id]);
  }

  createRequest(): void {
    if (!this.form.title.trim())       { this.createError = 'Title is required.';       return; }
    if (!this.form.description.trim()) { this.createError = 'Description is required.'; return; }
    if (!this.form.dueDate)            { this.createError = 'Due date is required.';    return; }
    this.createError = '';
    this.creating = true;

    const tags = this.form.tags ? this.form.tags.split(',').map(t => t.trim()).filter(t => t) : undefined;

    this.api.createRequest({
      title: this.form.title.trim(),
      description: this.form.description.trim(),
      dueDate: this.form.dueDate,
      status: this.form.status,
      priority: this.form.priority,
      assignedAgentId: this.form.agentId || undefined,
      tags
    }).subscribe({
      next: (created: any) => {
        this.successMessage = 'Request created successfully!';
        
        if (this.form.agentId && created?.id) {
          this.api.assignRequest(created.id, this.form.agentId).subscribe({
            next:  () => {
              this.reload();
              this.successMessage = 'Request created and assigned successfully!';
            },
            error: () => this.reload()
          });
        } else {
          this.reload();
        }
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: () => {
        this.createError = 'Failed to create — check backend connection.';
        this.creating = false;
      }
    });
  }

  cancelCreate(): void {
    this.showCreate = false;
    this.createError = '';
    this.form = { 
      title: '', 
      description: '', 
      status: 'Open',
      priority: 'Medium', 
      dueDate: '', 
      agentId: '', 
      tags: '' 
    };
  }

  confirmDelete(event: Event, request: Request): void {
    event.stopPropagation(); // Prevent row click
    this.deleteTarget = request;
  }

  cancelDelete(): void {
    this.deleteTarget = undefined;
    this.deleting = false;
  }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.api.deleteRequest(this.deleteTarget.id).subscribe({
      next: () => {
        this.requests = this.requests.filter(r => r.id !== this.deleteTarget!.id);
        this.successMessage = `Request "${this.deleteTarget!.title}" deleted successfully.`;
        this.cancelDelete();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: () => {
        this.deleting = false;
        this.createError = 'Failed to delete request';
      }
    });
  }

  private reload(): void {
    this.api.getRequests().subscribe({
      next: r => {
        this.requests = r;
        this.creating = false;
        this.showCreate = false;
        this.form = { 
          title: '', 
          description: '', 
          status: 'Open',
          priority: 'Medium', 
          dueDate: '', 
          agentId: '', 
          tags: '' 
        };
      }
    });
  }
}