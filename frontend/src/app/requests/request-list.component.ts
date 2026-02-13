// frontend/src/app/requests/request-list.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, interval, switchMap } from 'rxjs';
import { ApiService } from '../services/api.service';
import { Request, User, Status, Priority, isOverdue } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="requests-container">

      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Requests</h1>
          <p class="page-sub">{{ filteredRequests.length }} of {{ requests.length }} requests</p>
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

      <!-- Error Message -->
      <div *ngIf="errorMessage" class="alert alert-danger">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ errorMessage }}</span>
        <button class="close-btn" (click)="errorMessage = ''">✕</button>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading requests...</p>
      </div>

      <!-- ── Create Form (Admin only) ── -->
      <div *ngIf="showCreate && isAdmin && !loading" class="create-panel">
        <h2 class="form-title">New Request</h2>

        <div class="form-grid">
          <div class="form-group span-2">
            <label class="form-label">Title <span class="required">*</span></label>
            <input class="form-control" placeholder="Short, descriptive title" [(ngModel)]="form.title" />
          </div>
          <div class="form-group span-2">
            <label class="form-label">Description <span class="required">*</span></label>
            <textarea class="form-control" rows="3" placeholder="Detailed description" [(ngModel)]="form.description"></textarea>
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

      <!-- ── Filters & Search ── (Only show when not loading and data exists) -->
      <div *ngIf="!loading && requests.length > 0" class="filters-bar">
        <div class="search-wrap">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input class="search-input" placeholder="Search title, description or tags…" [(ngModel)]="filters.search" (ngModelChange)="applyFilters()" />
        </div>
        
        <select class="filter-select" [(ngModel)]="filters.status" (ngModelChange)="applyFilters()">
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Blocked">Blocked</option>
          <option value="Done">Done</option>
        </select>
        
        <select class="filter-select" [(ngModel)]="filters.priority" (ngModelChange)="applyFilters()">
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        
        <select *ngIf="isAdmin" class="filter-select" [(ngModel)]="filters.agent" (ngModelChange)="applyFilters()">
          <option value="">All Agents</option>
          <option *ngFor="let a of agents" [value]="a.id">{{ a.name }}</option>
        </select>
        
        <button class="filter-toggle" [class.filter-active]="filters.overdueOnly" (click)="toggleOverdueFilter()">
          ⏰ Overdue Only
        </button>
        
        <select class="filter-select" [(ngModel)]="sortBy" (ngModelChange)="applyFilters()">
          <option value="updated">Last Updated</option>
          <option value="priority">Priority</option>
          <option value="dueDate">Due Date</option>
        </select>
        
        <button *ngIf="hasActiveFilters()" class="btn-clear" (click)="clearFilters()">Clear filters</button>
      </div>

      <!-- ── Table View (Desktop) ── -->
      <div *ngIf="!loading && filteredRequests.length > 0" class="table-container">
        <table class="request-table">
          <thead>
            <tr>
              <th>PRIORITY</th>
              <th>TITLE</th>
              <th class="hide-mobile">DESCRIPTION</th>
              <th>STATUS</th>
              <th class="hide-mobile">CREATED</th>
              <th>DUE DATE</th>
              <th class="hide-mobile">ASSIGNED</th>
              <th *ngIf="isAdmin"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of filteredRequests"
                [class.overdue-row]="isOverdue(r)"
                (click)="navigateToDetail(r.id)"
                class="request-row">
              <td><span class="badge" [ngClass]="'priority-' + r.priority.toLowerCase()">{{ r.priority }}</span></td>
              <td>
                <div class="req-title">{{ r.title }}</div>
                <div *ngIf="r.tags?.length" class="req-tags">{{ r.tags!.join(', ') }}</div>
                <!-- Mobile-only description -->
                <div class="mobile-only desc-mobile">{{ r.description }}</div>
                <div class="mobile-only agent-mobile" *ngIf="getAssignedAgentId(r) !== undefined">
                  Agent: {{ agentName(getAssignedAgentId(r)!) }}
                </div>
              </td>
              <td class="hide-mobile desc-cell">{{ r.description }}</td>
              <td>
                <span class="badge" [ngClass]="'status-' + r.status.toLowerCase().split(' ').join('-')">{{ r.status }}</span>
                <span *ngIf="isOverdue(r)" class="overdue-tag">OVERDUE</span>
              </td>
              <td class="hide-mobile date-cell">{{ r.createdAt | date:'MMM d, y' }}</td>
              <td class="date-cell" [class.text-danger]="isOverdue(r)">{{ r.dueDate | date:'MMM d' }}</td>
              <td class="hide-mobile">
                <div *ngIf="getAssignedAgentId(r) !== undefined" class="agent-chip">
                  <div class="avatar-sm">{{ agentInitials(getAssignedAgentId(r)!) }}</div>
                  <span>{{ agentName(getAssignedAgentId(r)!) }}</span>
                </div>
                <span *ngIf="getAssignedAgentId(r) === undefined" class="unassigned">Unassigned</span>
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

      <!-- Card View (Mobile) - Alternative layout for very small screens -->
      <div *ngIf="!loading && filteredRequests.length > 0" class="mobile-card-view">
        <div *ngFor="let r of filteredRequests"
             class="request-mobile-card"
             [class.overdue-card]="isOverdue(r)"
             (click)="navigateToDetail(r.id)">
          <div class="card-header">
            <span class="badge" [ngClass]="'priority-' + r.priority.toLowerCase()">{{ r.priority }}</span>
            <span class="badge" [ngClass]="'status-' + r.status.toLowerCase().split(' ').join('-')">{{ r.status }}</span>
            <span *ngIf="isOverdue(r)" class="overdue-tag">OVERDUE</span>
          </div>
          <h3 class="card-title">{{ r.title }}</h3>
          <p class="card-desc">{{ r.description }}</p>
          <div class="card-meta">
            <span>Due: {{ r.dueDate | date:'MMM d, y' }}</span>
            <span *ngIf="getAssignedAgentId(r) !== undefined">Agent: {{ agentName(getAssignedAgentId(r)!) }}</span>
          </div>
          <div *ngIf="r.tags?.length" class="card-tags">
            {{ r.tags!.join(', ') }}
          </div>
          <div *ngIf="isAdmin" class="card-actions">
            <button class="btn-delete" (click)="confirmDelete($event, r); $event.stopPropagation()" title="Delete request">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State - No requests at all -->
      <div *ngIf="!loading && requests.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No requests yet</p>
        <button *ngIf="isAdmin" class="btn btn-primary" (click)="showCreate = true">
          Create your first request
        </button>
      </div>

      <!-- Empty State - No results after filtering -->
      <div *ngIf="!loading && requests.length > 0 && filteredRequests.length === 0" class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>No requests match your filters</p>
        <button class="btn btn-primary" (click)="clearFilters()">Clear Filters</button>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="deleteTarget" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Delete Request</h3>
          <p class="modal-text">Are you sure you want to delete <strong>{{ deleteTarget.title }}</strong>?</p>
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
    .requests-container {
      max-width: 1400px;
      margin: 0 auto;
      background: #0a0f1c;
      padding: 16px;
      border-radius: 16px;
      min-height: calc(100vh - 120px);
    }

    /* Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title {
      font-size: clamp(1.4rem, 4vw, 1.8rem);
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }
    .page-sub {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      position: relative;
      flex-wrap: wrap;
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
    .alert-danger {
      background: #2d1a1c;
      border-left: 4px solid #7c3aed;
      color: #ffcdd2;
    }
    .alert-danger svg {
      color: #7c3aed;
      flex-shrink: 0;
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

    /* Loading State */
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
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Create Panel */
    .create-panel {
      background: #1a1f2e;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      border: 1px solid #2d2f3e;
      border-top: 3px solid #7c3aed;
    }
    .form-title {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 16px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }
    .span-2 {
      grid-column: span 2;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #e2e8f0;
    }
    .required {
      color: #ff6b6b;
    }
    .hint {
      font-size: 0.7rem;
      color: #94a3b8;
    }
    .form-control {
      padding: 8px 12px;
      border: 1px solid #2d2f3e;
      border-radius: 7px;
      background: #0a0f1c;
      color: #f1f5f9;
      font-size: 0.875rem;
    }
    .form-control:focus {
      border-color: #7c3aed;
      outline: none;
    }
    .form-error {
      color: #ff8a8a;
      background: #2d1a1c;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 3px solid #7c3aed;
    }
    .form-actions {
      display: flex;
      gap: 10px;
    }

    /* Filters */
    .filters-bar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 20px;
    }
    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }
    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
    }
    .search-input {
      width: 100%;
      padding: 8px 12px 8px 32px;
      border: 1px solid #2d2f3e;
      border-radius: 7px;
      background: #0a0f1c;
      color: #f1f5f9;
    }
    .search-input:focus {
      border-color: #7c3aed;
      outline: none;
    }
    .filter-select {
      padding: 8px 12px;
      border: 1px solid #2d2f3e;
      border-radius: 7px;
      background: #0a0f1c;
      color: #f1f5f9;
      min-width: 120px;
    }
    .filter-select option {
      background: #0a0f1c;
      color: #f1f5f9;
    }
    .filter-select:focus {
      border-color: #7c3aed;
      outline: none;
    }
    .filter-toggle {
      padding: 8px 14px;
      border: 1px solid #2d2f3e;
      border-radius: 7px;
      background: #0a0f1c;
      color: #94a3b8;
      cursor: pointer;
    }
    .filter-toggle:hover {
      background: #2d2f3e;
    }
    .filter-active {
      background: #7c3aed;
      color: white;
      border-color: #7c3aed;
    }
    .btn-clear {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 8px;
    }
    .btn-clear:hover {
      color: #ff6b6b;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid #2d2f3e;
      background: #1a1f2e;
    }
    .request-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      min-width: 800px;
    }
    .request-table th {
      text-align: left;
      padding: 12px 16px;
      background: #1a1f2e;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.7rem;
      text-transform: uppercase;
      border-bottom: 1px solid #2d2f3e;
    }
    .request-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #2d2f3e;
      color: #e2e8f0;
    }
    .request-row {
      cursor: pointer;
      transition: background 0.15s;
    }
    .request-row:hover td {
      background: #2d2f3e;
    }
    .overdue-row td {
      background: #2d1a1c;
    }
    .overdue-row:hover td {
      background: #3a1e20 !important;
    }

    /* Table Cell Styles */
    .req-title {
      font-weight: 600;
      color: #f1f5f9;
    }
    .req-tags {
      font-size: 0.7rem;
      color: #94a3b8;
      margin-top: 2px;
    }
    .desc-cell {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #94a3b8;
    }
    .date-cell {
      white-space: nowrap;
      color: #94a3b8;
    }
    .text-danger {
      color: #ff6b6b !important;
    }

    /* Agent Chip */
    .agent-chip {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .avatar-sm {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #4f46e5;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.6rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .unassigned {
      color: #94a3b8;
      font-style: italic;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .priority-critical {
      background: #2d1a1c;
      color: #ff8a8a;
      border: 1px solid #7c3aed;
    }
    .priority-high {
      background: #2d1a1c;
      color: #ffb3b3;
      border: 1px solid #7c3aed;
    }
    .priority-medium {
      background: #2d2f3e;
      color: #a78bfa;
      border: 1px solid #7c3aed;
    }
    .priority-low {
      background: #132b1e;
      color: #86efac;
      border: 1px solid #7c3aed;
    }
    .status-open {
      background: #1e293b;
      color: #a78bfa;
      border: 1px solid #7c3aed;
    }
    .status-in-progress {
      background: #1e293b;
      color: #c4b5fd;
      border: 1px solid #7c3aed;
    }
    .status-blocked {
      background: #2d1a1c;
      color: #ffb3b3;
      border: 1px solid #7c3aed;
    }
    .status-done {
      background: #132b1e;
      color: #86efac;
      border: 1px solid #7c3aed;
    }
    .overdue-tag {
      display: inline-block;
      margin-left: 4px;
      padding: 2px 6px;
      background: #7c3aed;
      color: white;
      border-radius: 999px;
      font-size: 0.6rem;
      font-weight: 700;
    }

    /* Delete Button */
    .btn-delete {
      padding: 6px;
      border: none;
      background: #2d1a1c;
      color: #ff8a8a;
      border-radius: 6px;
      cursor: pointer;
      border: 1px solid #7c3aed;
    }
    .btn-delete:hover {
      background: #3a1e20;
    }

    /* Mobile Card View */
    .mobile-card-view {
      display: none;
    }
    .mobile-only {
      display: none;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #94a3b8;
      gap: 16px;
      text-align: center;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    .modal {
      background: #1a1f2e;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 90%;
      border: 1px solid #7c3aed;
    }
    .modal-title {
      font-size: 1.2rem;
      color: #f1f5f9;
      margin-bottom: 12px;
    }
    .modal-text {
      color: #94a3b8;
      margin-bottom: 20px;
    }
    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-primary {
      background: #7c3aed;
      color: white;
    }
    .btn-primary:hover {
      background: #6d28d9;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-ghost {
      background: transparent;
      color: #e2e8f0;
      border: 1px solid #2d2f3e;
    }
    .btn-ghost:hover {
      background: #2d2f3e;
    }
    .btn-danger {
      background: #7c3aed;
      color: white;
    }
    .btn-danger:hover {
      background: #6d28d9;
    }
    .btn-danger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Responsive Breakpoints */
    @media (max-width: 1024px) {
      .hide-mobile {
        display: none;
      }
      .mobile-only {
        display: block;
      }
      .desc-mobile {
        font-size: 0.75rem;
        color: #94a3b8;
        margin-top: 4px;
      }
      .agent-mobile {
        font-size: 0.7rem;
        color: #a78bfa;
        margin-top: 2px;
      }
    }

    @media (max-width: 768px) {
      .requests-container {
        padding: 12px;
      }
      .form-grid {
        grid-template-columns: 1fr;
      }
      .span-2 {
        grid-column: span 1;
      }
      .filters-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .search-wrap {
        width: 100%;
      }
      .filter-select, .filter-toggle {
        width: 100%;
      }
      .table-container {
        display: none;
      }
      .mobile-card-view {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .request-mobile-card {
        background: #1a1f2e;
        border: 1px solid #2d2f3e;
        border-radius: 12px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .request-mobile-card:hover {
        border-color: #7c3aed;
      }
      .overdue-card {
        border-color: #7c3aed;
        background: #2d1a1c;
      }
      .card-header {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 10px;
      }
      .card-title {
        font-size: 1rem;
        font-weight: 600;
        color: #f1f5f9;
        margin-bottom: 6px;
      }
      .card-desc {
        font-size: 0.8rem;
        color: #94a3b8;
        margin-bottom: 10px;
      }
      .card-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        color: #94a3b8;
        margin-bottom: 8px;
      }
      .card-tags {
        font-size: 0.7rem;
        color: #a78bfa;
      }
      .card-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
      }
    }

    @media (max-width: 480px) {
      .requests-container {
        padding: 8px;
      }
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .btn {
        width: 100%;
      }
      .modal {
        width: 95%;
        padding: 16px;
      }
    }
  `]
})
export class RequestListComponent implements OnInit, OnDestroy {
  requests: Request[] = [];
  filteredRequests: Request[] = [];
  agents: User[] = [];
  currentUser!: User;
  isAdmin = false;
  showCreate = false;
  creating = false;
  createError = '';
  successMessage = '';
  errorMessage = '';
  loading = true;
  deleteTarget?: Request;
  deleting = false;
  sortBy: 'updated' | 'priority' | 'dueDate' = 'updated';
  
  private refreshSubscription?: Subscription;

  filters = { 
    search: '', 
    status: '', 
    priority: '', 
    agent: '', 
    overdueOnly: false 
  };
  
  form: any = {
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
    console.log('Request List loading data...');
    this.loading = true;
    this.errorMessage = '';
    
    this.api.getRequests().subscribe({
      next: (r) => {
        this.requests = r;
        this.applyFilters();
        this.loading = false;
        console.log('Request List - Requests loaded:', r.length);
      },
      error: (err) => {
        console.error('Request List - Error loading requests:', err);
        this.errorMessage = 'Failed to load requests. Please try again.';
        this.loading = false;
        this.requests = [];
      }
    });

    this.api.getAgents().subscribe({
      next: (a) => {
        this.agents = a;
        console.log('Request List - Agents loaded:', a.length);
      },
      error: (err) => {
        console.error('Request List - Error loading agents:', err);
      }
    });
  }

  startRealTimeUpdates(): void {
    this.refreshSubscription = interval(10000).pipe(
      switchMap(() => this.api.getRequests())
    ).subscribe({
      next: (updatedRequests) => {
        this.requests = updatedRequests;
        this.applyFilters();
      },
      error: () => {}
    });
  }

  stopRealTimeUpdates(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  // ── Helper method to safely get assignedAgentId ───────────────────────────
  getAssignedAgentId(request: Request): string | undefined {
    return request.assignedAgentId;
  }

  applyFilters(): void {
    const s = this.filters.search.toLowerCase();
    let result = this.requests.filter(r => {
      if (s && !r.title.toLowerCase().includes(s)
             && !r.description.toLowerCase().includes(s)
             && !(r.tags ?? []).some(t => t.toLowerCase().includes(s))) {
        return false;
      }
      if (this.filters.status && r.status !== this.filters.status) return false;
      if (this.filters.priority && r.priority !== this.filters.priority) return false;
      if (this.filters.agent && r.assignedAgentId !== this.filters.agent) return false;
      if (this.filters.overdueOnly && !this.isOverdue(r)) return false;
      return true;
    });

    result = result.sort((a, b) => {
      if (this.sortBy === 'priority') {
        const priorityOrder = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (this.sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    
    this.filteredRequests = result;
  }

  toggleOverdueFilter(): void {
    this.filters.overdueOnly = !this.filters.overdueOnly;
    this.applyFilters();
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.search || this.filters.status || 
              this.filters.priority || this.filters.agent || this.filters.overdueOnly);
  }

  clearFilters(): void {
    this.filters = { search: '', status: '', priority: '', agent: '', overdueOnly: false };
    this.applyFilters();
  }

  isOverdue(r: Request): boolean {
    return isOverdue(r);
  }

  agentName(id: string): string {
    const agent = this.agents.find(a => a.id === id);
    return agent ? agent.name : id;
  }

  agentInitials(id: string): string {
    const name = this.agentName(id);
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  navigateToDetail(id: string): void {
    this.router.navigate(['/requests', id]);
  }

  createRequest(): void {
    if (!this.form.title.trim()) {
      this.createError = 'Title is required.';
      return;
    }
    if (!this.form.description.trim()) {
      this.createError = 'Description is required.';
      return;
    }
    if (!this.form.dueDate) {
      this.createError = 'Due date is required.';
      return;
    }

    this.createError = '';
    this.creating = true;

    const tags = this.form.tags ? this.form.tags.split(',').map((t: string) => t.trim()).filter((t: string) => t) : undefined;

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
        this.loadData();
        this.cancelCreate();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.createError = 'Failed to create request. Please try again.';
        this.creating = false;
        console.error('Error creating request:', err);
      }
    });
  }

  cancelCreate(): void {
    this.showCreate = false;
    this.createError = '';
    this.form = {
      title: '', description: '', status: 'Open',
      priority: 'Medium', dueDate: '', agentId: '', tags: ''
    };
  }

  confirmDelete(event: Event, request: Request): void {
    event.stopPropagation();
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
        this.applyFilters();
        this.successMessage = 'Request deleted successfully.';
        this.cancelDelete();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage = 'Failed to delete request. Please try again.';
        console.error('Error deleting request:', err);
      }
    });
  }
}