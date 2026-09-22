import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { AttachmentResponse } from './attachment.service';
import { AuthService } from './auth.service';

const API_URL = `${environment.ticketApiUrl}/tickets`;
const ANALYTICS_URL = `${environment.ticketApiUrl}/analytics`;

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
  eventType?: string;
  message?: string;
  reason?: string;
  actorId?: string;
  actorName?: string;
}

export type EscalationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REASSIGNED' | 'CANCELLED' | 'RESOLVED';

export interface EscalationResponse {
  id: string;
  ticketId: string;
  ticketTitle?: string;
  ticketStatus?: TicketStatus;
  ticketPriority?: Priority;
  ticketRequestId?: string;
  requestedByAgentId: string;
  requestedByAgentName?: string;
  managerId: string;
  teamId?: string;
  teamName?: string;
  reason: string;
  status: EscalationStatus;
  managerResponseReason?: string;
  reassignedToAgentId?: string;
  reassignedToAgentName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListEscalationsParams {
  status?: EscalationStatus;
  agentId?: string;
  teamId?: string;
  search?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface TicketDetailResponse extends TicketResponse {
  comments: CommentResponse[];
  history: TicketHistoryResponse[];
  attachments: AttachmentResponse[];
}

export interface TicketRequest {
  title: string;
  description?: string;
  category?: Category;
  priority?: Priority;
  customerId?: string;
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

export interface DailyTicketStats {
  date: string;
  created: number;
  resolved: number;
}

export interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

export interface TeamMemberWorkloadResponse {
  userId: string;
  fullName: string;
  role: string;
  activeTicketsCount: number;
  isOnline: boolean | null;
  maxConcurrentTickets: number | null;
}

export interface TeamActivityResponse {
  id: string;
  eventType: string;
  message: string;
  ticketId?: string;
  ticketTitle?: string;
  actorName: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  private authService = inject(AuthService);

  constructor(private http: HttpClient) { }

  getAllTickets() {
    return this.http.get<TicketResponse[]>(API_URL)
      .pipe(map(tickets => tickets.map(ticket => this.normalizeTicket(ticket))))
      .pipe(catchError(this.handleError));
  }

  getTicketById(id: string) {
    return this.http.get<TicketDetailResponse>(`${API_URL}/${id}`)
      .pipe(map(ticket => this.normalizeTicket(ticket) as TicketDetailResponse))
      .pipe(catchError(this.handleError));
  }

  private normalizeTicket<T extends TicketResponse>(ticket: T): T {
    return {
      ...ticket,
      title: ticket.title || 'Ticket sans titre',
      description: ticket.description || '',
      status: ticket.status || 'NEW',
      priority: ticket.priority || 'MEDIUM',
      category: ticket.category || 'INFORMATION',
      createdAt: ticket.createdAt || ticket.updatedAt || new Date().toISOString(),
      updatedAt: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
      assignedAgentName: ticket.assignedAgentName || undefined,
    } as T;
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

  listEscalations(params?: ListEscalationsParams) {
    const httpParams: any = {};
    if (params?.status) httpParams.status = params.status;
    if (params?.agentId) httpParams.agentId = params.agentId;
    if (params?.teamId) httpParams.teamId = params.teamId;
    if (params?.search) httpParams.search = params.search;
    if (params?.createdFrom) httpParams.createdFrom = params.createdFrom;
    if (params?.createdTo) httpParams.createdTo = params.createdTo;
    
    // CORRECTION : Utilisation de API_URL (/api/tickets)
    return this.http.get<EscalationResponse[]>(`${API_URL}/escalations`, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  getEscalations(status?: EscalationStatus) {
    return this.listEscalations({ status });
  }

  acceptEscalation(id: string, setInProgress = true, takeOwnership = false) {
    // CORRECTION : Utilisation de API_URL (/api/tickets)
    return this.http.post<void>(`${API_URL}/escalations/${id}/accept`, { setInProgress, takeOwnership })
      .pipe(catchError(this.handleError));
  }

  rejectEscalation(id: string, reason: string) {
    // CORRECTION : Utilisation de API_URL (/api/tickets)
    return this.http.post<void>(`${API_URL}/escalations/${id}/reject`, { reason })
      .pipe(catchError(this.handleError));
  }

  reassignEscalation(id: string, agentId: string) {
    // CORRECTION : Utilisation de API_URL (/api/tickets)
    return this.http.post<void>(`${API_URL}/escalations/${id}/reassign`, { agentId })
      .pipe(catchError(this.handleError));
  }

  getComments(id: string) {
    return this.http.get<CommentResponse[]>(`${API_URL}/${id}/comments`)
      .pipe(catchError(this.handleError));
  }

  getTicketsCreatedVsResolved(period: 7 | 30 = 7) {
    return this.http.get<DailyTicketStats[]>(`${ANALYTICS_URL}/tickets-created-vs-resolved`, {
      params: { period }
    }).pipe(catchError(this.handleError));
  }

  getTicketsByCategory() {
    return this.http.get<CategoryStats[]>(`${ANALYTICS_URL}/tickets-by-category`)
      .pipe(catchError(this.handleError));
  }

  getTeamMembersWorkload(teamId: string) {
    const user = this.authService.currentUser();
    const headers: any = {};
    if (user) {
      headers['X-User-Id'] = user.id;
      headers['X-User-Role'] = user.role;
    }
    return this.http.get<TeamMemberWorkloadResponse[]>(`${environment.ticketApiUrl}/teams/${teamId}/members-workload`, { headers })
      .pipe(catchError(this.handleError));
  }

  getTeamActivity(teamId: string, hours: number = 24) {
    const user = this.authService.currentUser();
    const headers: any = {};
    if (user) {
      headers['X-User-Id'] = user.id;
      headers['X-User-Role'] = user.role;
    }
    return this.http.get<TeamActivityResponse[]>(
      `${environment.ticketApiUrl}/teams/${teamId}/activity`,
      { params: { hours }, headers }
    ).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('Ticket service error:', error);
    console.error('Error status:', error.status);
    console.error('Error message:', error.message);
    console.error('Error body:', error.error);
    return throwError(() => error);
  }
}