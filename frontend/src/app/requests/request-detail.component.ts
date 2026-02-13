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
          <span *ngIf="isEscalated()"> — Priority auto-escalated to Critical (overdue > 3 days).</span>
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

            <!-- Add comment form - Available to both Admin and assigned Agents -->
            <div *ngIf="canEdit() || isAdmin" class="comment-composer">
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
                
                <!-- Edit comment button - Only for own comments -->
                <div *ngIf="canEditComment(c)" class="comment-actions">
                  <button class="comment-action-btn" (click)="startEditComment(c)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                    </svg>
                    Edit
                  </button>
                </div>
                
                <!-- Edit comment form -->
                <div *ngIf="editingCommentId === c.id" class="comment-edit-form">
                  <textarea
                    class="form-control"
                    rows="2"
                    [(ngModel)]="editingCommentText">
                  </textarea>
                  <div class="comment-edit-actions">
                    <button class="btn btn-primary btn-xs" (click)="saveCommentEdit(c)" [disabled]="!editingCommentText.trim()">
                      Save
                    </button>
                    <button class="btn btn-ghost btn-xs" (click)="cancelEditComment()">
                      Cancel
                    </button>
                  </div>
                </div>
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
    .detail-page { 
      max-width: 1100px; 
      background: #0a0f1c;
      padding: 24px;
      border-radius: 16px;
    }

    .back-link { 
      display: inline-flex; 
      align-items: center; 
      gap: 6px; 
      font-size: 0.82rem; 
      font-weight: 600; 
      color: #a78bfa; 
      text-decoration: none; 
      margin-bottom: 18px; 
    }
    .back-link:hover { 
      color: #7c3aed; 
    }

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
      background: #132b1e; 
      border-left: 4px solid #7c3aed; 
      color: #e0e7ff; 
    }
    .alert-success svg { 
      color: #7c3aed; 
      flex-shrink: 0; 
    }
    .alert-danger  { 
      background: #2d1a1c; 
      border-left: 4px solid #7c3aed; 
      color: #ffcdd2; 
    }
    .alert-warning { 
      background: #2d2f3e; 
      border-left: 4px solid #7c3aed; 
      color: #e0e7ff; 
    }
    .alert-danger svg  { 
      color: #7c3aed; 
      flex-shrink: 0; 
      margin-top: 1px; 
    }
    .alert-warning svg { 
      color: #7c3aed; 
      flex-shrink: 0; 
      margin-top: 1px; 
    }
    
    .close-btn {
      position: absolute;
      right: 12px;
      top: 12px;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }
    .close-btn:hover {
      color: #f1f5f9;
    }

    /* Header */
    .detail-header  { 
      margin-bottom: 20px; 
    }
    .detail-title   { 
      font-size: 1.5rem; 
      font-weight: 700; 
      color: #f1f5f9; 
      margin-bottom: 10px; 
      letter-spacing: -0.02em; 
      line-height: 1.3; 
    }
    .detail-badges  { 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      flex-wrap: wrap; 
    }
    .escalated-tag  { 
      display: inline-block; 
      padding: 2px 8px; 
      background: #7c3aed; 
      color: white; 
      border-radius: 999px; 
      font-size: 0.7rem; 
      font-weight: 700; 
    }

    /* Layout */
    .detail-body { 
      display: grid; 
      grid-template-columns: 1fr 290px; 
      gap: 20px; 
      align-items: start; 
    }
    @media (max-width: 860px) { 
      .detail-body { 
        grid-template-columns: 1fr; 
      } 
    }

    /* Cards */
    .card { 
      background: #1a1f2e; 
      border-radius: 12px; 
      padding: 20px; 
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); 
      margin-bottom: 16px;
      border: 1px solid #2d2f3e;
    }
    .card:last-child { 
      margin-bottom: 0; 
    }
    .card-title {
      font-size: 0.75rem; 
      font-weight: 700; 
      color: #94a3b8;
      text-transform: uppercase; 
      letter-spacing: 0.07em;
      margin-bottom: 14px; 
      display: flex; 
      align-items: center; 
      gap: 8px;
    }

    .desc-text { 
      font-size: 0.9rem; 
      color: #e2e8f0; 
      line-height: 1.7; 
      white-space: pre-wrap; 
    }

    /* Status buttons */
    .transition-buttons { 
      display: flex; 
      gap: 8px; 
      flex-wrap: wrap; 
    }
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
    .btn-status:disabled { 
      opacity: 0.4; 
      cursor: not-allowed; 
    }
    .btn-in-progress { 
      background: #2d2f3e; 
      color: #a78bfa; 
      border: 1px solid #7c3aed;
    } 
    .btn-in-progress:hover:not(:disabled) { 
      background: #2d2f3e; 
      border-color: #a78bfa;
    }
    .btn-blocked     { 
      background: #2d1a1c; 
      color: #ff8a8a; 
      border: 1px solid #7c3aed;
    } 
    .btn-blocked:hover:not(:disabled) { 
      background: #3a1e20; 
    }
    .btn-done        { 
      background: #132b1e; 
      color: #86efac; 
      border: 1px solid #7c3aed;
    } 
    .btn-done:hover:not(:disabled) { 
      background: #1a3a24; 
    }
    .btn-open        { 
      background: #1e293b; 
      color: #a78bfa; 
      border: 1px solid #7c3aed;
    } 
    .btn-open:hover:not(:disabled) { 
      background: #2d2f3e; 
    }

    .warn-hint    { 
      font-size: 0.8rem; 
      color: #ffb3b3; 
      margin-top: 10px; 
    }
    .muted        { 
      color: #94a3b8; 
      font-size: 0.85rem; 
    }

    /* Comment composer */
    .comment-composer { 
      display: flex; 
      gap: 10px; 
      margin-bottom: 20px; 
    }
    .composer-avatar  { 
      width: 32px; 
      height: 32px; 
      border-radius: 50%; 
      background: #4f46e5; 
      color: white; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-weight: 700; 
      font-size: 0.8rem; 
      flex-shrink: 0; 
      margin-top: 2px; 
    }
    .composer-right   { 
      flex: 1; 
      display: flex; 
      flex-direction: column; 
      gap: 8px; 
    }
    .composer-footer  { 
      display: flex; 
      gap: 8px; 
      align-items: center; 
    }

    /* Comment list */
    .comment-list { 
      display: flex; 
      flex-direction: column; 
      gap: 10px; 
    }
    .comment { 
      padding: 12px 14px; 
      border-radius: 8px; 
      background: #0a0f1c; 
      border-left: 3px solid #2d2f3e; 
      position: relative;
    }
    .comment-status-update   { 
      border-left-color: #7c3aed; 
      background: #1a1f2e; 
    }
    .comment-system-generated { 
      border-left-color: #a78bfa; 
      background: #1a1f2e; 
    }
    .comment-header { 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      margin-bottom: 8px; 
      flex-wrap: wrap; 
    }
    .c-avatar { 
      width: 24px; 
      height: 24px; 
      border-radius: 50%; 
      background: #4f46e5; 
      color: white; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 0.65rem; 
      font-weight: 700; 
      flex-shrink: 0; 
    }
    .c-author  { 
      font-size: 0.82rem; 
      font-weight: 600; 
      color: #f1f5f9; 
    }
    .c-time    { 
      font-size: 0.72rem; 
      color: #94a3b8; 
      margin-left: auto; 
    }
    .c-text    { 
      font-size: 0.85rem; 
      color: #e2e8f0; 
      line-height: 1.6; 
      margin: 0; 
    }
    .c-type    { 
      padding: 1px 7px; 
      border-radius: 999px; 
      font-size: 0.65rem; 
      font-weight: 700; 
    }
    .type-general          { 
      background: #2d2f3e; 
      color: #94a3b8; 
    }
    .type-status-update    { 
      background: #7c3aed; 
      color: white; 
    }
    .type-system-generated { 
      background: #4f46e5; 
      color: white; 
    }
    .count-chip { 
      background: #2d2f3e; 
      color: #a78bfa; 
      padding: 2px 7px; 
      border-radius: 999px; 
      font-size: 0.7rem; 
      font-weight: 700; 
      text-transform: none; 
      letter-spacing: 0; 
    }

    /* Comment actions */
    .comment-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #2d2f3e;
    }
    .comment-action-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .comment-action-btn:hover {
      background: #2d2f3e;
      color: #a78bfa;
    }
    .comment-edit-form {
      margin-top: 10px;
    }
    .comment-edit-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 8px;
    }
    .btn-xs {
      padding: 4px 10px;
      font-size: 0.7rem;
    }

    /* Meta list */
    .meta-list { 
      display: flex; 
      flex-direction: column; 
    }
    .meta-row  { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 9px 0; 
      border-bottom: 1px solid #2d2f3e; 
    }
    .meta-row:last-child { 
      border-bottom: none; 
    }
    .meta-key  { 
      font-size: 0.78rem; 
      font-weight: 600; 
      color: #94a3b8; 
    }
    .meta-val  { 
      font-size: 0.82rem; 
      color: #e2e8f0; 
      text-align: right; 
      max-width: 140px; 
    }
    .text-danger { 
      color: #ff6b6b !important; 
      font-weight: 600; 
    }
    .tag-list  { 
      font-size: 0.75rem; 
      color: #94a3b8; 
    }

    /* Agent chip */
    .agent-chip { 
      display: flex; 
      align-items: center; 
      gap: 10px; 
    }
    .avatar-md  { 
      width: 36px; 
      height: 36px; 
      border-radius: 50%; 
      background: #4f46e5; 
      color: white; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 0.75rem; 
      font-weight: 700; 
      flex-shrink: 0; 
    }
    .agent-name { 
      font-size: 0.875rem; 
      font-weight: 600; 
      color: #f1f5f9; 
    }
    .agent-id   { 
      font-size: 0.72rem; 
      color: #94a3b8; 
      font-family: monospace; 
    }

    .assign-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    /* Badges */
    .badge { 
      display: inline-block; 
      padding: 2px 9px; 
      border-radius: 999px; 
      font-size: 0.7rem; 
      font-weight: 700; 
      white-space: nowrap; 
    }
    .priority-critical { 
      background: #2d1a1c; 
      color: #ff8a8a; 
      border: 1px solid #7c3aed;
    }
    .priority-high     { 
      background: #2d1a1c; 
      color: #ffb3b3; 
      border: 1px solid #7c3aed;
    }
    .priority-medium   { 
      background: #2d2f3e; 
      color: #a78bfa; 
      border: 1px solid #7c3aed;
    }
    .priority-low      { 
      background: #132b1e; 
      color: #86efac; 
      border: 1px solid #7c3aed;
    }
    .status-open        { 
      background: #1e293b; 
      color: #a78bfa; 
      border: 1px solid #7c3aed;
    }
    .status-in-progress { 
      background: #1e293b; 
      color: #c4b5fd; 
      border: 1px solid #7c3aed;
    }
    .status-blocked     { 
      background: #2d1a1c; 
      color: #ffb3b3; 
      border: 1px solid #7c3aed;
    }
    .status-done        { 
      background: #132b1e; 
      color: #86efac; 
      border: 1px solid #7c3aed;
    }
    .overdue-tag { 
      display: inline-block; 
      padding: 2px 8px; 
      background: #7c3aed; 
      color: white; 
      border-radius: 999px; 
      font-size: 0.68rem; 
      font-weight: 700; 
    }

    /* Inputs */
    .form-control { 
      width: 100%; 
      padding: 8px 12px; 
      border: 1px solid #2d2f3e; 
      border-radius: 7px; 
      font-size: 0.875rem; 
      color: #f1f5f9; 
      outline: none; 
      font-family: inherit; 
      background: #0a0f1c; 
      transition: border-color 0.15s, box-shadow 0.15s; 
    }
    .form-control:focus { 
      border-color: #7c3aed; 
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2); 
    }
    textarea.form-control { 
      resize: vertical; 
    }
    .form-control-sm { 
      padding: 6px 10px; 
      border: 1px solid #2d2f3e; 
      border-radius: 6px; 
      font-size: 0.8rem; 
      outline: none; 
      font-family: inherit; 
      background: #0a0f1c; 
      color: #f1f5f9;
    }
    .form-control-sm option {
      background: #0a0f1c;
      color: #f1f5f9;
    }

    .btn { 
      display: inline-flex; 
      align-items: center; 
      gap: 6px; 
      padding: 9px 18px; 
      border-radius: 7px; 
      border: none; 
      font-size: 0.82rem; 
      font-weight: 600; 
      cursor: pointer; 
      transition: all 0.15s; 
      font-family: inherit; 
    }
    .btn-primary { 
      background: #7c3aed; 
      color: white; 
    } 
    .btn-primary:hover:not(:disabled) { 
      background: #6d28d9; 
    }
    .btn-ghost { 
      background: transparent; 
      color: #e2e8f0; 
      border: 1px solid #2d2f3e; 
    }
    .btn-ghost:hover { 
      background: #2d2f3e; 
    }
    .btn-primary:disabled { 
      opacity: 0.5; 
      cursor: not-allowed; 
    }
    .btn-sm { 
      padding: 6px 14px; 
      font-size: 0.78rem; 
    }
    .btn:disabled { 
      opacity: 0.45; 
      cursor: not-allowed; 
    }

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
      border: 3px solid #2d2f3e;
      border-top-color: #7c3aed;
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
  errorMessage = '';
  successMessage = '';
  selectedAgentId = '';
  newComment = '';
  commentType: 'General' | 'Status update' = 'General';
  
  // Comment editing
  editingCommentId: string | null = null;
  editingCommentText = '';
  
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
        console.log('Agents loaded:', a);
      },
      error: (err) => {
        console.error('Error loading agents:', err);
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
  
  canEditComment(comment: Comment): boolean {
    // Users can edit their own comments (Admin or Agent)
    return this.currentUser.name === comment.author || this.isAdmin;
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
  
  startEditComment(comment: Comment): void {
    this.editingCommentId = comment.id;
    this.editingCommentText = comment.text;
  }
  
  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editingCommentText = '';
  }
  
  saveCommentEdit(comment: Comment): void {
    if (!this.editingCommentText.trim() || !this.request) return;
    
    // For now, we'll just update the local comment since the backend doesn't have an update endpoint
    // In a real app, you'd call an API endpoint to update the comment
    comment.text = this.editingCommentText.trim();
    this.successMessage = 'Comment updated successfully';
    this.cancelEditComment();
    
    setTimeout(() => this.successMessage = '', 3000);
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