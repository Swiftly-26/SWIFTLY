import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Request, Comment, User, Status, Priority, Role } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {

  private apiUrl = environment.apiUrl;

  private userSubject = new BehaviorSubject<User>({
    id: 'admin-1',
    name: 'System Admin',
    role: 'Admin' as Role
  });

  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  setUser(user: User): void       { this.userSubject.next(user); }
  getCurrentUser(): User          { return this.userSubject.getValue(); }

  getRequests(): Observable<Request[]> {
    return this.http.get<Request[]>(`${this.apiUrl}/requests`).pipe(catchError(e => throwError(() => e)));
  }

  getRequestById(id: string): Observable<Request> {
    return this.http.get<Request>(`${this.apiUrl}/requests/${id}`).pipe(catchError(e => throwError(() => e)));
  }

  createRequest(data: {
    title: string; description: string; dueDate: string;
    status?: Status; priority?: Priority; assignedAgentId?: string; tags?: string[];
  }): Observable<Request> {
    return this.http.post<Request>(`${this.apiUrl}/requests`, data).pipe(catchError(e => throwError(() => e)));
  }

  updateStatus(id: string, status: Status): Observable<Request> {
    return this.http.put<Request>(`${this.apiUrl}/requests/${id}/status`, { status }).pipe(catchError(e => throwError(() => e)));
  }

  assignRequest(id: string, agentId: string): Observable<Request> {
    return this.http.put<Request>(`${this.apiUrl}/requests/${id}/assign`, { agentId }).pipe(catchError(e => throwError(() => e)));
  }

  deleteRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/requests/${id}`).pipe(catchError(e => throwError(() => e)));
  }

  getComments(requestId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/requests/${requestId}/comments`).pipe(catchError(e => throwError(() => e)));
  }

  addComment(requestId: string, text: string, type: 'General' | 'Status update' | 'System-generated', author?: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/requests/${requestId}/comments`, {
      author: author ?? this.getCurrentUser().name, text, type
    }).pipe(catchError(e => throwError(() => e)));
  }

  getAgents(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/agents`).pipe(catchError(e => throwError(() => e)));
  }

  addAgent(name: string): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/agents`, { name }).pipe(catchError(e => throwError(() => e)));
  }

  deleteAgent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/agents/${id}`).pipe(catchError(e => throwError(() => e)));
  }
}