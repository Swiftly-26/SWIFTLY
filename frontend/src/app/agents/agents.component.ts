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

      <!-- Add Agent Form - ONLY VISIBLE TO ADMIN -->
      <div *ngIf="showAddForm && isAdmin" class="card add-form">
        <h3 style="margin-bottom:16px; font-size:0.95rem;">New Agent</h3>
        <div class="form-row">
          <input class="form-control" placeholder="Agent name" [(ngModel)]="newName" />
          <button class="btn btn-primary" (click)="addAgent()" [disabled]="!newName.trim() || addingAgent">
            <span *ngIf="addingAgent" class="spinner-small"></span>
            Add
          </button>
          <button class="btn btn-ghost" (click)="showAddForm = false">Cancel</button>
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
                <button class="icon-btn danger" (click)="deleteAgent(agent.id)" title="Remove agent" [disabled]="deletingAgentId === agent.id">
                  <span *ngIf="deletingAgentId === agent.id" class="spinner-small"></span>
                  <svg *ngIf="deletingAgentId !== agent.id" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

      <!-- Delete Confirmation Modal -->
      <div *ngIf="deleteTarget" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Delete Agent</h3>
          <p class="modal-text">
            Are you sure you want to delete <strong>{{ deleteTarget.name }}</strong>?<br>
            This agent will be permanently removed.
          </p>
          <div class="modal-actions">
            <button class="btn btn-danger" (click)="confirmDelete()" [disabled]="deleting">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
            <button class="btn btn-ghost" (click)="cancelDelete()">Cancel</button>
          </div>
        </div>
      </div>

    </div>

    <!-- Access Denied Template for Agents -->
    <ng-template #accessDenied>
      <div class="access-denied">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5">
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
    .agents-page { 
      max-width: 900px; 
      background: #0a0f1c;
      padding: 24px;
      border-radius: 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 1.6rem;
      font-weight: 700;
      color: #f1f5f9;
      margin-bottom: 4px;
      letter-spacing: -0.02em;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #e2e8f0;
      margin-bottom: 2px;
    }
    .section-sub { 
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
      font-size: 0.85rem; 
      margin-bottom: 20px; 
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

    /* Add form */
    .add-form {
      margin-bottom: 16px;
    }
    .form-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .form-row .form-control { 
      max-width: 300px; 
    }

    /* Agent name cell */
    .agent-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      color: #f1f5f9;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #7c3aed;
      color: white;
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
      color: #94a3b8;
      font-family: 'Courier New', monospace;
    }

    .workload-badge {
      display: inline-block;
      padding: 3px 10px;
      background: #1e293b;
      color: #a78bfa;
      border: 1px solid #7c3aed;
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
    .icon-btn:hover { 
      background: #2d2f3e; 
      color: #e2e8f0; 
    }
    .icon-btn.danger:hover { 
      background: #2d1a1c; 
      color: #ff8a8a; 
    }
    .icon-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Card */
    .card { 
      background: #1a1f2e; 
      border-radius: 12px; 
      padding: 0; 
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1); 
      overflow: hidden;
      border: 1px solid #2d2f3e;
    }
    .add-form { 
      padding: 20px; 
    }

    .form-control {
      padding: 8px 12px; 
      border: 1px solid #2d2f3e; 
      border-radius: 7px;
      font-size: 0.875rem; 
      color: #f1f5f9; 
      outline: none; 
      font-family: inherit;
      background: #0a0f1c;
    }
    .form-control:focus { 
      border-color: #7c3aed; 
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2); 
    }

    .table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 0.875rem; 
    }
    .table th {
      text-align: left; 
      padding: 12px 20px;
      font-size: 0.7rem; 
      font-weight: 700; 
      color: #94a3b8;
      letter-spacing: 0.07em; 
      text-transform: uppercase;
      border-bottom: 1px solid #2d2f3e;
    }
    .table td {
      padding: 14px 20px; 
      border-bottom: 1px solid #2d2f3e;
      color: #e2e8f0; 
      vertical-align: middle;
    }
    .table tbody tr:last-child td { 
      border-bottom: none; 
    }
    .table tbody tr:hover td { 
      background: #2d2f3e; 
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #94a3b8;
      font-size: 0.875rem;
    }

    /* Buttons */
    .btn { 
      display: inline-flex; 
      align-items: center; 
      gap: 6px;
      padding: 8px 16px; 
      border-radius: 7px; 
      border: none;
      font-size: 0.8rem; 
      font-weight: 600; 
      cursor: pointer;
      transition: all 0.15s; 
      white-space: nowrap; 
      font-family: inherit;
    }
    .btn-primary   { 
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
    .btn:disabled  { 
      opacity: 0.45; 
      cursor: not-allowed; 
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
      background: #1a1f2e;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.1);
      border: 1px solid #2d2f3e;
    }
    .access-denied h2 {
      font-size: 1.5rem;
      color: #f1f5f9;
      margin: 16px 0 8px;
    }
    .access-denied p {
      color: #94a3b8;
      margin-bottom: 24px;
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
    @keyframes spin { 
      to { transform: rotate(360deg); } 
    }
  `]
})
export class AgentsComponent implements OnInit {
  agents: User[] = [];
  requests: any[] = [];
  showAddForm = false;
  newName = '';
  isAdmin = false;
  successMessage = '';
  errorMessage = '';
  addingAgent = false;
  deletingAgentId: string | null = null;
  deleteTarget: User | null = null;
  deleting = false;

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
      error: (err) => {
        console.error('Error loading agents:', err);
        this.errorMessage = 'Failed to load agents.';
      }
    });
    this.api.getRequests().subscribe({ 
      next: (r) => this.requests = r, 
      error: (err) => console.error('Error loading requests:', err)
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
    
    this.addingAgent = true;
    this.errorMessage = '';
    
    this.api.addAgent(this.newName.trim()).subscribe({
      next: (newAgent) => {
        this.agents = [...this.agents, newAgent];
        this.newName = '';
        this.showAddForm = false;
        this.addingAgent = false;
        this.successMessage = `Agent "${newAgent.name}" added successfully.`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = 'Failed to add agent. Please try again.';
        this.addingAgent = false;
        console.error('Error adding agent:', err);
      }
    });
  }

  deleteAgent(id: string): void {
    const agent = this.agents.find(a => a.id === id);
    if (agent) {
      this.deleteTarget = agent;
    }
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.deleting = false;
    this.deletingAgentId = null;
  }

  confirmDelete(): void {
    if (!this.deleteTarget) return;
    
    this.deleting = true;
    this.deletingAgentId = this.deleteTarget.id;
    this.errorMessage = '';
    
    this.api.deleteAgent(this.deleteTarget.id).subscribe({
      next: () => {
        this.agents = this.agents.filter(a => a.id !== this.deleteTarget!.id);
        this.successMessage = `Agent "${this.deleteTarget!.name}" deleted successfully.`;
        this.cancelDelete();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.errorMessage = 'Failed to delete agent. They may have active assignments.';
        this.deleting = false;
        this.deletingAgentId = null;
        console.error('Error deleting agent:', err);
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/']);
  }
}