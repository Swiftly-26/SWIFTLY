// frontend/src/app/agents/agents.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { User } from '../models';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isAdmin; else accessDenied" class="agents-page">

      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Agents</h1>
          <h2 class="section-title">Organization Agents</h2>
          <p class="section-sub">Manage access and track staff workload.</p>
        </div>
        <!-- Add New Agent button - ONLY VISIBLE TO ADMIN -->
        <button *ngIf="isAdmin" class="btn btn-primary" (click)="showAddForm = !showAddForm">
          + Add New Agent
        </button>
      </div>

      <!-- Add Agent Form - ONLY VISIBLE TO ADMIN -->
      <div *ngIf="showAddForm && isAdmin" class="card add-form">
        <h3 style="margin-bottom:16px; font-size:0.95rem;">New Agent</h3>
        <div class="form-row">
          <input class="form-control" placeholder="Agent name" [(ngModel)]="newName" />
          <button class="btn btn-primary" (click)="addAgent()" [disabled]="!newName.trim()">
            Add
          </button>
          <button class="btn btn-secondary" (click)="showAddForm = false">Cancel</button>
        </div>
      </div>

      <!-- Agents Table -->
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>AGENT NAME</th>
              <th>ID</th>
              <th>ACTIVE WORKLOAD</th>
              <th *ngIf="isAdmin">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let agent of agents">
              <td>
                <div class="agent-name-cell">
                  <div class="avatar">{{ initials(agent.name) }}</div>
                  <span>{{ agent.name }}</span>
                </div>
              </td>
              <td class="id-cell">{{ agent.id }}</td>
              <td>
                <span class="workload-badge">
                  {{ workload(agent.id) }} Active Tasks
                </span>
              </td>
              <td *ngIf="isAdmin">
                <button class="icon-btn danger" (click)="deleteAgent(agent.id)" title="Remove agent">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </td>
            </tr>

            <tr *ngIf="agents.length === 0">
              <td [attr.colspan]="isAdmin ? 4 : 3">
                <div class="empty-state">No agents found.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- Access Denied Template for Agents -->
    <ng-template #accessDenied>
      <div class="access-denied">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <button class="btn btn-primary" (click)="goToDashboard()">Return to Dashboard</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .agents-page { max-width: 900px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .section-sub { font-size: 0.8rem; color: #64748b; }

    /* Add form */
    .add-form {
      margin-bottom: 16px;
    }
    .form-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .form-row .form-control { max-width: 300px; }

    /* Agent name cell */
    .agent-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      color: #1e293b;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #e0e7ff;
      color: #4f46e5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }

    .id-cell {
      font-size: 0.8rem;
      color: #64748b;
      font-family: 'Courier New', monospace;
    }

    .workload-badge {
      display: inline-block;
      padding: 3px 10px;
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    /* Icon button */
    .icon-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      background: transparent;
      color: #94a3b8;
    }
    .icon-btn:hover { background: #f1f5f9; color: #64748b; }
    .icon-btn.danger:hover { background: #fef2f2; color: #ef4444; }

    /* Shared imports from global styles */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 7px; border: none;
      font-size: 0.8rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s; white-space: nowrap; font-family: inherit;
    }
    .btn-primary   { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #4338ca; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover { background: #f9fafb; }
    .btn:disabled  { opacity: 0.45; cursor: not-allowed; }

    .card { background: white; border-radius: 12px; padding: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; }
    .add-form { padding: 20px; }

    .form-control {
      padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 7px;
      font-size: 0.875rem; color: #1e293b; outline: none; font-family: inherit;
    }
    .form-control:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }

    .table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .table th {
      text-align: left; padding: 12px 20px;
      font-size: 0.7rem; font-weight: 700; color: #94a3b8;
      letter-spacing: 0.07em; text-transform: uppercase;
      border-bottom: 1px solid #f1f5f9;
    }
    .table td {
      padding: 14px 20px; border-bottom: 1px solid #f8fafc;
      color: #334155; vertical-align: middle;
    }
    .table tbody tr:last-child td { border-bottom: none; }
    .table tbody tr:hover td { background: #f8fafc; }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    /* Access Denied Styles */
    .access-denied {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      max-width: 500px;
      margin: 40px auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .access-denied h2 {
      font-size: 1.5rem;
      color: #0f172a;
      margin: 16px 0 8px;
    }
    .access-denied p {
      color: #64748b;
      margin-bottom: 24px;
    }
  `]
})
export class AgentsComponent implements OnInit {
  agents: User[] = [];
  requests: any[] = [];
  showAddForm = false;
  newName = '';
  isAdmin = false;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.api.getCurrentUser().role === 'Admin';
    
    // Only load data if user is Admin
    if (this.isAdmin) {
      this.loadData();
    }
  }

  loadData(): void {
    this.api.getAgents().subscribe({ 
      next: (a) => this.agents = a, 
      error: () => {} 
    });
    this.api.getRequests().subscribe({ 
      next: (r) => this.requests = r, 
      error: () => {} 
    });
  }

  initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  workload(agentId: string): number {
    return this.requests.filter(r =>
      r.assignedAgentId === agentId && r.status !== 'Done'
    ).length;
  }

  addAgent(): void {
    if (!this.isAdmin) return;
    if (!this.newName.trim()) return;
    
    const newAgent: User = {
      id: 'agent-' + Date.now(),
      name: this.newName.trim(),
      role: 'Agent'
    };
    this.agents = [...this.agents, newAgent];
    this.newName = '';
    this.showAddForm = false;
  }

  deleteAgent(id: string): void {
    if (!this.isAdmin) return;
    this.agents = this.agents.filter(a => a.id !== id);
  }

  goToDashboard(): void {
    this.router.navigate(['/']);
  }
}