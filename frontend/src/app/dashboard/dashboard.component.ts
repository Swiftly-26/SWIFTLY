// frontend/src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Request, Status, User, isOverdue } from '../models';

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
        <p>Loading dashboard data...</p>
      </div>

      <!-- ════════════════════════════════════════
           ADMIN DASHBOARD
      ════════════════════════════════════════ -->
      <ng-container *ngIf="!loading && currentUser.role === 'Admin'">

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

        <!-- All Requests Table -->
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
              <tr *ngFor="let r of requests"
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
                  <!-- Fixed: Properly check for undefined assignedAgentId -->
                  <div *ngIf="getAssignedAgentId(r) !== undefined" class="agent-chip">
                    <div class="avatar-sm">{{ agentInitials(getAssignedAgentId(r)!) }}</div>
                    <span>{{ agentName(getAssignedAgentId(r)!) }}</span>
                  </div>
                  <span *ngIf="getAssignedAgentId(r) === undefined" class="unassigned">Unassigned</span>
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
      <ng-container *ngIf="!loading && currentUser.role === 'Agent'">

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
    .dashboard { 
      max-width: 1400px; 
      margin: 0 auto;
      background: #0a0f1c;
      padding: 16px;
      border-radius: 16px;
      min-height: calc(100vh - 120px);
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
      flex-wrap: wrap;
    }
    .alert-success svg { 
      color: #7c3aed; 
      flex-shrink: 0; 
    }
    
    /* Error Message */
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
      flex-wrap: wrap;
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

    /* Header */
    .page-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .page-title  { 
      font-size: clamp(1.4rem, 4vw, 1.8rem);
      font-weight: 700; 
      color: #f1f5f9; 
      margin-bottom: 4px; 
      letter-spacing: -0.02em; 
    }
    .page-sub    { 
      font-size: 0.8rem; 
      color: #94a3b8; 
    }

    /* Alert */
    .alert {
      display: flex; 
      align-items: center; 
      gap: 10px;
      padding: 12px 16px; 
      border-radius: 8px; 
      font-size: 0.85rem; 
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #1a1f2e; 
      border-radius: 12px; 
      padding: 18px 16px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); 
      position: relative; 
      overflow: hidden;
      border: 1px solid #2d2f3e;
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(124, 58, 237, 0.2);
    }
    .stat-label { 
      font-size: 0.65rem; 
      font-weight: 700; 
      color: #94a3b8; 
      letter-spacing: 0.08em; 
      text-transform: uppercase; 
      margin-bottom: 6px; 
    }
    .stat-value { 
      font-size: clamp(1.5rem, 3vw, 2rem);
      font-weight: 700; 
      color: #f1f5f9; 
      line-height: 1; 
    }
    .text-danger { 
      color: #ff6b6b !important; 
    }
    .stat-icon {
      position: absolute; 
      right: 14px; 
      top: 50%; 
      transform: translateY(-50%);
      width: 36px; 
      height: 36px; 
      border-radius: 9px; 
      display: flex; 
      align-items: center; 
      justify-content: center;
    }
    .stat-icon--blue   { 
      background: #1e293b; 
      color: #7c3aed; 
    }
    .stat-icon--indigo { 
      background: #1e293b; 
      color: #7c3aed; 
    }
    .stat-icon--amber  { 
      background: #1e293b; 
      color: #7c3aed; 
    }
    .stat-icon--green  { 
      background: #1e293b; 
      color: #7c3aed; 
    }
    .stat-icon--red    { 
      background: #1e293b; 
      color: #7c3aed; 
    }

    /* Panel */
    .panel { 
      background: #1a1f2e; 
      border-radius: 12px; 
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); 
      margin-bottom: 24px; 
      overflow: hidden; 
      border: 1px solid #2d2f3e;
    }
    .panel-header { 
      display: flex; 
      align-items: center; 
      justify-content: space-between;
      gap: 10px; 
      padding: 16px 20px; 
      flex-wrap: wrap;
    }
    .panel-title  { 
      font-size: 1rem; 
      font-weight: 600; 
      color: #f1f5f9; 
      margin: 0;
    }
    .count-badge  { 
      background: #2d2f3e; 
      color: #a78bfa; 
      padding: 4px 10px; 
      border-radius: 999px; 
      font-size: 0.75rem; 
      font-weight: 600; 
    }

    /* Distribution */
    .dist-bar { 
      display: flex; 
      height: 8px; 
      border-radius: 999px; 
      overflow: hidden; 
      background: #2d2f3e; 
      margin: 0 20px 14px; 
      gap: 2px; 
    }
    .dist-segment { 
      transition: flex 0.4s; 
      min-width: 0; 
    }
    .dist-open { 
      background: #7c3aed; 
    } 
    .dist-progress { 
      background: #8b5cf6; 
    }
    .dist-blocked { 
      background: #a78bfa; 
    } 
    .dist-done { 
      background: #6d28d9; 
    } 
    .dist-empty { 
      background: #2d2f3e; 
    }
    .dist-legend { 
      display: flex; 
      gap: 16px; 
      flex-wrap: wrap; 
      padding: 0 20px 20px; 
    }
    .legend-item { 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      font-size: 0.75rem; 
      color: #94a3b8; 
    }
    .legend-item strong { 
      color: #f1f5f9; 
    }
    .legend-dot { 
      width: 8px; 
      height: 8px; 
      border-radius: 50%; 
    }
    .dot-open { 
      background: #7c3aed; 
    } 
    .dot-progress { 
      background: #8b5cf6; 
    }
    .dot-blocked { 
      background: #a78bfa; 
    } 
    .dot-done { 
      background: #6d28d9; 
    }

    /* Table */
    .table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 0.82rem; 
    }
    .table th {
      text-align: left; 
      padding: 12px 16px;
      font-size: 0.7rem; 
      font-weight: 700; 
      color: #94a3b8;
      letter-spacing: 0.07em; 
      text-transform: uppercase; 
      border-bottom: 1px solid #2d2f3e;
    }
    .table td { 
      padding: 14px 16px; 
      border-bottom: 1px solid #2d2f3e; 
      color: #e2e8f0; 
      vertical-align: middle; 
    }
    .table tbody tr:last-child td { 
      border-bottom: none; 
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

    .req-title { 
      font-weight: 600; 
      color: #f1f5f9; 
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .req-tags  { 
      font-size: 0.7rem; 
      color: #94a3b8; 
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .desc-cell { 
      color: #94a3b8; 
      max-width: 250px; 
      white-space: nowrap; 
      overflow: hidden; 
      text-overflow: ellipsis; 
    }
    .date-cell { 
      color: #94a3b8; 
      white-space: nowrap; 
      font-size: 0.75rem;
    }
    .agent-chip { 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      font-size: 0.75rem; 
      color: #e2e8f0; 
      white-space: nowrap;
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
      font-size: 0.75rem; 
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
      padding: 2px 6px; 
      background: #7c3aed; 
      color: white; 
      border-radius: 999px; 
      font-size: 0.6rem; 
      font-weight: 700; 
    }

    .action-btn { 
      display: inline-block; 
      padding: 6px 12px; 
      background: #4f46e5; 
      color: white; 
      border-radius: 6px; 
      font-size: 0.7rem; 
      font-weight: 600; 
      text-decoration: none; 
    }
    .action-btn:hover { 
      background: #6366f1; 
    }
    .empty-state { 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: center;
      padding: 60px 24px; 
      color: #94a3b8; 
      gap: 16px; 
      font-size: 0.875rem; 
      text-align: center;
    }

    /* Agent cards */
    .request-cards { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
      gap: 16px; 
      padding: 0 20px 20px; 
    }
    .request-card {
      border: 1px solid #2d2f3e; 
      border-radius: 12px; 
      padding: 16px;
      cursor: pointer; 
      transition: all 0.15s;
      background: #1a1f2e;
    }
    .request-card:hover { 
      border-color: #7c3aed; 
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.2); 
      transform: translateY(-2px); 
    }
    .request-card--overdue { 
      border-color: #7c3aed; 
      background: #2d1a1c; 
    }
    .rc-header  { 
      display: flex; 
      align-items: center; 
      gap: 6px; 
      flex-wrap: wrap; 
      margin-bottom: 12px; 
    }
    .rc-title   { 
      font-size: 1rem; 
      font-weight: 600; 
      color: #f1f5f9; 
      margin-bottom: 8px; 
      line-height: 1.4; 
    }
    .rc-desc    { 
      font-size: 0.8rem; 
      color: #94a3b8; 
      line-height: 1.5; 
      margin-bottom: 16px; 
      display: -webkit-box; 
      -webkit-line-clamp: 2; 
      -webkit-box-orient: vertical; 
      overflow: hidden; 
    }
    .rc-meta    { 
      display: flex; 
      justify-content: space-between; 
      font-size: 0.7rem; 
      color: #94a3b8; 
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .rc-date    { 
      display: flex; 
      align-items: center; 
      gap: 4px; 
    }
    .rc-footer  { 
      font-size: 0.75rem; 
      font-weight: 600; 
      color: #a78bfa; 
      text-align: right; 
    }

    /* Button */
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
      text-decoration: none; 
      font-family: inherit; 
    }
    .btn-primary { 
      background: #7c3aed; 
      color: white; 
    }
    .btn-primary:hover { 
      background: #6d28d9; 
    }
    .btn-sm { 
      padding: 6px 12px; 
      font-size: 0.7rem; 
    }

    /* Responsive Breakpoints */
    @media (max-width: 1200px) { 
      .stats-grid { 
        grid-template-columns: repeat(3, 1fr); 
      }
      .desc-cell {
        max-width: 180px;
      }
    }
    
    @media (max-width: 900px) { 
      .stats-grid { 
        grid-template-columns: repeat(2, 1fr); 
      }
      .table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }
      .desc-cell {
        max-width: 150px;
      }
      .dashboard {
        padding: 12px;
      }
    }
    
    @media (max-width: 600px) { 
      .stats-grid { 
        grid-template-columns: 1fr; 
      }
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .btn {
        width: 100%;
      }
      .dist-legend {
        gap: 12px;
      }
      .legend-item {
        font-size: 0.7rem;
      }
      .dashboard {
        padding: 8px;
      }
      .panel-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .request-cards {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  requests: Request[] = [];
  agents: User[] = [];
  currentUser!: User;
  successMessage = '';
  errorMessage = '';
  loading = true;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();
    this.loadData();
  }

  loadData(): void {
    console.log('Dashboard loading data...');
    this.loading = true;
    this.errorMessage = '';
    
    // Load requests
    this.api.getRequests().subscribe({
      next: (r) => {
        this.requests = r;
        console.log('Dashboard - Requests loaded:', r.length);
        this.loading = false;
      },
      error: (err) => {
        console.error('Dashboard - Error loading requests:', err);
        this.errorMessage = 'Failed to load requests. Please try again.';
        this.requests = [];
        this.loading = false;
      }
    });

    // Load agents
    this.api.getAgents().subscribe({
      next: (a) => {
        this.agents = a;
        console.log('Dashboard - Agents loaded:', a.length);
      },
      error: (err) => {
        console.error('Dashboard - Error loading agents:', err);
        this.agents = [];
      }
    });
  }

  // ── Helper method to safely get assignedAgentId ───────────────────────────
  getAssignedAgentId(request: Request): string | undefined {
    return request.assignedAgentId;
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
    return isOverdue(r);
  }

  agentName(id: string): string {
    if (!this.agents || this.agents.length === 0) {
      return id;
    }
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