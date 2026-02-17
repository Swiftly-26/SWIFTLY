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
          <p class="page-sub">Organization Agents • Manage access and track staff workload.</p>
        </div>
      </div>

      <!-- Success Message with Auto-dismiss -->
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
        <p>Loading agents...</p>
      </div>

      <!-- Agents Table -->
      <div class="table-container" *ngIf="!loading">
        <table class="agents-table">
          <thead>
            <tr>
              <th>AGENT NAME</th>
              <th>ID</th>
              <th>ACTIVE WORKLOAD</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let agent of agents">
              <td>
                <div class="agent-name-cell">
                  <div class="agent-avatar">{{ getInitials(agent.name) }}</div>
                  <span>{{ agent.name }}</span>
                </div>
              </td>
              <td class="id-cell">{{ agent.id }}</td>
              <td>
                <span class="workload-badge">
                  {{ workload(agent.id) }} Active Tasks
                </span>
              </td>
              <td>
                <button class="delete-btn" (click)="confirmDelete(agent)" [disabled]="deletingAgentId === agent.id">
                  <span *ngIf="deletingAgentId === agent.id" class="spinner-small"></span>
                  <svg *ngIf="deletingAgentId !== agent.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </td>
            </tr>
            <tr *ngIf="agents.length === 0">
              <td colspan="4" class="empty-state">No agents found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Agent Section -->
      <div class="add-agent-section">
        <div class="admin-info">
          <div class="admin-avatar">{{ getInitials(currentUser.name) }}</div>
          <span class="admin-name">{{ currentUser.name }}</span>
          <span class="admin-role">{{ currentUser.role }}</span>
        </div>
        <button class="btn-add" (click)="showAddForm = true">
          + Add New Agent
        </button>
      </div>

      <!-- Add Agent Modal -->
      <div *ngIf="showAddForm" class="modal-overlay" (click)="closeAddModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Add New Agent</h3>
          <input 
            class="modal-input" 
            placeholder="Enter agent name" 
            [(ngModel)]="newName" 
            (keyup.enter)="addAgent()"
            autofocus
          />
          <div class="modal-actions">
            <button class="btn-primary" (click)="addAgent()" [disabled]="!newName.trim() || addingAgent">
              <span *ngIf="addingAgent" class="spinner-small"></span>
              {{ addingAgent ? 'Adding...' : 'Add Agent' }}
            </button>
            <button class="btn-secondary" (click)="closeAddModal()">Cancel</button>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="deleteTarget" class="modal-overlay" (click)="cancelDelete()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Delete Agent</h3>
          <p class="modal-text">
            Are you sure you want to delete <strong>{{ deleteTarget.name }}</strong>?<br>
            This action cannot be undone.
          </p>
          <div class="modal-actions">
            <button class="btn-danger" (click)="executeDelete()" [disabled]="deleting">
              {{ deleting ? 'Deleting...' : 'Delete Agent' }}
            </button>
            <button class="btn-secondary" (click)="cancelDelete()">Cancel</button>
          </div>
        </div>
      </div>

    </div>

    <!-- Access Denied -->
    <ng-template #accessDenied>
      <div class="access-denied">
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <button class="btn-primary" (click)="goToDashboard()">Return to Dashboard</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .agents-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .page-header {
      margin-bottom: 32px;
    }
    .page-title {
      font-size: 2rem;
      font-weight: 600;
      color: white;
      margin-bottom: 8px;
    }
    .page-sub {
      font-size: 0.9rem;
      color: #7e8aa8;
    }

    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      position: relative;
      animation: slideIn 0.3s ease;
    }
    .alert-success {
      background: #132b1e;
      border-left: 4px solid #10b981;
      color: #e0e7ff;
    }
    .alert-danger {
      background: #2d1a1c;
      border-left: 4px solid #ef4444;
      color: #ffcdd2;
    }
    .alert svg {
      flex-shrink: 0;
    }
    .close-btn {
      position: absolute;
      right: 12px;
      top: 12px;
      background: none;
      border: none;
      color: #7e8aa8;
      cursor: pointer;
      font-size: 16px;
      padding: 4px;
    }
    .close-btn:hover {
      color: white;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px;
      color: #7e8aa8;
      gap: 16px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #2a2f3f;
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    .spinner-small {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 6px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Table */
    .table-container {
      background: #1a1f30;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid #2a2f3f;
      margin-bottom: 24px;
    }
    .agents-table {
      width: 100%;
      border-collapse: collapse;
    }
    .agents-table th {
      text-align: left;
      padding: 16px 12px;
      color: #7e8aa8;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #2a2f3f;
    }
    .agents-table td {
      padding: 16px 12px;
      border-bottom: 1px solid #2a2f3f;
      color: #e2e8f0;
    }

    .agent-name-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .agent-avatar {
      width: 36px;
      height: 36px;
      background: #7c3aed;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.8rem;
      color: white;
    }
    .id-cell {
      font-family: monospace;
      color: #7e8aa8;
      font-size: 0.8rem;
    }
    .workload-badge {
      background: #0f1422;
      padding: 4px 10px;
      border-radius: 30px;
      font-size: 0.75rem;
      color: #a78bfa;
      border: 1px solid #2a2f3f;
    }
    .delete-btn {
      background: none;
      border: none;
      color: #7e8aa8;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .delete-btn:hover:not(:disabled) {
      background: #2d1a1c;
      color: #ff8a8a;
    }
    .delete-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Add Agent Section */
    .add-agent-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1a1f30;
      border-radius: 16px;
      padding: 20px;
      border: 1px solid #2a2f3f;
    }
    .admin-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .admin-avatar {
      width: 44px;
      height: 44px;
      background: #7c3aed;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 1rem;
      color: white;
    }
    .admin-name {
      font-size: 1rem;
      font-weight: 600;
      color: white;
    }
    .admin-role {
      font-size: 0.75rem;
      color: #7e8aa8;
      margin-left: 8px;
    }
    .btn-add {
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 30px;
      padding: 12px 24px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-add:hover:not(:disabled) {
      background: #6d28d9;
      transform: translateY(-1px);
    }
    .btn-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      animation: fadeIn 0.2s ease;
    }
    .modal {
      background: #1a1f30;
      border-radius: 20px;
      padding: 32px;
      max-width: 450px;
      width: 90%;
      border: 1px solid #2a2f3f;
      animation: slideUp 0.3s ease;
    }
    .modal-title {
      color: white;
      font-size: 1.3rem;
      margin-bottom: 20px;
    }
    .modal-text {
      color: #9aa4bf;
      font-size: 0.95rem;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .modal-input {
      width: 100%;
      padding: 14px 16px;
      background: #0f1422;
      border: 1px solid #2a2f3f;
      border-radius: 12px;
      color: white;
      font-size: 0.95rem;
      margin-bottom: 24px;
      transition: all 0.15s;
    }
    .modal-input:focus {
      border-color: #7c3aed;
      outline: none;
      box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .btn-primary {
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-primary:hover:not(:disabled) {
      background: #6d28d9;
    }
    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #0f1422;
      color: #e2e8f0;
      border: 1px solid #2a2f3f;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-secondary:hover {
      background: #1e2538;
    }
    .btn-danger {
      background: #2d1a1c;
      color: #ff8a8a;
      border: 1px solid #7c3aed;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-danger:hover:not(:disabled) {
      background: #3a1e20;
    }

    /* Access Denied */
    .access-denied {
      text-align: center;
      padding: 60px;
      background: #1a1f30;
      border-radius: 16px;
      max-width: 500px;
      margin: 40px auto;
    }
    .access-denied h2 {
      color: white;
      margin-bottom: 12px;
    }
    .access-denied p {
      color: #7e8aa8;
      margin-bottom: 24px;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #7e8aa8;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class AgentsComponent implements OnInit {
  agents: User[] = [];
  requests: any[] = [];
  currentUser!: User;
  isAdmin = false;
  showAddForm = false;
  newName = '';
  successMessage = '';
  errorMessage = '';
  loading = true;
  addingAgent = false;
  deletingAgentId: string | null = null;
  deleteTarget: User | null = null;
  deleting = false;

  constructor(
    private api: ApiService,
    private router: Router
  ) {
    this.currentUser = this.api.getCurrentUser();
  }

  ngOnInit(): void {
    this.isAdmin = this.currentUser.role === 'Admin';
    if (this.isAdmin) {
      this.loadData();
    } else {
      this.loading = false;
    }
  }

  loadData(): void {
    this.loading = true;
    
    this.api.getAgents().subscribe({
      next: (a) => {
        this.agents = a;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading agents:', err);
        this.errorMessage = 'Failed to load agents. Please try again.';
        this.loading = false;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });

    this.api.getRequests().subscribe({
      next: (r) => this.requests = r,
      error: (err) => console.error('Error loading requests:', err)
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  workload(agentId: string): number {
    return this.requests.filter(r =>
      r.assignedAgentId === agentId && r.status !== 'Done'
    ).length;
  }

  closeAddModal(): void {
    this.showAddForm = false;
    this.newName = '';
    this.addingAgent = false;
  }

  addAgent(): void {
    if (!this.isAdmin || !this.newName.trim()) return;
    
    this.addingAgent = true;
    this.errorMessage = '';
    
    this.api.addAgent(this.newName.trim()).subscribe({
      next: (newAgent) => {
        this.agents = [...this.agents, newAgent];
        this.successMessage = `✅ Agent "${newAgent.name}" added successfully!`;
        this.closeAddModal();
        this.addingAgent = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = '❌ Failed to add agent. Please try again.';
        this.addingAgent = false;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  confirmDelete(agent: User): void {
    this.deleteTarget = agent;
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.deleting = false;
    this.deletingAgentId = null;
  }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    
    this.deleting = true;
    this.deletingAgentId = this.deleteTarget.id;
    
    this.api.deleteAgent(this.deleteTarget.id).subscribe({
      next: () => {
        this.agents = this.agents.filter(a => a.id !== this.deleteTarget!.id);
        this.successMessage = `✅ Agent "${this.deleteTarget!.name}" deleted successfully.`;
        this.cancelDelete();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = '❌ Cannot delete agent with active assignments.';
        this.deleting = false;
        this.deletingAgentId = null;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/']);
  }
}