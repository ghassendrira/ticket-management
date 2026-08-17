import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError, tap } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { UserResponse } from './auth.service';

const API_URL = `${environment.apiUrl}/api/users`;

export interface CreateUserRequest {
  fullName: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'MANAGER';
}

export interface UpdateUserRequest {
  fullName: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'MANAGER';
}

export interface ToggleUserStatusRequest {
  active: boolean;
}

export interface CreateUserResponse {
  user: UserResponse;
  emailSent: boolean;
  temporaryPassword?: string;
}

export interface UserTicketStats {
  totalAssigned: number;
  active: number;
  resolvedOrClosed: number;
}

export interface UserDetailsResponse {
  user: UserResponse | null;
  ticketStats: UserTicketStats;
  recentActivity: {
    id: string;
    eventType: string;
    message: string;
    ticketId?: string;
    ticketTitle?: string;
    actorName: string;
    timestamp: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  getUsers(search?: string, role?: string, active?: boolean) {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (role) params = params.set('role', role);
    if (active !== undefined) params = params.set('active', active.toString());
    return this.http.get<UserResponse[]>(API_URL, { params })
      .pipe(catchError(this.handleError));
  }

  getUserById(id: string) {
    return this.http.get<UserResponse>(`${API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createUser(request: CreateUserRequest) {
    return this.http.post<CreateUserResponse>(API_URL, request)
      .pipe(catchError(this.handleError));
  }

  updateUser(id: string, request: UpdateUserRequest) {
    return this.http.put<UserResponse>(`${API_URL}/${id}`, request)
      .pipe(catchError(this.handleError));
  }

  toggleUserStatus(id: string, active: boolean) {
    const url = `${API_URL}/${id}/status`;
    const body = { active };
    console.log('UserService.toggleUserStatus: sending request', { url, body });
    return this.http.patch<UserResponse>(url, body)
      .pipe(
        tap(response => console.log('UserService.toggleUserStatus: success response', response)),
        catchError(this.handleError)
      );
  }

  getUserDetails(id: string) {
    const url = `${API_URL}/${id}/details`;
    return this.http.get<UserDetailsResponse>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('User service error:', error);
    console.error('Error status:', error.status);
    console.error('Error message:', error.message);
    console.error('Error body:', error.error);
    return throwError(() => error);
  }
}
