import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { Request } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
  <div *ngIf="request">
    <h2>{{request.title}}</h2>

    <div *ngIf="isOverdue()" class="warning">
      ⚠ Admin Warning: This request is overdue!
    </div>

    <p>{{request.description}}</p>

    <div class="status-buttons">
      <button *ngFor="let s of statuses"
              (click)="changeStatus(s)">
        {{s}}
      </button>
    </div>
  </div>
  `,
  styles: [`
    .warning {
      background:#fee2e2;
      padding:10px;
      margin-bottom:10px;
      border-left:4px solid red;
    }
    .status-buttons button {
      margin-right:10px;
      padding:6px 10px;
    }
  `]
})
export class RequestDetailComponent {
  request?: Request;
  statuses = ['Open','In Progress','Blocked','Done'];

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {
    const id = this.route.snapshot.params['id'];
    this.api.getRequests().subscribe(r => {
      this.request = r.find(x => x.id === id);
    });
  }

  isOverdue() {
    return this.request &&
      this.request.status !== 'Done' &&
      new Date(this.request.dueDate) < new Date();
  }

  changeStatus(status: string) {
    if (!this.request) return;
    this.api.updateStatus(this.request.id, status, "Admin")
      .subscribe(() => location.reload());
  }
}
