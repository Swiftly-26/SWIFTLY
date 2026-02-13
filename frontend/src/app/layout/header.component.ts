import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { User } from '../models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="header-left"></div>
      <div class="header-right">
        <div class="user-info">
          <span class="user-name">{{ currentUser.name }}</span>
          <span class="user-role">{{ currentUser.role }}</span>
        </div>
        
        <div *ngIf="isAdminUser" class="dropdown">
          <button class="dropdown-btn" (click)="toggleDropdown($event)">
            <span>Switch Role</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          
          <div *ngIf="dropdownOpen" class="dropdown-menu">
            <div class="dropdown-header">Select Role</div>
            <button 
              class="dropdown-item" 
              [class.active]="currentUser.role === 'Admin'"
              (click)="switchToAdmin()">
              <span class="item-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <div class="item-content">
                <span class="item-title">Admin</span>
                <span class="item-desc">Full system access</span>
              </div>
              <span *ngIf="currentUser.role === 'Admin'" class="check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            </button>
            
            <button 
              class="dropdown-item" 
              [class.active]="currentUser.role === 'Agent'"
              (click)="switchToAgent()">
              <span class="item-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <div class="item-content">
                <span class="item-title">Agent</span>
                <span class="item-desc">View assigned requests</span>
              </div>
              <span *ngIf="currentUser.role === 'Agent'" class="check-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
        
        <div *ngIf="!isAdminUser" class="role-badge">
          {{ currentUser.role }}
        </div>
      </div>
    </header>
    
    <div *ngIf="dropdownOpen" class="dropdown-backdrop" (click)="closeDropdown()"></div>
  `,
  styles: [`
    .header {
      height: 60px;
      min-height: 60px;
      background: #0a0f1c;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      border-bottom: 1px solid #2d2f3e;
      z-index: 10;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.3;
    }
    
    .user-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    
    .user-role {
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .role-badge {
      padding: 4px 12px;
      background: #7c3aed;
      color: white;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .dropdown {
      position: relative;
      display: inline-block;
    }

    .dropdown-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    
    .dropdown-btn:hover {
      background: #6d28d9;
    }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 260px;
      background: #1a1f2e;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      border: 1px solid #2d2f3e;
      overflow: hidden;
      z-index: 1001;
      animation: slideDown 0.2s ease;
    }

    .dropdown-header {
      padding: 12px 16px;
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      background: #0a0f1c;
      border-bottom: 1px solid #2d2f3e;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      border: none;
      background: #1a1f2e;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
      border-bottom: 1px solid #2d2f3e;
    }
    
    .dropdown-item:last-child {
      border-bottom: none;
    }
    
    .dropdown-item:hover {
      background: #2d2f3e;
    }
    
    .dropdown-item.active {
      background: #7c3aed;
    }

    .item-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: #0a0f1c;
      border-radius: 8px;
      color: #a78bfa;
      flex-shrink: 0;
    }
    
    .dropdown-item.active .item-icon {
      background: white;
      color: #7c3aed;
    }

    .item-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .item-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f1f5f9;
    }
    
    .item-desc {
      font-size: 0.7rem;
      color: #94a3b8;
    }
    
    .dropdown-item.active .item-desc {
      color: #e2e8f0;
    }

    .check-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin-left: 8px;
    }

    .dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class HeaderComponent implements OnInit {
  currentUser: User;
  isAdminUser = false;
  dropdownOpen = false;

  constructor(private api: ApiService, private router: Router) {
    this.currentUser = this.api.getCurrentUser();
  }

  ngOnInit(): void {
    this.checkAdminPrivilege();
  }

  checkAdminPrivilege(): void {
    const adminIds = ['admin-1'];
    this.isAdminUser = adminIds.includes(this.currentUser.id) || this.currentUser.role === 'Admin';
  }

  toggleDropdown(event: Event): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  switchToAdmin(): void {
    if (this.currentUser.role === 'Admin') {
      this.closeDropdown();
      return;
    }
    
    const adminUser: User = {
      id: 'admin-1',
      name: 'System Admin',
      role: 'Admin'
    };
    
    this.updateUserRole(adminUser);
  }

  switchToAgent(): void {
    if (this.currentUser.role === 'Agent') {
      this.closeDropdown();
      return;
    }
    
    const agentUser: User = {
      id: 'admin-1',
      name: 'John Doe',
      role: 'Agent'
    };
    
    this.updateUserRole(agentUser);
  }

  private updateUserRole(user: User): void {
    this.api.setUser(user);
    this.currentUser = user;
    this.isAdminUser = true;
    this.closeDropdown();
    
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([this.router.url]);
    });
  }
}