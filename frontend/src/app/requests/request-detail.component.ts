// frontend/src/app/requests/request-detail.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { Request, Status, User, Comment, validTransitions, isOverdue, shouldEscalate } from '../models';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div *ngIf="request; else loading" class="detail-page">

      <a routerLink="/requests" class="back-link">← Back to Requests</a>

      <!-- Success Message -->
      <div *ngIf="successMessage" class="alert alert-success">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>{{ successMessage }}</span>
        <button class="close-btn" (click)="successMessage = ''">✕</button>
      </div>

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="alert alert-danger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ errorMessage }}</span>
        <button class="close-btn" (click)="errorMessage = ''">✕</button>
      </div>

      <!-- Admin overdue banner -->
      <div *ngIf="isOverdue() && isAdmin" class="alert alert-danger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div>
          <strong>Admin Warning: This request is overdue!</strong>
          <span *ngIf="isEscalated()"> — Priority auto-escalated to Critical (overdue &gt; 3 days).</span>
        </div>
      </div>

      <!-- Agent overdue notice -->
      <div *ngIf="isOverdue() && !isAdmin" class="alert alert-warning">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>This request is past its due date. Please update the status or contact your admin.</span>
      </div>

      <!-- Agent permission warning -->
      <div *ngIf="!isAdmin && !canEdit()" class="alert alert-warning">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>You can only edit requests assigned to you.</span>
      </div>

      <!-- Title + badges -->
      <div class="detail-header">
        <h1 class="detail-title">{{ request.title }}</h1>
        <div class="detail-badges">
          <span class="badge" [ngClass]="'priority-' + request.priority.toLowerCase()">{{ request.priority }}</span>
          <span class="badge" [ngClass]="'status-' + request.status.toLowerCase().split(' ').join('-')">{{ request.status }}</span>
          <span *ngIf="isOverdue()" class="overdue-tag">OVERDUE</span>
          <span *ngIf="isEscalated()" class="escalated-tag">🔺 Auto-escalated</span>
        </div>
      </div>

      <div class="detail-body">

        <!-- ── LEFT: main content ── -->
        <div class="detail-main">

          <!-- Description -->
          <div class="card">
            <h3 class="card-title">Description</h3>
            <p class="desc-text">{{ request.description }}</p>
          </div>

          <!-- Status Transitions -->
          <div class="card" *ngIf="canEdit() || isAdmin">
            <h3 class="card-title">Update Status</h3>

            <div *ngIf="getAllowedTransitions().length > 0" class="transition-buttons">
              <button
                *ngFor="let s of getAllowedTransitions()"
                (click)="changeStatus(s)"
                class="btn-status"
                [ngClass]="'btn-' + s.toLowerCase().split(' ').join('-')"
                [disabled]="isDoneAndUnassigned(s) || updatingStatus"
                [title]="isDoneAndUnassigned(s) ? 'Assign an agent before marking Done' : 'Move to ' + s">
                <span *ngIf="updatingStatus && selectedStatus === s" class="spinner-small"></span>
                {{ s }}
              </button>
            </div>
            <p *ngIf="getAllowedTransitions().length === 0" class="muted">
              ✓ Request is <strong>Done</strong>. No further transitions available.
            </p>
            <p *ngIf="isDoneAndUnassigned('Done')" class="warn-hint">
              ⚠ This request must be assigned to an agent before it can be marked Done.
            </p>
          </div>

          <!-- Comments -->
          <div class="card">
            <h3 class="card-title">
              Comments
              <span class="count-chip">{{ comments.length }}</span>
            </h3>

            <!-- Add comment form -->
            <div class="comment-composer">
              <div class="composer-avatar">{{ currentUser.name[0].toUpperCase() }}</div>
              <div class="composer-right">
                <textarea
                  class="form-control"
                  rows="3"
                  placeholder="Write a comment…"
                  [(ngModel)]="newComment">
                </textarea>
                <div class="composer-footer">
                  <select class="form-control-sm" [(ngModel)]="commentType">
                    <option value="General">General</option>
                    <option value="Status update">Status update</option>
                  </select>
                  <button class="btn btn-primary btn-sm" (click)="addComment()" [disabled]="!newComment.trim() || addingComment">
                    <span *ngIf="addingComment" class="spinner-small"></span>
                    Post Comment
                  </button>
                </div>
              </div>
            </div>

            <!-- Comment list -->
            <div *ngIf="comments.length === 0" class="muted" style="padding: 12px 0 4px">
              No comments yet. Be the first to comment.
            </div>

            <div class="comment-list">
              <div *ngFor="let c of comments"
                   class="comment"
                   [ngClass]="commentCardClass(c.type)">
                <div class="comment-header">
                  <div class="c-avatar">{{ c.author[0].toUpperCase() }}</div>
                  <div class="c-meta">
                    <span class="c-author">{{ c.author }}</span>
                    <span class="c-type" [ngClass]="'type-' + c.type.toLowerCase().split(' ').join('-')">{{ c.type }}</span>
                  </div>
                  <span class="c-time">{{ c.createdAt | date:'MMM d · h:mm a' }}</span>
                </div>
                <p class="c-text">{{ c.text }}</p>
              </div>
            </div>
          </div>

        </div>

        <!-- ── RIGHT: sidebar metadata ── -->
        <div class="detail-aside">

          <!-- Request details -->
          <div class="card">
            <h3 class="card-title">Details</h3>
            <div class="meta-list">
              <div class="meta-row">
                <span class="meta-key">Status</span>
                <span class="badge" [ngClass]="'status-' + request.status.toLowerCase().split(' ').join('-')">{{ request.status }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">Priority</span>
                <span class="badge" [ngClass]="'priority-' + request.priority.toLowerCase()">{{ request.priority }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">Created</span>
                <span class="meta-val">{{ request.createdAt | date:'MMM d, y' }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-key">Due Date</span>
                <span class="meta-val" [class.text-danger]="isOverdue()">
                  {{ request.dueDate | date:'MMM d, y' }}
                </span>
              </div>
              <div class="meta-row">
                <span class="meta-key">Last Updated</span>
                <span class="meta-val">{{ request.updatedAt | date:'MMM d, y h:mm a' }}</span>
              </div>
              <div *ngIf="request.tags?.length" class="meta-row">
                <span class="meta-key">Tags</span>
                <span class="meta-val tag-list">{{ request.tags!.join(', ') }}</span>
              </div>
            </div>
          </div>

          <!-- Assign Agent — Admin only -->
          <div *ngIf="isAdmin" class="card">
            <h3 class="card-title">Assigned Agent</h3>

            <div *ngIf="request.assignedAgentId" class="agent-chip">
              <div class="avatar-md">{{ agentInitials(request.assignedAgentId) }}</div>
              <div>
                <div class="agent-name">{{ agentName(request.assignedAgentId) }}</div>
                <div class="agent-id">{{ request.assignedAgentId }}</div>
              </div>
            </div>
            <p *ngIf="!request.assignedAgentId" class="muted" style="margin-bottom:12px">Currently unassigned</p>

            <div class="assign-section">
              <select class="form-control" [(ngModel)]="selectedAgentId" style="margin-top:12px">
                <option value="">— Unassign —</option>
                <option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</option>
              </select>
              <button class="btn btn-primary btn-sm" style="margin-top:8px; width:100%" (click)="assignAgent()" [disabled]="assigningAgent">
                <span *ngIf="assigningAgent" class="spinner-small"></span>
                {{ request.assignedAgentId ? 'Reassign Agent' : 'Assign Agent' }}
              </button>
            </div>
          </div>

          <!-- Assigned agent info — Agent view -->
          <div *ngIf="!isAdmin" class="card">
            <h3 class="card-title">Assigned To</h3>
            <div *ngIf="request.assignedAgentId" class="agent-chip">
              <div class="avatar-md">{{ agentInitials(request.assignedAgentId) }}</div>
              <div>
                <div class="agent-name">{{ agentName(request.assignedAgentId) }}</div>
                <div class="agent-id">{{ request.assignedAgentId }}</div>
              </div>
            </div>
            <p *ngIf="!request.assignedAgentId" class="muted">Unassigned</p>
          </div>

        </div>
      </div>

    </div>

    <ng-template #loading>
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading request details...</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .detail-page { max-width: 1100px; }

    .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 600; color: #6366f1; text-decoration: none; margin-bottom: 18px; }
    .back-link:hover { color: #4f46e5; }

    /* Alerts */
    .alert { 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      padding: 12px 16px; 
      border-radius: 8px; 
      font-size: 0.85rem; 
      margin-bottom: 20px; 
      line-height: 1.5;
      position: relative;
    }
    .alert-success { 
      background: #f0fdf4; 
      border-left: 4px solid #22c55e; 
      color: #14532d; 
    }
    .alert-success svg { 
      color: #22c55e; 
      flex-shrink: 0; 
    }
    .alert-danger  { 
      background: #fef2f2; 
      border-left: 4px solid #ef4444; 
      color: #7f1d1d; 
    }
    .alert-warning { 
      background: #fffbeb; 
      border-left: 4px solid #f59e0b; 
      color: #78350f; 
    }
    .alert-danger svg  { color: #ef4444; flex-shrink: 0; margin-top: 1px; }
    .alert-warning svg { color: #f59e0b; flex-shrink: 0; margin-top: 1px; }
    
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
    .detail-header  { margin-bottom: 20px; }
    .detail-title   { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 10px; letter-spacing: -0.02em; line-height: 1.3; }
    .detail-badges  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .escalated-tag  { display: inline-block; padding: 2px 8px; background: #fff7ed; color: #b45309; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }

    /* Layout */
    .detail-body { display: grid; grid-template-columns: 1fr 290px; gap: 20px; align-items: start; }
    @media (max-width: 860px) { .detail-body { grid-template-columns: 1fr; } }

    /* Cards */
    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 16px; }
    .card:last-child { margin-bottom: 0; }
    .card-title {
      font-size: 0.75rem; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.07em;
      margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
    }

    .desc-text { font-size: 0.9rem; color: #374151; line-height: 1.7; white-space: pre-wrap; }

    /* Status buttons */
    .transition-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-status {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px; 
      border: none; 
      border-radius: 7px;
      font-weight: 600; 
      font-size: 0.82rem; 
      cursor: pointer;
      transition: all 0.15s; 
      font-family: inherit;
    }
    .btn-status:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-in-progress { background: #ede9fe; color: #6d28d9; } 
    .btn-in-progress:hover:not(:disabled) { background: #ddd6fe; }
    .btn-blocked     { background: #fef2f2; color: #dc2626; } 
    .btn-blocked:hover:not(:disabled)     { background: #fee2e2; }
    .btn-done        { background: #f0fdf4; color: #16a34a; } 
    .btn-done:hover:not(:disabled)        { background: #dcfce7; }
    .btn-open        { background: #eef2ff; color: #4f46e5; } 
    .btn-open:hover:not(:disabled)        { background: #e0e7ff; }

    .warn-hint    { font-size: 0.8rem; color: #b45309; margin-top: 10px; }
    .muted        { color: #94a3b8; font-size: 0.85rem; }

    /* Comment composer */
    .comment-composer { display: flex; gap: 10px; margin-bottom: 20px; }
    .composer-avatar  { width: 32px; height: 32px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0; margin-top: 2px; }
    .composer-right   { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .composer-footer  { display: flex; gap: 8px; align-items: center; }

    /* Comment list */
    .comment-list { display: flex; flex-direction: column; gap: 10px; }
    .comment { padding: 12px 14px; border-radius: 8px; background: #f8fafc; border-left: 3px solid #e2e8f0; }
    .comment-status-update   { border-left-color: #6366f1; background: #f5f3ff; }
    .comment-system-generated { border-left-color: #f59e0b; background: #fffbeb; }
    .comment-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
    .c-avatar { width: 24px; height: 24px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; font-weight: 700; flex-shrink: 0; }
    .c-author  { font-size: 0.82rem; font-weight: 600; color: #1e293b; }
    .c-time    { font-size: 0.72rem; color: #94a3b8; margin-left: auto; }
    .c-text    { font-size: 0.85rem; color: #374151; line-height: 1.6; margin: 0; }
    .c-type    { padding: 1px 7px; border-radius: 999px; font-size: 0.65rem; font-weight: 700; }
    .type-general          { background: #f1f5f9; color: #64748b; }
    .type-status-update    { background: #ede9fe; color: #6d28d9; }
    .type-system-generated { background: #fef3c7; color: #b45309; }
    .count-chip { background: #f1f5f9; color: #64748b; padding: 2px 7px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; text-transform: none; letter-spacing: 0; }

    /* Meta list */
    .meta-list { display: flex; flex-direction: column; }
    .meta-row  { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #f1f5f9; }
    .meta-row:last-child { border-bottom: none; }
    .meta-key  { font-size: 0.78rem; font-weight: 600; color: #64748b; }
    .meta-val  { font-size: 0.82rem; color: #1e293b; text-align: right; max-width: 140px; }
    .text-danger { color: #ef4444; font-weight: 600; }
    .tag-list  { font-size: 0.75rem; color: #64748b; }

    /* Agent chip */
    .agent-chip { display: flex; align-items: center; gap: 10px; }
    .avatar-md  { width: 36px; height: 36px; border-radius: 50%; background: #e0e7ff; color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
    .agent-name { font-size: 0.875rem; font-weight: 600; color: #1e293b; }
    .agent-id   { font-size: 0.72rem; color: #94a3b8; font-family: monospace; }

    .assign-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Badges */
    .badge { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 0.7rem; font-weight: 700; white-space: nowrap; }
    .priority-critical { background: #fef2f2; color: #dc2626; }
    .priority-high     { background: #fff7ed; color: #ea580c; }
    .priority-medium   { background: #fefce8; color: #ca8a04; }
    .priority-low      { background: #f0fdf4; color: #16a34a; }
    .status-open        { background: #eef2ff; color: #4f46e5; }
    .status-in-progress { background: #f5f3ff; color: #7c3aed; }
    .status-blocked     { background: #fef2f2; color: #dc2626; }
    .status-done        { background: #f0fdf4; color: #16a34a; }
    .overdue-tag { display: inline-block; padding: 2px 8px; background: #ef4444; color: white; border-radius: 999px; font-size: 0.68rem; font-weight: 700; }

    /* Inputs */
    .form-control { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 7px; font-size: 0.875rem; color: #1e293b; outline: none; font-family: inherit; background: white; transition: border-color 0.15s, box-shadow 0.15s; }
    .form-control:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    textarea.form-control { resize: vertical; }
    .form-control-sm { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.8rem; outline: none; font-family: inherit; background: white; }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: 7px; border: none; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; font-family: inherit; }
    .btn-primary { background: #4f46e5; color: white; } 
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { padding: 6px 14px; font-size: 0.78rem; }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }

    /* Loading states */
    .loading-state { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center;
      padding: 60px; 
      color: #94a3b8; 
      gap: 16px; 
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f1f5f9;
      border-top-color: #4f46e5;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    .spinner-small {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    
    @keyframes spin { 
      to { transform: rotate(360deg); } 
    }
  `]
})
export class RequestDetailComponent implements OnInit, OnDestroy {
  request?: Request;
  comments: Comment[] = [];
  agents: User[] = [];
  currentUser!: User;
  isAdmin = false;
  isAdminUser = false;
  errorMessage = '';
  successMessage = '';
  selectedAgentId = '';
  newComment = '';
  commentType: 'General' | 'Status update' = 'General';
  
  // Loading states
  updatingStatus = false;
  assigningAgent = false;
  addingComment = false;
  selectedStatus: Status | null = null;
  
  private routeSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute, 
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();
    this.isAdmin = this.currentUser.role === 'Admin';
    this.isAdminUser = this.currentUser.id === 'admin-1' || this.currentUser.role === 'Admin';
    
    // Load agents immediately
    this.loadAgents();
    
    // Subscribe to route params
    this.routeSubscription = this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadRequest(id);
        this.loadComments(id);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadAgents(): void {
    this.api.getAgents().subscribe({ 
      next: (a) => {
        this.agents = a;
        console.log('Agents loaded:', a); // Debug log
      },
      error: (err) => {
        console.error('Error loading agents:', err);
        // Set mock agents if backend fails
        this.agents = [
          { id: 'agent-1', name: 'John Doe', role: 'Agent' },
          { id: 'agent-2', name: 'Jane Smith', role: 'Agent' }
        ];
      }
    });
  }

  loadRequest(id: string): void {
    this.api.getRequestById(id).subscribe({
      next: r => { 
        this.request = r; 
        this.selectedAgentId = r.assignedAgentId ?? '';
        this.checkEscalation();
      },
      error: (err) => { 
        this.errorMessage = 'Failed to load request. Please try again.';
        console.error('Error loading request:', err);
      }
    });
  }

  loadComments(id: string): void {
    this.api.getComments(id).subscribe({ 
      next: c => this.comments = c, 
      error: (err) => console.error('Error loading comments:', err) 
    });
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  canEdit(): boolean {
    if (this.isAdmin) return true;
    if (!this.request) return false;
    return this.request.assignedAgentId === this.currentUser.id;
  }

  // ── Transitions ────────────────────────────────────────────────────────────
  getAllowedTransitions(): Status[] {
    if (!this.request) return [];
    return validTransitions[this.request.status] ?? [];
  }

  isDoneAndUnassigned(s: Status): boolean {
    return s === 'Done' && !this.request?.assignedAgentId;
  }

  changeStatus(status: Status): void {
    if (!this.request) return;
    if (!this.canEdit()) {
      this.errorMessage = 'You can only update requests assigned to you.';
      return;
    }
    this.errorMessage = '';
    
    if (this.isDoneAndUnassigned(status)) {
      this.errorMessage = 'Assign an agent before marking Done.';
      return;
    }
    
    const allowed = validTransitions[this.request.status];
    if (!allowed.includes(status)) {
      this.errorMessage = `Invalid transition: "${this.request.status}" → "${status}".`;
      return;
    }
    
    this.updatingStatus = true;
    this.selectedStatus = status;
    
    const previousStatus = this.request.status;
    
    this.api.updateStatus(this.request.id, status).subscribe({
      next: () => {
        this.request!.status = status;
        this.successMessage = `Status successfully updated to ${status}`;
        this.updatingStatus = false;
        this.selectedStatus = null;
        
        // Add system-generated comment
        this.api.addComment(
          this.request!.id, 
          `Status changed from ${previousStatus} to ${status} by ${this.currentUser.name}.`,
          'System-generated'
        ).subscribe({
          next: () => this.loadComments(this.request!.id)
        });
        
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: err => { 
        this.errorMessage = `Update failed: ${err?.error?.message ?? 'Unknown error'}`;
        this.updatingStatus = false;
        this.selectedStatus = null;
      }
    });
  }

  // ── Overdue / Escalation ───────────────────────────────────────────────────
  isOverdue(): boolean {
    if (!this.request) return false;
    return isOverdue(this.request);
  }

  isEscalated(): boolean {
    if (!this.request) return false;
    return shouldEscalate(this.request) && this.request.priority === 'Critical';
  }

  checkEscalation(): void {
    if (!this.request || this.request.status === 'Done') return;
    
    if (shouldEscalate(this.request)) {
      const previousPriority = this.request.priority;
      this.request.priority = 'Critical';
      
      const dueDate = new Date(this.request.dueDate);
      const now = new Date();
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      this.api.addComment(
        this.request.id,
        `Priority automatically escalated from ${previousPriority} to Critical (overdue by ${daysOverdue} days).`,
        'System-generated'
      ).subscribe({
        next: () => {
          this.loadComments(this.request!.id);
          this.successMessage = `Priority auto-escalated to Critical (${daysOverdue} days overdue)`;
          setTimeout(() => this.successMessage = '', 5000);
        }
      });
    }
  }

  // ── Agent assign ───────────────────────────────────────────────────────────
  assignAgent(): void {
    if (!this.request) return;
    if (!this.isAdmin) {
      this.errorMessage = 'Only administrators can assign agents.';
      return;
    }
    
    this.assigningAgent = true;
    const previousAgent = this.request.assignedAgentId;
    const newAgent = this.selectedAgentId || undefined;
    
    this.api.assignRequest(this.request.id, this.selectedAgentId).subscribe({
      next: () => { 
        this.request!.assignedAgentId = newAgent;
        this.assigningAgent = false;
        this.successMessage = newAgent 
          ? `Request successfully assigned to ${this.agentName(newAgent)}` 
          : 'Request unassigned successfully';
        
        // Add system-generated comment
        let message = '';
        if (previousAgent && newAgent) {
          message = `Agent reassigned from ${this.agentName(previousAgent)} to ${this.agentName(newAgent)} by ${this.currentUser.name}.`;
        } else if (previousAgent && !newAgent) {
          message = `Agent ${this.agentName(previousAgent)} unassigned by ${this.currentUser.name}.`;
        } else if (!previousAgent && newAgent) {
          message = `Request assigned to ${this.agentName(newAgent)} by ${this.currentUser.name}.`;
        }
        
        if (message) {
          this.api.addComment(
            this.request!.id,
            message,
            'System-generated'
          ).subscribe({
            next: () => this.loadComments(this.request!.id)
          });
        }
        
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = 'Failed to assign agent. Please try again.';
        this.assigningAgent = false;
        console.error('Error assigning agent:', err);
      }
    });
  }

  // ── Comments ───────────────────────────────────────────────────────────────
  addComment(): void {
    if (!this.newComment.trim() || !this.request) return;
    
    this.addingComment = true;
    
    this.api.addComment(this.request.id, this.newComment.trim(), this.commentType).subscribe({
      next: () => {
        this.newComment = '';
        this.addingComment = false;
        this.successMessage = 'Comment posted successfully';
        this.loadComments(this.request!.id);
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = 'Failed to post comment. Please try again.';
        this.addingComment = false;
        console.error('Error adding comment:', err);
      }
    });
  }

  commentCardClass(type: string): string {
    return 'comment-' + type.toLowerCase().split(' ').join('-');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  agentName(id: string): string { 
    const agent = this.agents.find(a => a.id === id);
    return agent?.name ?? id; 
  }
  
  agentInitials(id: string): string {
    const name = this.agentName(id);
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}