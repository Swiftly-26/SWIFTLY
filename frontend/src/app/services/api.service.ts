// frontend/src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  Request,
  Comment,
  User,
  Status,
  Priority,
  Role
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
    role: 'Admin' as Role
  };

  // Cache for agents
  private agentsCache: User[] = [];
  private requestsCache: Request[] = [];

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
      'x-user-role': this.currentUser.role,
      'Content-Type': 'application/json'
    });
  }

  // =========================
  // 📌 REQUESTS
  // =========================

  getRequests(): Observable<Request[]> {
    // Return cached data immediately if available
    if (this.requestsCache.length > 0) {
      return of(this.requestsCache);
    }
    
    return this.http.get<Request[]>(
      `${this.baseUrl}/requests`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(requests => this.requestsCache = requests),
      catchError(error => {
        console.error('Error fetching requests:', error);
        return of([]);
      })
    );
  }

  getRequestById(id: string): Observable<Request> {
    return this.http.get<Request>(
      `${this.baseUrl}/requests/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(request => {
        // Update cache
        const index = this.requestsCache.findIndex(r => r.id === id);
        if (index !== -1) {
          this.requestsCache[index] = request;
        }
      }),
      catchError(error => {
        console.error(`Error fetching request ${id}:`, error);
        throw error;
      })
    );
  }

  createRequest(data: {
    title: string;
    description: string;
    dueDate: string;
    status?: Status;
    priority?: Priority;
    assignedAgentId?: string;
    tags?: string[];
  }): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/requests`,
      {
        ...data,
        status: data.status || 'Open'
      },
      { headers: this.getHeaders() }
    ).pipe(
      tap((newRequest: any) => {
        // Update cache
        this.requestsCache = [newRequest, ...this.requestsCache];
      }),
      catchError(error => {
        console.error('Error creating request:', error);
        throw error;
      })
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
    ).pipe(
      tap(() => {
        // Update cache
        const request = this.requestsCache.find(r => r.id === id);
        if (request) {
          request.status = status;
          request.updatedAt = new Date().toISOString();
        }
      }),
      catchError(error => {
        console.error('Error updating status:', error);
        throw error;
      })
    );
  }

  assignRequest(id: string, agentId: string): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/requests/${id}/assign`,
      { agentId },
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        // Update cache
        const request = this.requestsCache.find(r => r.id === id);
        if (request) {
          request.assignedAgentId = agentId || undefined;
          request.updatedAt = new Date().toISOString();
        }
      }),
      catchError(error => {
        console.error('Error assigning agent:', error);
        throw error;
      })
    );
  }

  deleteRequest(id: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/requests/${id}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        // Update cache
        this.requestsCache = this.requestsCache.filter(r => r.id !== id);
      }),
      catchError(error => {
        console.error('Error deleting request:', error);
        throw error;
      })
    );
  }

  // =========================
  // 💬 COMMENTS
  // =========================

  getComments(requestId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(
      `${this.baseUrl}/requests/${requestId}/comments`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error fetching comments:', error);
        return of([]);
      })
    );
  }

  addComment(requestId: string, text: string, type: 'General' | 'Status update' | 'System-generated'): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/requests/${requestId}/comments`,
      {
        author: this.currentUser.name,
        text,
        type
      },
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error adding comment:', error);
        throw error;
      })
    );
  }

  // =========================
  // 👥 AGENTS
  // =========================

  getAgents(): Observable<User[]> {
    // Return cached data immediately if available
    if (this.agentsCache.length > 0) {
      return of(this.agentsCache);
    }
    
    return this.http.get<User[]>(
      `${this.baseUrl}/agents`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(agents => this.agentsCache = agents),
      catchError(error => {
        console.error('Error fetching agents:', error);
        // Return mock agents with proper Role typing
        const mockAgents: User[] = [
          { id: 'agent-1', name: 'John Doe', role: 'Agent' as Role },
          { id: 'agent-2', name: 'Jane Smith', role: 'Agent' as Role }
        ];
        this.agentsCache = mockAgents;
        return of(mockAgents);
      })
    );
  }

  addAgent(name: string): Observable<User> {
    const newAgent: User = {
      id: 'agent-' + Date.now(),
      name: name,
      role: 'Agent' as Role
    };
    
    // Simulate successful creation
    this.agentsCache = [...this.agentsCache, newAgent];
    return of(newAgent);
  }

  deleteAgent(id: string): Observable<any> {
    this.agentsCache = this.agentsCache.filter(a => a.id !== id);
    return of({ success: true });
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.agentsCache = [];
    this.requestsCache = [];
  }
}