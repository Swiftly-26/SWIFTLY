import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: true,
  template: `
  <div class="header">
    <div>
      <strong>{{role}}</strong>
    </div>
    <button (click)="toggleRole()">
      Switch to {{role === 'Admin' ? 'Agent' : 'Admin'}}
    </button>
  </div>
  `,
  styles: [`
    .header {
      height:60px;
      background:white;
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:0 20px;
      border-bottom:1px solid #e5e7eb;
    }
    button {
      padding:6px 12px;
      background:#4f46e5;
      color:white;
      border:none;
      border-radius:4px;
      cursor:pointer;
    }
  `]
})
export class HeaderComponent {
  role: 'Admin' | 'Agent' = 'Admin';

  toggleRole() {
    this.role = this.role === 'Admin' ? 'Agent' : 'Admin';
  }
}
