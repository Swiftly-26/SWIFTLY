import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { ApiService } from '../services/api.service';
import { Request, Status, User, Comment, validTransitions, isOverdue } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">

      <button class="back-btn" (click)="goBack()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>

      <div *ngIf="successMessage" class="alert success">
        <span>{{ successMessage }}</span><button (click)="successMessage = ''">✕</button>
      </div>
      <div *ngIf="errorMessage" class="alert danger">
        <span>{{ errorMessage }}</span><button (click)="errorMessage = ''">✕</button>
      </div>

      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div><p>Loading...</p>
      </div>

      <div *ngIf="!loading && !request" class="not-found">
        <h2>Request Not Found</h2>
        <p>This request does not exist or has been deleted.</p>
        <button class="btn-primary" (click)="goBack()">Go Back</button>
      </div>

      <div *ngIf="!loading && request" class="layout">

        <!-- ── MAIN ── -->
        <div class="main-col">

          <!-- Title card -->
          <div class="card">
            <h1 class="req-title">{{ request.title }}</h1>
            <div class="badges">
              <span class="pbadge" [ngClass]="'p-' + request.priority.toLowerCase()">
                {{ request.priority }}
              </span>
              <span class="sbadge" [ngClass]="sc(request.status)">{{ request.status }}</span>
              <span *ngFor="let tag of request.tags" class="tag">#{{ tag }}</span>
            </div>
          </div>

          <!-- Description -->
          <div class="card">
            <div class="section-lbl">DESCRIPTION</div>
            <p class="desc">{{ request.description }}</p>
          </div>

          <!-- Discussion -->
          <div class="card">
            <div class="section-lbl">DISCUSSION</div>

            <div class="comment-form">
              <textarea class="c-input" rows="3"
                        placeholder="Add a comment..."
                        [(ngModel)]="newComment"></textarea>
              <div class="c-row">
                <select class="c-type" [(ngModel)]="commentType">
                  <option value="General">General</option>
                  <option value="Status update">Status update</option>
                </select>
                <button class="post-btn"
                        (click)="addComment()"
                        [disabled]="!newComment.trim() || addingComment">
                  <span *ngIf="addingComment" class="spin-sm"></span>
                  {{ addingComment ? 'Posting...' : 'Post' }}
                </button>
              </div>
            </div>

            <div class="comments">
              <div *ngFor="let c of comments"
                   class="comment" [ngClass]="cc(c.type)">
                <div class="c-header">
                  <div class="c-av">{{ c.author[0].toUpperCase() }}</div>
                  <div class="c-meta">
                    <span class="c-author">{{ c.author }}</span>
                    <span class="c-time">{{ c.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  </div>
                  <span class="c-type-pill">{{ c.type }}</span>
                </div>
                <p class="c-text">{{ c.text }}</p>
              </div>
              <div *ngIf="!comments.length" class="no-comments">No comments yet.</div>
            </div>
          </div>

        </div>

        <!-- ── SIDEBAR ── -->
        <div class="side-col">

          <!-- Status -->
          <div class="card">
            <div class="section-lbl">STATUS</div>
            <div class="status-row">
              <span class="status-lbl">Current:</span>
              <span class="sbadge" [ngClass]="sc(request.status)">{{ request.status }}</span>
            </div>

            <ng-container *ngIf="transitions().length > 0">
              <div class="hint">Move to:</div>
              <div class="trans-btns">
                <button *ngFor="let s of transitions()"
                        class="trans-btn"
                        [disabled]="!canChange() || updating || (s === 'Done' && !request.assignedAgentId)"
                        [title]="tooltip(s)"
                        (click)="changeStatus(s)">
                  <span *ngIf="updating && selStatus === s" class="spin-sm"></span>
                  {{ s }}
                </button>
              </div>
            </ng-container>

            <p *ngIf="!transitions().length" class="done-msg">This request is complete.</p>
            <p *ngIf="!canChange() && transitions().length" class="hint-warn">
              Only the assigned agent or admin can change status.
            </p>
            <p *ngIf="!request.assignedAgentId && transitions().length" class="hint-warn">
              Unassigned requests cannot be marked Done.
            </p>
          </div>

          <!-- Agent -->
          <div class="card">
            <div class="section-lbl">AGENT</div>
            <div *ngIf="request.assignedAgentId" class="agent-row">
              <div class="agent-av">{{ agentInitials(request.assignedAgentId) }}</div>
              <div>
                <div class="agent-name">{{ agentName(request.assignedAgentId) }}</div>
                <div class="agent-sub">Responsible Agent</div>
              </div>
            </div>
            <p *ngIf="!request.assignedAgentId" class="unassigned">Unassigned</p>

            <div *ngIf="isAdmin" class="assign-form">
              <select class="field" [(ngModel)]="selAgent">
                <option value="">Unassign</option>
                <option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</option>
              </select>
              <button class="btn-assign" (click)="assignAgent()" [disabled]="assigning">
                <span *ngIf="assigning" class="spin-sm"></span>
                {{ request.assignedAgentId ? 'Reassign' : 'Assign' }}
              </button>
            </div>
          </div>

          <!-- Dates -->
          <div class="card">
            <div class="section-lbl">DATES</div>
            <div class="date-row">
              <span class="date-lbl">CREATED</span>
              <span class="date-val">{{ request.createdAt | date:'dd/MM/yyyy' }}</span>
            </div>
            <div class="date-row">
              <span class="date-lbl">DUE</span>
              <span class="date-val" [class.ov-val]="isOv()">
                {{ request.dueDate | date:'dd/MM/yyyy' }}
                <span *ngIf="isOv()" class="ov-chip">OVERDUE</span>
              </span>
            </div>
            <div class="date-row last">
              <span class="date-lbl">UPDATED</span>
              <span class="date-val">{{ request.updatedAt | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; padding: 28px 24px; }

    .back-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: none; border: none; color: #7e8aa8; font-size: 0.88rem;
      cursor: pointer; padding: 6px 0; margin-bottom: 18px; transition: color 0.15s;
    }
    .back-btn:hover { color: #7c3aed; }

    .alert {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; border-radius: 10px; margin-bottom: 18px; gap: 12px;
    }
    .alert.success { background: #132b1e; border-left: 4px solid #10b981; color: #d1fae5; }
    .alert.danger  { background: #2d1a1c; border-left: 4px solid #ef4444; color: #ffcdd2; }
    .alert button  { background: none; border: none; color: #7e8aa8; cursor: pointer; font-size: 1rem; }

    .loading-state {
      display: flex; flex-direction: column;
      align-items: center; padding: 80px; color: #7e8aa8; gap: 16px;
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #2a2f3f;
      border-top-color: #7c3aed; border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spin-sm {
      display: inline-block; width: 13px; height: 13px;
      border: 2px solid rgba(255,255,255,0.25); border-top-color: white;
      border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .not-found {
      text-align: center; padding: 60px; color: #7e8aa8;
      background: #1a1f30; border-radius: 14px;
    }
    .not-found h2 { color: white; margin-bottom: 10px; }
    .not-found p  { margin-bottom: 20px; }

    /* ── LAYOUT: 2-col desktop, 1-col mobile ─────────── */
    .layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 22px;
      align-items: start;
    }
    .main-col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
    .side-col  { display: flex; flex-direction: column; gap: 16px; }

    /* ── CARD ─────────────────────────────────────────── */
    .card {
      background: #1a1f30; border-radius: 14px;
      padding: 20px; border: 1px solid #2a2f3f;
    }
    .section-lbl {
      font-size: 0.65rem; font-weight: 700; color: #7e8aa8;
      text-transform: uppercase; letter-spacing: 0.09em; margin-bottom: 14px;
    }

    /* ── TITLE CARD ───────────────────────────────────── */
    .req-title {
      font-size: 1.7rem; font-weight: 600; color: white;
      margin-bottom: 14px; line-height: 1.3; word-break: break-word;
    }
    .badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .tag    { color: #7e8aa8; font-size: 0.8rem; }

    .desc {
      color: #e2e8f0; font-size: 0.9rem; line-height: 1.65;
      white-space: pre-wrap; word-break: break-word;
    }

    /* ── COMMENTS ─────────────────────────────────────── */
    .comment-form { margin-bottom: 20px; }
    .c-input {
      width: 100%; padding: 12px; background: #0f1422;
      border: 1px solid #2a2f3f; border-radius: 10px; color: white;
      font-size: 0.88rem; resize: vertical; margin-bottom: 10px;
      font-family: inherit; box-sizing: border-box;
    }
    .c-input:focus { border-color: #7c3aed; outline: none; }
    .c-row {
      display: flex; justify-content: space-between;
      align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .c-type {
      padding: 8px 10px; background: #0f1422; border: 1px solid #2a2f3f;
      border-radius: 7px; color: white; font-size: 0.82rem; flex: 1; min-width: 120px;
    }
    .post-btn {
      background: #7c3aed; color: white; border: none; border-radius: 7px;
      padding: 8px 16px; font-size: 0.88rem; font-weight: 500; cursor: pointer;
      display: inline-flex; align-items: center; transition: background 0.15s;
      white-space: nowrap; flex-shrink: 0;
    }
    .post-btn:hover:not(:disabled) { background: #6d28d9; }
    .post-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .comments { display: flex; flex-direction: column; gap: 12px; }
    .comment {
      background: #0f1422; border-radius: 10px;
      padding: 14px; border-left: 4px solid #7e8aa8;
    }
    .comment.ct-status-update    { border-left-color: #7c3aed; }
    .comment.ct-system-generated { border-left-color: #f59e0b; }
    .c-header {
      display: flex; align-items: flex-start; gap: 10px;
      margin-bottom: 10px; flex-wrap: wrap;
    }
    .c-av {
      width: 30px; height: 30px; min-width: 30px;
      background: #7c3aed; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; color: white; font-size: 0.72rem;
    }
    .c-meta { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .c-author { font-weight: 600; color: white; font-size: 0.85rem; }
    .c-time   { font-size: 0.65rem; color: #7e8aa8; }
    .c-type-pill {
      padding: 2px 7px; border-radius: 20px; font-size: 0.6rem;
      font-weight: 600; background: #1e2538; color: #a78bfa;
      white-space: nowrap; flex-shrink: 0;
    }
    .c-text { color: #e2e8f0; font-size: 0.87rem; line-height: 1.5; margin: 0; word-break: break-word; }
    .no-comments {
      text-align: center; padding: 20px; color: #7e8aa8;
      background: #0f1422; border-radius: 10px; font-style: italic;
    }

    /* ── STATUS CARD ──────────────────────────────────── */
    .status-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .status-lbl { color: #7e8aa8; font-size: 0.82rem; flex-shrink: 0; }
    .hint       { color: #7e8aa8; font-size: 0.78rem; margin-bottom: 8px; }
    .trans-btns { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .trans-btn {
      padding: 11px 12px; border-radius: 8px; font-size: 0.88rem; font-weight: 500;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      gap: 6px; background: #0f1422; color: #9aa4bf;
      border: 1px solid #2a2f3f; transition: all 0.13s;
      min-height: 44px; /* touch target */
    }
    .trans-btn:hover:not(:disabled) { border-color: #7c3aed; color: white; background: #1e2538; }
    .trans-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .done-msg  { color: #86efac; font-size: 0.82rem; text-align: center; padding: 6px 0; }
    .hint-warn { color: #ff8a8a; font-size: 0.75rem; margin-top: 8px; }

    /* ── AGENT CARD ───────────────────────────────────── */
    .agent-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .agent-av {
      width: 44px; height: 44px; min-width: 44px;
      background: #7c3aed; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; color: white;
    }
    .agent-name { font-weight: 600; color: white; font-size: 0.95rem; }
    .agent-sub  { font-size: 0.72rem; color: #7e8aa8; }
    .unassigned { color: #7e8aa8; font-style: italic; margin-bottom: 14px; }
    .assign-form { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
    .field {
      padding: 10px 12px; background: #0f1422; border: 1px solid #2a2f3f;
      border-radius: 8px; color: white; width: 100%; box-sizing: border-box;
      font-size: 0.88rem;
    }
    .field:focus { border-color: #7c3aed; outline: none; }
    .btn-assign {
      background: #7c3aed; color: white; border: none; border-radius: 8px;
      padding: 11px; cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 6px; font-weight: 500; font-size: 0.88rem;
      min-height: 44px; /* touch target */
    }
    .btn-assign:hover:not(:disabled) { background: #6d28d9; }
    .btn-assign:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── DATES CARD ───────────────────────────────────── */
    .date-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 0; border-bottom: 1px solid #2a2f3f;
    }
    .date-row.last { border-bottom: none; }
    .date-lbl { color: #7e8aa8; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .date-val { color: #e2e8f0; font-weight: 500; display: flex; align-items: center; gap: 7px; }
    .ov-val   { color: #ff8a8a !important; }
    .ov-chip  {
      font-size: 0.58rem; background: #7c3aed; color: white;
      padding: 2px 6px; border-radius: 20px; font-weight: 700;
    }

    /* ── SHARED BADGES ────────────────────────────────── */
    .pbadge {
      display: inline-block; padding: 3px 9px; border-radius: 4px;
      font-size: 0.67rem; font-weight: 700; flex-shrink: 0;
    }
    .p-critical { background: #2d1a1c; color: #ff8a8a; border: 1px solid #7c3aed; }
    .p-high     { background: #2d1a1c; color: #ffb3b3; border: 1px solid #7c3aed; }
    .p-medium   { background: #1e2538; color: #a78bfa; border: 1px solid #7c3aed; }
    .p-low      { background: #132b1e; color: #86efac; border: 1px solid #7c3aed; }

    .sbadge { padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
    .s-open        { background: #1e2538; color: #a78bfa; }
    .s-in-progress { background: #1e2538; color: #c4b5fd; }
    .s-blocked     { background: #2d1a1c; color: #ffb3b3; }
    .s-done        { background: #132b1e; color: #86efac; }

    .btn-primary {
      background: #7c3aed; color: white; border: none; border-radius: 7px;
      padding: 10px 22px; font-size: 0.88rem; cursor: pointer; font-weight: 500;
    }
    .btn-primary:hover { background: #6d28d9; }

    /* ── TABLET ───────────────────────────────────────── */
    @media (max-width: 1024px) {
      .layout { grid-template-columns: 1fr 260px; }
      .req-title { font-size: 1.5rem; }
    }

    /* ── MOBILE — stack sidebar below main ────────────── */
    @media (max-width: 768px) {
      .page   { padding: 18px 14px; }
      .layout {
        grid-template-columns: 1fr;
        /* sidebar appears after main on mobile */
      }
      .req-title { font-size: 1.3rem; }
      .c-row { flex-direction: column; }
      .c-type, .post-btn { width: 100%; }
    }

    /* ── SMALL MOBILE ─────────────────────────────────── */
    @media (max-width: 480px) {
      .page { padding: 14px 12px; }
      .card { padding: 16px; }
    }
  `]
})
export class RequestDetailComponent implements OnInit, OnDestroy {
  request?: Request;
  comments: Comment[] = [];
  agents: User[] = [];
  currentUser!: User;
  isAdmin = false;
  requestId: string | null = null;

  loading = true;
  updating = false;
  assigning = false;
  addingComment = false;
  selStatus: Status | null = null;

  newComment = '';
  commentType: 'General' | 'Status update' = 'General';
  selAgent = '';

  successMessage = '';
  errorMessage = '';

  private routeSub?: Subscription;
  private userSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSub = this.api.user$.subscribe(u => {
      this.currentUser = u;
      this.isAdmin = u.role === 'Admin';
    });
    this.routeSub = this.route.paramMap.subscribe(p => {
      const id = p.get('id');
      if (id) { this.requestId = id; this.loadAll(id); }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.userSub?.unsubscribe();
  }

  loadAll(id: string): void {
    this.loading = true;
    forkJoin({
      request:  this.api.getRequestById(id),
      agents:   this.api.getAgents(),
      comments: this.api.getComments(id)
    }).subscribe({
      next: ({ request, agents, comments }) => {
        this.request  = request;
        this.agents   = agents;
        this.comments = comments;
        this.selAgent = request.assignedAgentId ?? '';
        this.loading  = false;
      },
      error: () => {
        this.loading = false;
        this.showErr('Failed to load. Is the backend running on port 3000?');
      }
    });
  }

  reloadComments(): void {
    if (!this.requestId) return;
    this.api.getComments(this.requestId).subscribe({ next: c => this.comments = c });
  }

  goBack(): void { this.router.navigate(['/requests']); }

  cc(type: string): string { return 'ct-' + type.toLowerCase().replace(/\s+/g, '-'); }
  sc(s: string): string    { return 's-' + s.toLowerCase().replace(' ', '-'); }

  canChange(): boolean {
    if (this.isAdmin) return true;
    return !!this.request && this.request.assignedAgentId === this.currentUser.id;
  }

  transitions(): Status[] {
    return this.request ? (validTransitions[this.request.status] ?? []) : [];
  }

  tooltip(s: Status): string {
    if (s === 'Done' && !this.request?.assignedAgentId) return 'Cannot mark Done — unassigned';
    if (!this.canChange()) return 'Only assigned agent or admin can change status';
    return '';
  }

  isOv(): boolean { return this.request ? isOverdue(this.request) : false; }

  changeStatus(status: Status): void {
    if (!this.request || !this.canChange()) {
      this.showErr('Only the assigned agent or admin can change this status.'); return;
    }
    if (status === 'Done' && !this.request.assignedAgentId) {
      this.showErr('Cannot mark Done — request is unassigned.'); return;
    }
    this.updating = true; this.selStatus = status;
    const prev = this.request.status;

    this.api.updateStatus(this.request.id, status).subscribe({
      next: () => {
        this.request!.status    = status;
        this.request!.updatedAt = new Date().toISOString();
        this.updating = false; this.selStatus = null;
        this.showOk('Status → ' + status);
        this.api.addComment(
          this.request!.id,
          'Status changed from ' + prev + ' to ' + status + ' by ' + this.currentUser.name + '.',
          'System-generated'
        ).subscribe({ next: () => this.reloadComments() });
      },
      error: () => { this.updating = false; this.selStatus = null; this.showErr('Failed to update status.'); }
    });
  }

  assignAgent(): void {
    if (!this.request || !this.isAdmin) return;
    this.assigning = true;
    const prev = this.request.assignedAgentId;
    const next = this.selAgent || undefined;

    this.api.assignRequest(this.request.id, this.selAgent).subscribe({
      next: () => {
        this.request!.assignedAgentId = next;
        this.request!.updatedAt       = new Date().toISOString();
        this.assigning = false;
        const msg = !prev && next ? 'Assigned to ' + this.agentName(next)
                  : prev && !next ? 'Unassigned'
                  : 'Reassigned to ' + this.agentName(next!);
        this.showOk(msg + '.');
        this.api.addComment(this.request!.id, msg + ' by ' + this.currentUser.name + '.', 'System-generated')
          .subscribe({ next: () => this.reloadComments() });
      },
      error: () => { this.assigning = false; this.showErr('Failed to assign agent.'); }
    });
  }

  addComment(): void {
    if (!this.newComment.trim() || !this.request) return;
    this.addingComment = true;
    this.api.addComment(this.request.id, this.newComment.trim(), this.commentType).subscribe({
      next: () => { this.newComment = ''; this.addingComment = false; this.reloadComments(); },
      error: () => { this.addingComment = false; this.showErr('Failed to post comment.'); }
    });
  }

  agentName(id: string): string {
    return this.agents.find(a => a.id === id)?.name ?? id;
  }
  agentInitials(id: string): string {
    return this.agentName(id).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  private showOk(m: string):  void { this.successMessage = m; setTimeout(() => this.successMessage = '', 5000); }
  private showErr(m: string): void { this.errorMessage   = m; setTimeout(() => this.errorMessage   = '', 5000); }
}