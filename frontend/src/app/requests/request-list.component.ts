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
    <div class="requests-page">

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

      <!-- ── Table ── -->
      <div class="panel">

        <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading requests...</p>
        </div>

        <div *ngIf="!loading && filteredRequests.length === 0" class="empty-state">
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

        <table *ngIf="!loading && filteredRequests.length > 0" class="table">
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
            <tr *ngFor="let r of filteredRequests"
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
    .requests-page { 
      max-width: 1300px; 
      background: #0a0f1c;
      padding: 24px;
      border-radius: 16px;
    }

    .page-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 20px; 
    }
    .page-title  { 
      font-size: 1.6rem; 
      font-weight: 700; 
      color: #f1f5f9; 
      margin-bottom: 4px; 
      letter-spacing: -0.02em; 
    }
    .page-sub    { 
      font-size: 0.8rem; 
      color: #94a3b8; 
    }

    /* Success Message */
    .alert-success { 
      background: #132b1e; 
      border-left: 4px solid #7c3aed; 
      color: #e0e7ff; 
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      position: relative;
    }
    .alert-success svg { 
      color: #7c3aed; 
      flex-shrink: 0; 
    }
    
    .alert-danger { 
      background: #2d1a1c; 
      border-left: 4px solid #7c3aed; 
      color: #ffcdd2; 
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      position: relative;
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

    /* Create panel */
    .create-panel {
      background: #1a1f2e; 
      border-radius: 12px; 
      padding: 24px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); 
      margin-bottom: 20px;
      border-top: 3px solid #7c3aed;
      border: 1px solid #2d2f3e;
    }
    .form-title { 
      font-size: 1rem; 
      font-weight: 700; 
      color: #f1f5f9; 
      margin-bottom: 18px; 
    }
    .form-grid  { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 14px 20px; 
      margin-bottom: 16px; 
    }
    .span-2     { 
      grid-column: span 2; 
    }
    .form-group { 
      display: flex; 
      flex-direction: column; 
      gap: 5px; 
    }
    .form-label { 
      font-size: 0.78rem; 
      font-weight: 600; 
      color: #e2e8f0; 
    }
    .required   { 
      color: #ff6b6b; 
    }
    .hint       { 
      color: #94a3b8; 
      font-weight: 400; 
    }
    .form-error { 
      color: #ff8a8a; 
      font-size: 0.8rem; 
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

    /* Filters */
    .filters-bar { 
      display: flex; 
      gap: 10px; 
      flex-wrap: wrap; 
      align-items: center; 
      margin-bottom: 16px; 
    }
    .search-wrap { 
      position: relative; 
      flex: 1; 
      min-width: 220px; 
    }
    .search-icon { 
      position: absolute; 
      left: 10px; 
      top: 50%; 
      transform: translateY(-50%); 
      pointer-events: none; 
    }
    .search-input {
      width: 100%; 
      padding: 8px 12px 8px 32px; 
      border: 1px solid #2d2f3e;
      border-radius: 7px; 
      font-size: 0.85rem; 
      outline: none; 
      font-family: inherit; 
      background: #0a0f1c;
      color: #f1f5f9;
    }
    .search-input:focus { 
      border-color: #7c3aed; 
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2); 
    }
    .filter-select {
      padding: 8px 12px; 
      border: 1px solid #2d2f3e; 
      border-radius: 7px;
      font-size: 0.82rem; 
      outline: none; 
      font-family: inherit; 
      background: #0a0f1c; 
      color: #f1f5f9; 
      cursor: pointer;
    }
    .filter-select option {
      background: #0a0f1c;
      color: #f1f5f9;
    }
    .filter-select:focus { 
      border-color: #7c3aed; 
    }
    .filter-toggle {
      padding: 8px 14px; 
      border: 1px solid #2d2f3e; 
      border-radius: 7px;
      font-size: 0.82rem; 
      font-weight: 500; 
      cursor: pointer; 
      background: #0a0f1c;
      color: #94a3b8; 
      transition: all 0.15s; 
      font-family: inherit;
    }
    .filter-active { 
      background: #7c3aed; 
      border-color: #7c3aed; 
      color: white; 
      font-weight: 600; 
    }
    .btn-clear { 
      background: none; 
      border: none; 
      font-size: 0.8rem; 
      color: #94a3b8; 
      cursor: pointer; 
      font-family: inherit; 
      padding: 0; 
    }
    .btn-clear:hover { 
      color: #ff6b6b; 
    }

    /* Panel & Table */
    .panel { 
      background: #1a1f2e; 
      border-radius: 12px; 
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); 
      overflow: hidden; 
      min-height: 200px;
      border: 1px solid #2d2f3e;
    }
    .table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 0.82rem; 
    }
    .table th {
      text-align: left; 
      padding: 10px 14px;
      font-size: 0.65rem; 
      font-weight: 700; 
      color: #94a3b8;
      letter-spacing: 0.07em; 
      text-transform: uppercase; 
      border-bottom: 1px solid #2d2f3e;
    }
    .table td { 
      padding: 13px 14px; 
      border-bottom: 1px solid #2d2f3e; 
      color: #e2e8f0; 
      vertical-align: middle; 
    }
    .request-row:hover td { 
      background: #2d2f3e; 
    }
    .table tbody tr:last-child td { 
      border-bottom: none; 
    }
    .overdue-row td { 
      background: #2d1a1c; 
    }
    .overdue-row:hover td { 
      background: #3a1e20 !important; 
    }

    .req-title  { 
      font-weight: 600; 
      color: #f1f5f9; 
    }
    .req-tags   { 
      font-size: 0.72rem; 
      color: #94a3b8; 
      margin-top: 2px; 
    }
    .desc-cell  { 
      color: #94a3b8; 
      max-width: 240px; 
      white-space: nowrap; 
      overflow: hidden; 
      text-overflow: ellipsis; 
    }
    .date-cell  { 
      color: #94a3b8; 
      white-space: nowrap; 
    }
    .text-danger { 
      color: #ff6b6b !important; 
      font-weight: 600; 
    }
    .agent-chip { 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      font-size: 0.8rem; 
      color: #e2e8f0; 
    }
    .avatar-sm  { 
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
      font-size: 0.8rem; 
    }

    .badge { 
      display: inline-block; 
      padding: 2px 8px; 
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
      margin-left: 4px; 
      padding: 1px 6px; 
      background: #7c3aed; 
      color: white; 
      border-radius: 999px; 
      font-size: 0.65rem; 
      font-weight: 700; 
    }

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
      border: 3px solid #2d2f3e;
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin { 
      to { transform: rotate(360deg); } 
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
    .btn-primary:hover { 
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
    .btn-danger { 
      background: #7c3aed; 
      color: white; 
    }
    .btn-danger:hover { 
      background: #6d28d9; 
    }
    .btn-sm { 
      padding: 6px 14px; 
      font-size: 0.78rem; 
    }
    .btn:disabled { 
      opacity: 0.45; 
      cursor: not-allowed; 
    }

    .btn-delete {
      padding: 6px; 
      border: none; 
      background: #2d1a1c; 
      color: #ff8a8a; 
      border-radius: 6px; 
      cursor: pointer; 
      display: inline-flex; 
      align-items: center;
      justify-content: center; 
      transition: all 0.15s;
      border: 1px solid #7c3aed;
    }
    .btn-delete:hover { 
      background: #3a1e20; 
      color: #ffb3b3; 
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
      animation: fadeIn 0.15s;
      backdrop-filter: blur(4px);
    }
    .modal {
      background: #1a1f2e; 
      border-radius: 12px; 
      padding: 24px;
      max-width: 450px; 
      width: 90%; 
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
      animation: slideUp 0.2s;
      border: 1px solid #7c3aed;
    }
    .modal-title { 
      font-size: 1.1rem; 
      font-weight: 700; 
      color: #f1f5f9; 
      margin-bottom: 12px; 
    }
    .modal-text { 
      font-size: 0.875rem; 
      color: #94a3b8; 
      margin-bottom: 20px; 
      line-height: 1.6; 
    }
    .modal-actions { 
      display: flex; 
      gap: 10px; 
      justify-content: flex-end; 
    }
    @keyframes fadeIn { 
      from { opacity: 0; } 
      to { opacity: 1; } 
    }
    @keyframes slideUp { 
      from { opacity: 0; transform: translateY(20px); } 
      to { opacity: 1; transform: translateY(0); } 
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
    this.errorMessage = '';
    
    this.api.getRequests().subscribe({ 
      next: r => { 
        this.requests = r; 
        this.applyFilters();
        this.loading = false; 
      },
      error: (err) => { 
        this.loading = false;
        this.errorMessage = 'Failed to load requests. Please try again.';
        console.error('Error loading requests:', err);
      }
    });
    
    this.api.getAgents().subscribe({ 
      next: a => this.agents = a, 
      error: (err) => console.error('Error loading agents:', err)
    });
  }

  startRealTimeUpdates(): void {
    // Poll for updates every 10 seconds
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

  applyFilters(): void {
    const s = this.filters.search.toLowerCase();
    let result = this.requests.filter(r => {
      // Search filter
      if (s && !r.title.toLowerCase().includes(s)
             && !r.description.toLowerCase().includes(s)
             && !(r.tags ?? []).some(t => t.toLowerCase().includes(s))) {
        return false;
      }
      
      // Status filter
      if (this.filters.status && r.status !== this.filters.status) {
        return false;
      }
      
      // Priority filter
      if (this.filters.priority && r.priority !== this.filters.priority) {
        return false;
      }
      
      // Agent filter (Admin only)
      if (this.filters.agent && r.assignedAgentId !== this.filters.agent) {
        return false;
      }
      
      // Overdue filter
      if (this.filters.overdueOnly && !this.isOverdue(r)) {
        return false;
      }
      
      return true;
    });

    // Sort
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
    return !!(this.filters.search || 
              this.filters.status || 
              this.filters.priority || 
              this.filters.agent || 
              this.filters.overdueOnly);
  }

  clearFilters(): void {
    this.filters = { search: '', status: '', priority: '', agent: '', overdueOnly: false };
    this.applyFilters();
  }

  isOverdue(r: Request): boolean {
    return isOverdue(r);
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
    if (!this.form.title.trim())       { 
      this.createError = 'Title is required.';       
      return; 
    }
    if (!this.form.description.trim()) { 
      this.createError = 'Description is required.'; 
      return; 
    }
    if (!this.form.dueDate)            { 
      this.createError = 'Due date is required.';    
      return; 
    }
    
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
        
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
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
        this.applyFilters();
        this.successMessage = `Request "${this.deleteTarget!.title}" deleted successfully.`;
        this.cancelDelete();
        
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (err) => {
        this.deleting = false;
        this.errorMessage = 'Failed to delete request. Please try again.';
        console.error('Error deleting request:', err);
      }
    });
  }

  private reload(): void {
    this.api.getRequests().subscribe({
      next: r => {
        this.requests = r;
        this.applyFilters();
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