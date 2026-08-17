import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { AttachmentResponse } from './attachment.service';

const API_URL = `${environment.apiUrl}/api/tickets`;

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Category = 'ACCOUNT_ACCESS' | 'BILLING' | 'TECHNICAL' | 'ORDER' | 'DELIVERY' | 'SECURITY' | 'INFORMATION';
export type TicketStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'CANCELLED';

export interface TicketResponse {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: Category;
  customerId?: string;
  requestId?: string;
  createdAt: string;
  updatedAt: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  commentsCount: number;
  teamId?: string;
}

export interface TicketHistoryResponse {
  id: string;
  oldStatus: TicketStatus;
  newStatus: TicketStatus;
  changedByName: string;
  changedAt: string;
}

export interface TicketDetailResponse extends TicketResponse {
  comments: CommentResponse[];
  history: TicketHistoryResponse[];
  attachments: AttachmentResponse[];
  teamId?: string;
}

export interface TicketRequest {
  title: string;
  description?: string;
  category?: Category;
  priority?: Priority;
  customerId?: string;
  teamId?: string;
}

export interface ChangeStatusRequest {
  newStatus: TicketStatus;
}

export interface AssignTicketRequest {
  agentId: string;
}

export interface CommentRequest {
  content: string;
  isInternal?: boolean;
}

export interface CommentResponse {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  isInternal: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  constructor(private http: HttpClient) { }

  getAllTickets() {
    return this.http.get<TicketResponse[]>(API_URL)
      .pipe(catchError(this.handleError));
  }

  getTicketById(id: string) {
    return this.http.get<TicketDetailResponse>(`${API_URL}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createTicket(request: TicketRequest) {
    return this.http.post<TicketResponse>(API_URL, request)
      .pipe(catchError(this.handleError));
  }

  changeStatus(id: string, newStatus: TicketStatus) {
    const body: ChangeStatusRequest = { newStatus };
    return this.http.patch<TicketResponse>(`${API_URL}/${id}/status`, body)
      .pipe(catchError(this.handleError));
  }

  assignTicket(id: string, agentId: string) {
    const body: AssignTicketRequest = { agentId };
    return this.http.patch<TicketResponse>(`${API_URL}/${id}/assign`, body)
      .pipe(catchError(this.handleError));
  }

  addComment(id: string, request: CommentRequest) {
    return this.http.post<CommentResponse>(`${API_URL}/${id}/comments`, request)
      .pipe(catchError(this.handleError));
  }

  escalateTicket(id: string, reason: string) {
    return this.http.post<void>(`${API_URL}/${id}/escalate`, { reason })
      .pipe(catchError(this.handleError));
  }

  getComments(id: string) {
    return this.http.get<CommentResponse[]>(`${API_URL}/${id}/comments`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Ticket service error:', error);
    console.error('Error status:', error.status);
    console.error('Error message:', error.message);
    console.error('Error body:', error.error);
    return throwError(() => error);
  }
}