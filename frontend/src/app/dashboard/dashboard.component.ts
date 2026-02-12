import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { Request } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <h2>Dashboard</h2>

  <div class="stats">
    <div class="card">Open: {{count('Open')}}</div>
    <div class="card">In Progress: {{count('In Progress')}}</div>
    <div class="card">Blocked: {{count('Blocked')}}</div>
    <div class="card">Done: {{count('Done')}}</div>
  </div>

  <div class="card">
    <h3>Overdue Requests</h3>
    <div *ngFor="let r of overdue()">
      ⚠ {{r.title}} (Due {{r.dueDate}})
    </div>
  </div>
  `,
  styles: [`
    .stats { display:flex; gap:15px; margin-bottom:20px }
    .card {
      background:white;
      padding:15px;
      border-radius:8px;
      box-shadow:0 2px 6px rgba(0,0,0,0.05);
      flex:1;
    }
  `]
})
export class DashboardComponent {
  requests: Request[] = [];

  constructor(private api: ApiService) {
    this.api.getRequests().subscribe(r => this.requests = r);
  }

  count(status: string) {
    return this.requests.filter(r => r.status === status).length;
  }

  overdue() {
    return this.requests.filter(r =>
      r.status !== 'Done' &&
      new Date(r.dueDate) < new Date()
    );
  }
}
