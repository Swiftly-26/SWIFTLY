import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Request } from '../models';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <h2>Requests</h2>

  <table>
    <tr>
      <th>Title</th>
      <th>Status</th>
      <th>Priority</th>
      <th>Due</th>
    </tr>

    <tr *ngFor="let r of requests" [routerLink]="['/requests', r.id]">
      <td>{{r.title}}</td>
      <td>{{r.status}}</td>
      <td>{{r.priority}}</td>
      <td>
        {{r.dueDate}}
        <span *ngIf="isOverdue(r)" class="overdue">OVERDUE</span>
      </td>
    </tr>
  </table>
  `,
  styles: [`
    table { width:100%; background:white; border-collapse:collapse }
    th, td { padding:10px; border-bottom:1px solid #eee }
    tr:hover { background:#f3f4f6; cursor:pointer }
    .overdue { color:red; font-weight:bold; margin-left:8px }
  `]
})
export class RequestListComponent {
  requests: Request[] = [];

  constructor(private api: ApiService) {
    this.api.getRequests().subscribe(r => this.requests = r);
  }

  isOverdue(r: Request) {
    return r.status !== 'Done' && new Date(r.dueDate) < new Date();
  }
}
