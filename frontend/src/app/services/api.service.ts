import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Request,
  Comment,
  User,
  Status,
  Priority
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private baseUrl = 'http://localhost:3000/api';

  // Simulated logged-in user (replace later with JWT auth)
  private currentUser: User = {
    id: 'admin-1',
    name: 'System Admin',
    role: 'Admin'
  };

  constructor(private http: HttpClient) {}

  // =========================
  // 🔐 ROLE MANAGEMENT
  // =========================

  setUser(user: User) {
    this.currentUser = user;
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-user-id': this.currentUser.id,
      'x-user-role': this.currentUser.role
    });
  }

  // =========================
  // 📌 REQUESTS
  // =========================

  getRequests(): Observable<Request[]> {
    return this.http.get<Request[]>(
      `${this.baseUrl}/requests`,
      { headers: this.getHeaders() }
    );
  }

  getRequestById(id: string): Observable<Request> {
    return this.http.get<Request>(
      `${this.baseUrl}/requests/${id}`,
      { headers: this.getHeaders() }
    );
  }

  createRequest(data: {
    title: string;
    description: string;
    dueDate: string;
    priority?: Priority;
  }): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/requests`,
      data,
      { headers: this.getHeaders() }
    );
  }

  updateStatus(id: string, status: Status): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/requests/${id}/status`,
      {
        status,
        user: this.currentUser.name
      },
      { headers: this.getHeaders() }
    );
  }

  assignRequest(id: string, agentId: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/requests/${id}/assign`,
      { agentId },
      { headers: this.getHeaders() }
    );
  }

  deleteRequest(id: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/requests/${id}`,
      { headers: this.getHeaders() }
    );
  }

  // =========================
  // 💬 COMMENTS
  // =========================

  getComments(requestId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(
      `${this.baseUrl}/requests/${requestId}/comments`,
      { headers: this.getHeaders() }
    );
  }

  addComment(requestId: string, text: string, type: 'General' | 'Status update'): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/requests/${requestId}/comments`,
      {
        author: this.currentUser.name,
        text,
        type
      },
      { headers: this.getHeaders() }
    );
  }

  // =========================
  // 👥 AGENTS
  // =========================

  getAgents(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.baseUrl}/agents`,
      { headers: this.getHeaders() }
    );
  }

}
