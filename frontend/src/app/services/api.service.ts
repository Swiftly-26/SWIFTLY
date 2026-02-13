// frontend/src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, retry } from 'rxjs/operators';
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

  private currentUser: User = {
    id: 'admin-1',
    name: 'System Admin',
    role: 'Admin' as Role
  };

  constructor(private http: HttpClient) {
    console.log('API Service initialized with baseUrl:', this.baseUrl);
  }

  setUser(user: User) {
    console.log('Setting user:', user);
    this.currentUser = user;
  }

  getCurrentUser(): User {
    return this.currentUser;
  }

  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  getRequests(): Observable<Request[]> {
    console.log('Fetching requests from:', `${this.baseUrl}/requests`);
    
    return this.http.get<Request[]>(
      `${this.baseUrl}/requests`
    ).pipe(
      retry(1),
      tap(requests => {
        console.log('Requests fetched successfully:', requests);
        requests.forEach(r => {
          if (r.tags && typeof r.tags === 'string') {
            try {
              r.tags = JSON.parse(r.tags);
            } catch (e) {
              r.tags = (r.tags as unknown as string).split(',').map(t => t.trim());
            }
          }
          // Ensure assignedAgentId is undefined, not null
          if (r.assignedAgentId === null) {
            r.assignedAgentId = undefined;
          }
        });
      }),
      catchError(error => {
        console.error('Error fetching requests:', error);
        return of([]);
      })
    );
  }

  getRequestById(id: string): Observable<Request> {
    console.log('Fetching request by ID:', id);
    
    return this.http.get<Request>(
      `${this.baseUrl}/requests/${id}`
    ).pipe(
      tap(request => {
        console.log('Request fetched successfully:', request);
        if (request.tags && typeof request.tags === 'string') {
          try {
            request.tags = JSON.parse(request.tags);
          } catch (e) {
            request.tags = (request.tags as unknown as string).split(',').map(t => t.trim());
          }
        }
        // Ensure assignedAgentId is undefined, not null
        if (request.assignedAgentId === null) {
          request.assignedAgentId = undefined;
        }
      }),
      catchError(error => {
        console.error(`Error fetching request ${id}:`, error);
        return throwError(() => new Error(error.message));
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
    console.log('Creating request with data:', data);
    
    // Convert undefined to null for the backend, but keep as undefined for our model
    const payload = {
      ...data,
      status: data.status || 'Open',
      assignedAgentId: data.assignedAgentId || undefined, // Use undefined, not null
      tags: data.tags ? JSON.stringify(data.tags) : null
    };
    
    return this.http.post(
      `${this.baseUrl}/requests`,
      payload
    ).pipe(
      tap((newRequest: any) => {
        console.log('Request created successfully:', newRequest);
        if (newRequest.assignedAgentId === null) {
          newRequest.assignedAgentId = undefined;
        }
      }),
      catchError(this.handleError)
    );
  }

  updateStatus(id: string, status: Status): Observable<any> {
    console.log('Updating status for request:', id, 'to:', status);
    
    return this.http.put(
      `${this.baseUrl}/requests/${id}/status`,
      { status, user: this.currentUser.name }
    ).pipe(
      tap(() => {
        console.log('Status updated successfully');
      }),
      catchError(this.handleError)
    );
  }

  assignRequest(id: string, agentId: string): Observable<any> {
    console.log('Assigning request:', id, 'to agent:', agentId);
    
    // Send undefined if empty string, but backend expects null? We'll handle it
    const payload = {
      agentId: agentId || undefined
    };
    
    return this.http.put(
      `${this.baseUrl}/requests/${id}/assign`,
      payload
    ).pipe(
      tap((response: any) => {
        console.log('Request assigned successfully:', response);
      }),
      catchError(this.handleError)
    );
  }

  deleteRequest(id: string): Observable<any> {
    console.log('Deleting request:', id);
    
    return this.http.delete(
      `${this.baseUrl}/requests/${id}`
    ).pipe(
      tap(() => {
        console.log('Request deleted successfully');
      }),
      catchError(this.handleError)
    );
  }

  getComments(requestId: string): Observable<Comment[]> {
    console.log('Fetching comments for request:', requestId);
    
    return this.http.get<Comment[]>(
      `${this.baseUrl}/requests/${requestId}/comments`
    ).pipe(
      tap(comments => {
        console.log('Comments fetched successfully:', comments);
      }),
      catchError(error => {
        console.error('Error fetching comments:', error);
        return of([]);
      })
    );
  }

  addComment(requestId: string, text: string, type: 'General' | 'Status update' | 'System-generated'): Observable<any> {
    console.log('Adding comment to request:', requestId);
    
    return this.http.post(
      `${this.baseUrl}/requests/${requestId}/comments`,
      {
        author: this.currentUser.name,
        text,
        type
      }
    ).pipe(
      tap((newComment) => {
        console.log('Comment added successfully:', newComment);
      }),
      catchError(this.handleError)
    );
  }

  getAgents(): Observable<User[]> {
    console.log('Fetching agents from:', `${this.baseUrl}/agents`);
    
    return this.http.get<User[]>(
      `${this.baseUrl}/agents`
    ).pipe(
      tap(agents => {
        console.log('Agents fetched successfully:', agents);
      }),
      catchError(error => {
        console.error('Error fetching agents:', error);
        const mockAgents: User[] = [
          { id: 'agent-1', name: 'John Doe', role: 'Agent' as Role },
          { id: 'agent-2', name: 'Jane Smith', role: 'Agent' as Role },
          { id: 'agent-3', name: 'Alex Johnson', role: 'Agent' as Role },
          { id: 'agent-4', name: 'Sarah Lee', role: 'Agent' as Role }
        ];
        return of(mockAgents);
      })
    );
  }

  addAgent(name: string): Observable<User> {
    console.log('Adding agent with name:', name);
    
    return this.http.post<User>(
      `${this.baseUrl}/agents`,
      { name, role: 'Agent' }
    ).pipe(
      tap(newAgent => {
        console.log('Agent added successfully:', newAgent);
      }),
      catchError(this.handleError)
    );
  }

  deleteAgent(id: string): Observable<any> {
    console.log('Deleting agent:', id);
    
    return this.http.delete(
      `${this.baseUrl}/agents/${id}`
    ).pipe(
      tap(() => {
        console.log('Agent deleted successfully');
      }),
      catchError(this.handleError)
    );
  }

  checkEscalations(): Observable<any> {
    console.log('Checking escalations');
    
    return this.http.post(
      `${this.baseUrl}/requests/check-escalations`,
      {}
    ).pipe(
      tap(result => {
        console.log('Escalations checked:', result);
      }),
      catchError(error => {
        console.error('Error checking escalations:', error);
        return of({ escalated: [], count: 0 });
      })
    );
  }
}